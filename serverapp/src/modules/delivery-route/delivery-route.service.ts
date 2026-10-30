import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import { DeliveryRouteStatus, RouteItemStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { emitEvent } from "src/shared/event/event-envelope";
import { TenantSettingsService } from "src/shared/services/tenant-settings.service";
import {
  SequenceDb,
  SequenceService,
} from "src/shared/services/sequence.service";
import {
  CreateDeliveryRouteDto,
  ListDeliveryRoutesQueryDto,
  MarkRouteItemDto,
} from "./dto/delivery-route.dto";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

export interface RouteScope {
  organizationId: string | null;
  createdById?: string | null;
}

/** Statuses that still hold the orders of the day. */
const ACTIVE_ROUTE_STATUSES: DeliveryRouteStatus[] = [
  DeliveryRouteStatus.OPEN,
  DeliveryRouteStatus.IN_PROGRESS,
];

const ROUTE_TRANSITIONS: Record<DeliveryRouteStatus, DeliveryRouteStatus[]> = {
  [DeliveryRouteStatus.OPEN]: [
    DeliveryRouteStatus.IN_PROGRESS,
    DeliveryRouteStatus.COMPLETED,
    DeliveryRouteStatus.CANCELLED,
  ],
  [DeliveryRouteStatus.IN_PROGRESS]: [
    DeliveryRouteStatus.COMPLETED,
    DeliveryRouteStatus.CANCELLED,
  ],
  [DeliveryRouteStatus.COMPLETED]: [],
  [DeliveryRouteStatus.CANCELLED]: [],
};

/**
 * Delivery routes (S8): the merchant groups the orders of a single day
 * ("el sabado va a realizar entregas") into one route and marks each stop.
 *
 * The whole feature sits behind `settings.routes.enabled` — a tenant that
 * never ships by route gets a 409 instead of a hidden UI, so an enabled check
 * is the single switch for both the API and the sidebar entry.
 */
@Injectable()
export class DeliveryRouteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sequenceService: SequenceService,
    private readonly tenantSettings: TenantSettingsService,
    private readonly eventEmitter?: EventEmitter2,
  ) {}

  /**
   * Routes are an organization-only concept (the column is required), so the
   * personal context cannot own one.
   */
  private requireOrg(scope: RouteScope): string {
    if (!scope.organizationId) {
      throw new ForbiddenException(
        "Crea una organización para trabajar con rutas.",
      );
    }
    return scope.organizationId;
  }

  private scopeWhere(organizationId: string): Prisma.DeliveryRouteWhereInput {
    return { organizationId, deletedAt: null };
  }

  private async assertRoutesEnabled(
    organizationId: string | null,
  ): Promise<void> {
    const settings = await this.tenantSettings.get(organizationId);
    if (settings.routes.enabled) return;

    throw new ConflictException(
      "Las rutas de entrega no están habilitadas en la configuración.",
    );
  }

  /** The calendar day the merchant meant, independent of the timezone offset. */
  private toRouteDate(value: string): Date {
    const datePart = value.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
      throw new BadRequestException(
        "La fecha debe ser un día válido (YYYY-MM-DD).",
      );
    }
    return new Date(`${datePart}T00:00:00.000Z`);
  }

  async create(scope: RouteScope, data: CreateDeliveryRouteDto) {
    await this.assertRoutesEnabled(scope.organizationId);
    const organizationId = this.requireOrg(scope);

    const date = this.toRouteDate(data.date);

    return this.prisma.$transaction(async (tx) => {
      const sameDay = await tx.deliveryRoute.findFirst({
        where: {
          organizationId,
          date,
          status: { in: ACTIVE_ROUTE_STATUSES },
          deletedAt: null,
        },
        select: { id: true, routeNumber: true },
      });
      if (sameDay) {
        throw new ConflictException(
          `Ya hay una ruta abierta para ese día (${sameDay.routeNumber}). Ciérrala o cancélala antes de abrir otra.`,
        );
      }

      const routeNumber = await this.sequenceService.nextFormatted(
        "ROUTE",
        scope.organizationId,
        "RUT",
        5,
        tx as SequenceDb,
      );

      const route = await tx.deliveryRoute.create({
        data: {
          routeNumber,
          organizationId,
          date,
          name: data.name?.trim() || null,
          vehicle: data.vehicle?.trim() || null,
          notes: data.notes?.trim() || null,
          createdById: scope.createdById ?? null,
        },
      });

      if (data.orderIds?.length) {
        await this.assignOrdersInTx(scope, tx, route, data.orderIds);
      }

      this.emitRoute(scope, "erp.route.created", {
        routeId: route.id,
        routeNumber,
        count: data.orderIds?.length ?? 0,
      });

      return this.loadRoute(scope, route.id, tx);
    });
  }

  async list(scope: RouteScope, query: ListDeliveryRoutesQueryDto) {
    await this.assertRoutesEnabled(scope.organizationId);
    const organizationId = this.requireOrg(scope);

    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(Math.max(query.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);

    const filters: Prisma.DeliveryRouteWhereInput[] = [
      this.scopeWhere(organizationId),
    ];

    if (query.status) filters.push({ status: query.status });
    if (query.from || query.to) {
      filters.push({
        date: {
          ...(query.from ? { gte: this.toRouteDate(query.from) } : {}),
          ...(query.to ? { lte: this.toRouteDate(query.to) } : {}),
        },
      });
    }

    const where: Prisma.DeliveryRouteWhereInput = { AND: filters };
    const [list, total] = await Promise.all([
      this.prisma.deliveryRoute.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        include: {
          createdBy: { select: { id: true, fullName: true, email: true } },
        },
      }),
      this.prisma.deliveryRoute.count({ where }),
    ]);

    // One extra query keeps the per-route progress counts consistent.
    const items = await this.prisma.deliveryRouteItem.findMany({
      where: { routeId: { in: list.map((route) => route.id) } },
      select: { routeId: true, status: true },
    });
    const progress = new Map<string, { total: number; delivered: number; pending: number; failed: number }>();
    for (const item of items) {
      const bucket = progress.get(item.routeId) ?? {
        total: 0,
        delivered: 0,
        pending: 0,
        failed: 0,
      };
      bucket.total += 1;
      if (item.status === RouteItemStatus.DELIVERED) bucket.delivered += 1;
      else if (item.status === RouteItemStatus.FAILED) bucket.failed += 1;
      else bucket.pending += 1;
      progress.set(item.routeId, bucket);
    }

    const totalPages = Math.ceil(total / limit);

    return {
      list: list.map((route) => ({
        ...route,
        progress: progress.get(route.id) ?? {
          total: 0,
          delivered: 0,
          pending: 0,
          failed: 0,
        },
      })),
      total,
      totalPages,
      currentPage: page,
      limit,
      hasPrev: page > 1,
      hasNext: page < totalPages,
    };
  }

  async getOne(scope: RouteScope, id: string) {
    await this.assertRoutesEnabled(scope.organizationId);
    this.requireOrg(scope);
    return this.loadRoute(scope, id);
  }

  /** Adds orders to an existing route (validated the same way as on create). */
  async assignOrders(scope: RouteScope, routeId: string, orderIds: string[]) {
    await this.assertRoutesEnabled(scope.organizationId);

    return this.prisma.$transaction(async (tx) => {
      const route = await this.findRoute(scope, routeId, tx);
      await this.assignOrdersInTx(scope, tx, route, orderIds);
      return this.loadRoute(scope, routeId, tx);
    });
  }

  async removeOrder(scope: RouteScope, routeId: string, orderId: string) {
    await this.assertRoutesEnabled(scope.organizationId);
    await this.findRoute(scope, routeId);

    const item = await this.prisma.deliveryRouteItem.findFirst({
      where: { routeId, orderId },
      select: { id: true },
    });
    if (!item) {
      throw new NotFoundException("Ese pedido no está en esta ruta.");
    }

    await this.prisma.deliveryRouteItem.delete({ where: { id: item.id } });
    return { routeId, orderId, removed: true };
  }

  /** Marks one stop as delivered or failed (failed requires a reason). */
  async markItem(
    scope: RouteScope,
    routeId: string,
    itemId: string,
    data: MarkRouteItemDto,
  ) {
    await this.assertRoutesEnabled(scope.organizationId);
    const route = await this.findRoute(scope, routeId);

    if (route.status !== DeliveryRouteStatus.OPEN &&
      route.status !== DeliveryRouteStatus.IN_PROGRESS) {
      throw new ConflictException(
        "Solo se actualizan pedidos de una ruta abierta.",
      );
    }

    const item = await this.prisma.deliveryRouteItem.findFirst({
      where: { id: itemId, routeId },
      select: { id: true },
    });
    if (!item) throw new NotFoundException("Pedido no encontrado en esta ruta.");

    const reason = data.failureReason?.trim() ?? null;
    if (data.status === "FAILED" && !reason) {
      throw new BadRequestException("Indica el motivo del fallo de entrega.");
    }

    const updated = await this.prisma.deliveryRouteItem.update({
      where: { id: itemId },
      data: {
        status: data.status as RouteItemStatus,
        deliveredAt: data.status === "DELIVERED" ? new Date() : null,
        failureReason: data.status === "FAILED" ? reason : null,
      },
      include: {
        order: {
          select: { id: true, orderNumber: true, customerName: true },
        },
      },
    });

    this.emitRoute(scope, "erp.route.item_updated", {
      routeId,
      routeNumber: route.routeNumber,
      status: data.status,
      count: 1,
    });

    return updated;
  }

  async updateStatus(
    scope: RouteScope,
    id: string,
    status: DeliveryRouteStatus,
  ) {
    await this.assertRoutesEnabled(scope.organizationId);
    const route = await this.findRoute(scope, id);

    const allowed = ROUTE_TRANSITIONS[route.status] ?? [];
    if (!allowed.includes(status)) {
      throw new ConflictException(
        `No se puede pasar de ${route.status} a ${status}.`,
      );
    }

    const updated = await this.prisma.deliveryRoute.update({
      where: { id },
      data: { status },
      include: { _count: { select: { items: true } } },
    });

    this.emitRoute(scope, "erp.route.status_changed", {
      routeId: id,
      routeNumber: route.routeNumber,
      status,
      previousStatus: route.status,
      count: 1,
    });

    return updated;
  }

  // ------------------------------------------------------------------
  // Internals
  // ------------------------------------------------------------------

  private async findRoute(
    scope: RouteScope,
    routeId: string,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const organizationId = this.requireOrg(scope);
    const route = await tx.deliveryRoute.findFirst({
      where: { id: routeId, ...this.scopeWhere(organizationId) },
    });
    if (!route) throw new NotFoundException("Ruta no encontrada.");
    return route;
  }

  private async loadRoute(
    scope: RouteScope,
    routeId: string,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const organizationId = this.requireOrg(scope);
    const route = await tx.deliveryRoute.findFirst({
      where: { id: routeId, ...this.scopeWhere(organizationId) },
      include: {
        createdBy: { select: { id: true, fullName: true, email: true } },
        items: {
          orderBy: { sortOrder: "asc" },
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                status: true,
                customerName: true,
                customerPhone: true,
                customerAddress: true,
                fulfillmentType: true,
                shippedAt: true,
                trackingNumber: true,
                agency: { select: { id: true, key: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!route) throw new NotFoundException("Ruta no encontrada.");
    return route;
  }

  /**
   * Adds orders to a route: they must belong to the tenant, be confirmed and
   * not already held by another open route.
   */
  private async assignOrdersInTx(
    scope: RouteScope,
    tx: Prisma.TransactionClient,
    route: { id: string; routeNumber: string },
    orderIds: string[],
  ): Promise<void> {
    const uniqueIds = [...new Set(orderIds)];
    const organizationId = scope.organizationId ?? "";

    const orders = await tx.order.findMany({
      where: { id: { in: uniqueIds }, organizationId },
      select: { id: true, status: true },
    });
    const found = new Map(orders.map((order) => [order.id, order]));

    for (const orderId of uniqueIds) {
      const order = found.get(orderId);
      if (!order) {
        throw new NotFoundException(`El pedido ${orderId} no existe en este negocio.`);
      }
      if (order.status === "PENDING") {
        throw new ConflictException(
          `El pedido ${orderId} todavía no está confirmado.`,
        );
      }
      if (order.status === "CANCELLED") {
        throw new ConflictException(
          `El pedido ${orderId} está cancelado.`,
        );
      }
    }

    const held = await tx.deliveryRouteItem.findMany({
      where: {
        orderId: { in: uniqueIds },
        route: { status: { in: ACTIVE_ROUTE_STATUSES }, id: { not: route.id } },
      },
      select: { orderId: true },
    });
    if (held.length > 0) {
      throw new ConflictException(
        `Los pedidos ${held.map((row) => row.orderId).join(", ")} ya están en otra ruta abierta.`,
      );
    }

    const existing = await tx.deliveryRouteItem.findMany({
      where: { routeId: route.id, orderId: { in: uniqueIds } },
      select: { orderId: true },
    });
    const alreadyIn = new Set(existing.map((row) => row.orderId));

    const last = await tx.deliveryRouteItem.findFirst({
      where: { routeId: route.id },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    let sortOrder = last?.sortOrder ?? 0;

    for (const orderId of uniqueIds) {
      if (alreadyIn.has(orderId)) continue;
      sortOrder += 1;
      await tx.deliveryRouteItem.create({
        data: { routeId: route.id, orderId, sortOrder },
      });
    }
  }

  private emitRoute(
    scope: RouteScope,
    eventName: "erp.route.created" | "erp.route.status_changed" | "erp.route.item_updated",
    payload: Record<string, unknown>,
  ): void {
    if (!this.eventEmitter || !scope.createdById) return;

    emitEvent(this.eventEmitter, {
      eventName,
      actorId: scope.createdById,
      orgId: scope.organizationId,
      source: "api",
      payload,
    });
  }
}
