import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import { OrderStatus, ProductStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { ExchangeService } from "../exchange/exchange.service";
import { SaleService } from "../sale/sale.service";
import { TenantSettingsService } from "src/shared/services/tenant-settings.service";
import { ShippingAgencyService } from "../shipping/shipping-agency.service";
import {
  COORDINATION_METHODS,
  type CoordinationMethod,
  type FulfillmentType,
  type TenantSettings,
} from "src/shared/constants/tenant-settings";
import { SequenceService, SequenceDb } from "src/shared/services/sequence.service";
import { buildDocumentTotals, round2 } from "src/shared/utils/money";
import {
  CreateOrderDto,
  ListOrdersQueryDto,
  ShipOrderDto,
  UpdateOrderStatusDto,
} from "./dto/order.dto";

import { EventEmitter2 } from "@nestjs/event-emitter";
import { emitEvent } from "src/shared/event/event-envelope";
import type { EventName } from "src/shared/event/event-taxonomy";
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

export interface OrderScope {
  organizationId: string | null;
  createdById?: string | null;
}

/** One payable line of an order; `productId: null` is the delivery fee. */
interface ResolvedOrderItem {
  productId: string | null;
  productName: string;
  quantity: number;
  priceUSD: number;
  totalUSD: number;
}

/** Allowed state machine for merchant-side order handling. */
const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  CONFIRMED: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  PREPARING: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  DELIVERED: [],
  CANCELLED: [],
};

/**
 * Web orders / cart (S9).
 *
 * A customer places an order from the public storefront without an account and
 * WITHOUT stock being reserved: the merchant confirms it when they can fulfil
 * it. Only published, ACTIVE products can be ordered, and the price is always
 * the storefront price — a client-sent price is ignored.
 */
