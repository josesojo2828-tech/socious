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
import { SequenceService, SequenceDb } from "src/shared/services/sequence.service";
import { buildDocumentTotals, round2 } from "src/shared/utils/money";
import {
  CreateOrderDto,
  ListOrdersQueryDto,
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
    private readonly eventEmitter?: EventEmitter2,
  ) {}

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

    const resolved = data.items.map((item) => {
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
          clientId: data.clientId ?? null,
          customerName: data.customerName.trim(),
          customerPhone: data.customerPhone?.trim() || null,
          customerEmail: data.customerEmail?.trim() || null,
          customerAddress: data.customerAddress?.trim() || null,
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