@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly exchangeService: ExchangeService,
    private readonly sequenceService: SequenceService,
    private readonly saleService: SaleService,
    private readonly tenantSettings: TenantSettingsService,
    private readonly shippingAgency: ShippingAgencyService,
    private readonly eventEmitter?: EventEmitter2,
  ) {}

  /** Label of the fee line when the customer chose delivery (S6). */
  private static readonly DELIVERY_LABEL = "Envío a domicilio";

  private scopeWhere(organizationId: string | null): Prisma.OrderWhereInput {
    return { organizationId };
  }

  // ------------------------------------------------------------------
  // Public storefront
  // ------------------------------------------------------------------

  async createPublicOrder(data: CreateOrderDto) {
    const organization = await this.prisma.organization.findUnique({
      where: { slug: data.organizationSlug },
      select: { id: true, name: true, slug: true, status: true },
    });

    if (!organization || organization.status !== "ACTIVE") {
      throw new NotFoundException("Tienda no encontrada.");
    }

    // S5: the visitor leaves a name and a real contact; that is also what the
    // order is linked to in the shop's client list.
    const customerName = data.customerName?.trim();
    const customerEmail = data.customerEmail?.trim();
    if (!customerName) {
      throw new BadRequestException("El nombre del cliente es obligatorio.");
    }
    if (!customerEmail) {
      throw new BadRequestException("El correo del cliente es obligatorio.");
    }

    const settings = await this.tenantSettings.get(organization.id);
    const fulfillment = await this.resolveFulfillment(data, settings);

    const rates = await this.exchangeService.resolveRates(organization.id);

    const productIds = [...new Set(data.items.map((item) => item.productId))];
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        organizationId: organization.id,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        salePriceUSD: true,
        isPublic: true,
        status: true,
      },
    });

    const byId = new Map(products.map((product) => [product.id, product]));

    const resolved: ResolvedOrderItem[] = data.items.map((item) => {
      const product = byId.get(item.productId);
      if (!product) {
        throw new NotFoundException("Uno de los productos ya no está disponible.");
      }
      if (!product.isPublic || product.status !== ProductStatus.ACTIVE) {
        throw new BadRequestException(
          `"${product.name}" no está disponible para pedir en línea.`,
        );
      }

      const quantity = Number(item.quantity);
      const priceUSD = Number(product.salePriceUSD);
      return {
        productId: product.id,
        productName: product.name,
        quantity,
        priceUSD,
        totalUSD: round2(quantity * priceUSD),
      };
    });

    // The delivery fee (S6) is charged as its own line, so it survives the
    // conversion into a sale instead of hiding in a header field.
    if (
      fulfillment.deliveryFeeUSD !== null &&
      fulfillment.deliveryFeeUSD > 0
    ) {
      resolved.push({
        productId: null,
        productName: OrderService.DELIVERY_LABEL,
        quantity: 1,
        priceUSD: fulfillment.deliveryFeeUSD,
        totalUSD: round2(fulfillment.deliveryFeeUSD),
      });
    }

    const subtotalUSD = round2(
      resolved.reduce((sum, item) => sum + item.totalUSD, 0),
    );
    const totals = buildDocumentTotals({ subtotalUSD }, rates);

    return this.prisma.$transaction(async (tx) => {
      const orderNumber = await this.sequenceService.nextFormatted(
        "ORDER",
        organization.id,
        "PED",
        5,
        tx as SequenceDb,
      );

      const order = await tx.order.create({
        data: {
          orderNumber,
          organizationId: organization.id,
          clientId: await this.resolveClientId(tx, organization.id, data),
          customerName: customerName,
          customerPhone: data.customerPhone?.trim() || null,
          customerEmail,
          customerAddress: data.customerAddress?.trim() || null,
          fulfillmentType: fulfillment.fulfillmentType,
          agencyId: fulfillment.agencyId,
          coordination: fulfillment.coordination,
          deliveryFeeUSD: fulfillment.deliveryFeeUSD,
          rateBcv: rates.rateBcv,
          rateUsdt: rates.rateUsdt,
          totalUSD: totals.totalUSD,
          totalVES: totals.totalVES,
          totalUSDT: totals.totalUSDT,
          status: OrderStatus.PENDING,
          notes: data.notes?.trim() || null,
        },
      });

      for (const item of resolved) {
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            priceUSD: item.priceUSD,
            totalUSD: item.totalUSD,
          },
        });
      }

      return tx.order.findUnique({
        where: { id: order.id },
        include: { items: true },
      });
    });
  }

  // ------------------------------------------------------------------
  // Merchant side
  // ------------------------------------------------------------------

  async list(scope: OrderScope, query: ListOrdersQueryDto) {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(Math.max(query.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);

    const filters: Prisma.OrderWhereInput[] = [this.scopeWhere(scope.organizationId)];

    if (query.status) filters.push({ status: query.status });
    if (query.fulfillmentType) {
      filters.push({ fulfillmentType: query.fulfillmentType });
    }
    if (query.agencyId) filters.push({ agencyId: query.agencyId });
    if (query.shipped !== undefined) {
      filters.push(
        query.shipped ? { shippedAt: { not: null } } : { shippedAt: null },
      );
    }
    if (query.from || query.to) {
      filters.push({
        createdAt: {
          ...(query.from ? { gte: new Date(query.from) } : {}),
          ...(query.to ? { lte: new Date(query.to) } : {}),
        },
      });
    }

    if (query.q?.trim()) {
      const q = query.q.trim();
      filters.push({
        OR: [
          { orderNumber: { contains: q, mode: "insensitive" } },
          { customerName: { contains: q, mode: "insensitive" } },
          { customerPhone: { contains: q, mode: "insensitive" } },
          { notes: { contains: q, mode: "insensitive" } },
        ],
      });
    }

    const where: Prisma.OrderWhereInput = { AND: filters };
    const [list, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          items: true,
          client: { select: { id: true, name: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      list,
      total,
      totalRecords: total,
      totalPages,
      currentPage: page,
      limit,
      hasPrev: page > 1,
      hasNext: page < totalPages,
    };
  }

  async getOne(scope: OrderScope, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, ...this.scopeWhere(scope.organizationId) },
      include: {
        items: true,
        client: { select: { id: true, name: true } },
        agency: { select: { id: true, key: true, name: true } },
        sale: { select: { id: true, saleNumber: true, paymentStatus: true } },
      },
    });

    if (!order) throw new NotFoundException("Pedido no encontrado.");
    return order;
  }

  async updateStatus(scope: OrderScope, id: string, data: UpdateOrderStatusDto) {
    const order = await this.getOne(scope, id);

    if (order.status === data.status) {
      throw new ConflictException("El pedido ya tiene ese estado.");
    }

    const allowed = ORDER_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(data.status)) {
      throw new ConflictException(
        `No se puede pasar de ${order.status} a ${data.status}.`,
      );
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: { status: data.status },
      include: { items: true },
    });

    this.emitBusinessEvent(
      "erp.order.status_changed",
      scope.createdById,
      scope.organizationId,
      {
        orderId: order.id,
        orderNumber: order.orderNumber,
        previousStatus: order.status,
        status: data.status,
      },
    );

    return updated;
  }

  /**
   * Fulfillment rules (S4/S6): everything the customer picks is checked
   * against what the tenant enabled in its settings — the API is the gate, the
   * UI is only a convenience.
   */
  private async resolveFulfillment(
    data: CreateOrderDto,
    settings: TenantSettings,
): Promise<{
    fulfillmentType: FulfillmentType;
    agencyId: string | null;
    coordination: CoordinationMethod;
    deliveryFeeUSD: number | null;
  }> {
    const type: FulfillmentType = data.fulfillmentType ?? "PICKUP";
    const coordination: CoordinationMethod =
      data.coordination ?? settings.fulfillment.coordination;

    if (!settings.fulfillment.enabledTypes.includes(type)) {
      throw new ConflictException(
        `El tipo de entrega "${type}" no está habilitado en esta tienda.`,
      );
    }

    if (type === "DELIVERY") {
      if (!settings.delivery.enabled) {
        throw new ConflictException(
          "La entrega a domicilio no está habilitada en esta tienda.",
        );
      }
      if (!data.customerAddress?.trim()) {
        throw new BadRequestException(
          "La entrega a domicilio necesita una dirección.",
        );
      }
      return {
        fulfillmentType: type,
        agencyId: null,
        coordination,
        deliveryFeeUSD: settings.delivery.feeUSD,
      };
    }

    if (type === "SHIPPING") {
      if (!data.customerAddress?.trim()) {
        throw new BadRequestException("El envío necesita una dirección.");
      }
      if (!data.agencyId) {
        throw new BadRequestException("Selecciona una agencia de envío.");
      }
      // Asserts existence, active state and the tenant's enabled check (S4).
      await this.shippingAgency.assertUsable(
        data.agencyId,
        settings.shipping.enabledAgencies,
      );
      return {
        fulfillmentType: type,
        agencyId: data.agencyId,
        coordination,
        deliveryFeeUSD: null,
      };
    }

    return {
      fulfillmentType: "PICKUP",
      agencyId: null,
      coordination,
      deliveryFeeUSD: null,
    };
  }

  /**
   * S5: link the order to a client by email first and phone as fallback;
   * when nobody matches, the client is created so the shop's list grows.
   * Runs inside the order transaction so a failed order leaves no orphan.
   */
  private async resolveClientId(
    tx: Prisma.TransactionClient,
    organizationId: string,
    data: CreateOrderDto,
  ): Promise<string | null> {
    if (data.clientId) {
      const owned = await tx.client.findFirst({
        where: {
          id: data.clientId,
          organizationId,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!owned) {
        throw new NotFoundException("El cliente indicado no existe en esta tienda.");
      }
      return owned.id;
    }

    const email = data.customerEmail.trim();

    const byEmail = await tx.client.findFirst({
      where: {
        organizationId,
        deletedAt: null,
        email: { equals: email, mode: "insensitive" },
      },
      select: { id: true },
    });
    if (byEmail) return byEmail.id;

    if (data.customerPhone?.trim()) {
      const byPhone = await tx.client.findFirst({
        where: {
          organizationId,
          deletedAt: null,
          phone: data.customerPhone.trim(),
        },
        select: { id: true },
      });
      if (byPhone) return byPhone.id;
    }

    const created = await tx.client.create({
      data: {
        name: data.customerName.trim(),
        email,
        phone: data.customerPhone?.trim() || null,
        address: data.customerAddress?.trim() || null,
        organizationId,
        notes: "Creado desde pedido web",
      },
      select: { id: true },
    });

    return created.id;
  }

  /**
   * Dispatch (S7): stamps when the package left and keeps the agency's
   * tracking code. Only orders that actually need shipping qualify, and only
   * after the merchant has confirmed them.
   */
  async shipOrder(scope: OrderScope, id: string, data: ShipOrderDto) {
    const order = await this.getOne(scope, id);

    if (order.fulfillmentType === ("PICKUP" as any)) {
      throw new ConflictException(
        "Un pedido de retiro en tienda no se despacha.",
      );
    }
    if (order.status === "PENDING" || order.status === "CANCELLED") {
      throw new ConflictException("Confirma el pedido antes de despacharlo.");
    }
    if (order.shippedAt) {
      throw new ConflictException("El pedido ya fue despachado.");
    }

    const trackingNumber = data.trackingNumber?.trim() || null;
    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        shippedAt: data.shippedAt ? new Date(data.shippedAt) : new Date(),
        ...(trackingNumber !== null && { trackingNumber }),
      },
      include: {
        items: true,
        agency: { select: { id: true, key: true, name: true } },
        client: { select: { id: true, name: true } },
      },
    });

    this.emitBusinessEvent(
      "erp.order.shipped",
      scope.createdById,
      scope.organizationId,
      {
        orderId: order.id,
        orderNumber: order.orderNumber,
        fulfillmentType: order.fulfillmentType,
        agencyId: order.agencyId,
        trackingNumber,
      },
    );

    return updated;
  }

  /**
   * Turns a confirmed order into a sale. The sale freezes the rates of the
   * moment (not the ones captured when the customer ordered) and reserves no
   * stock beyond what `SaleService` normally does.
   */
  async convertToSale(scope: OrderScope, id: string) {
    const order = await this.getOne(scope, id);

    if (order.saleId) {
      throw new ConflictException("El pedido ya fue convertido en venta.");
    }
    if (order.status === OrderStatus.CANCELLED) {
      throw new ConflictException("No se puede convertir un pedido cancelado.");
    }

    const items = await this.prisma.orderItem.findMany({
      where: { orderId: order.id },
    });

    const sale = await this.saleService.create(scope, {
      clientId: order.clientId ?? undefined,
      orderId: order.id,
      notes: order.notes ?? undefined,
      items: items.map((item) => ({
        productId: item.productId ?? undefined,
        productName: item.productName,
        quantity: Number(item.quantity),
        unitPriceUSD: Number(item.priceUSD),
      })),
    });

    this.emitBusinessEvent(
      "erp.order.converted",
      scope.createdById,
      scope.organizationId,
      {
        orderId: order.id,
        orderNumber: order.orderNumber,
        saleId: (sale as any)?.id ?? null,
        saleNumber: (sale as any)?.saleNumber ?? null,
        count: items.length,
      },
    );

    return sale;
  }

  /** Fire-and-forget business telemetry (S11). */
  private emitBusinessEvent(
    eventName: EventName,
    actorId: string | null | undefined,
    organizationId: string | null,
    payload: Record<string, unknown>,
  ): void {
    if (!this.eventEmitter || !actorId) return;

    emitEvent(this.eventEmitter, {
      eventName,
      actorId,
      orgId: organizationId,
      source: "api",
      payload,
    });
  }

}
