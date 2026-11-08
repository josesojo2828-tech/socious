import { ForbiddenException, Injectable } from "@nestjs/common";
import { FulfillmentType, OrderChannel, OrderStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "nestjs-prisma";
import { round2 } from "src/shared/utils/money";
import { resolveReportRange } from "src/shared/utils/report-range";
import type { OrderScope } from "./order.service";
import type { StorefrontMetricsQueryDto } from "./dto/storefront-metrics.dto";

/** The API runs in UTC; the business day is anchored to the tenant zone. */
const BUSINESS_TIME_ZONE = process.env.BILLING_TIMEZONE || "America/Caracas";

export interface StorefrontMetricsBucket {
  orders: number;
  revenueUSD: number;
}

export interface StorefrontMetrics {
  from: string | null;
  to: string | null;
  totals: StorefrontMetricsBucket & { avgTicketUSD: number };
  byStatus: Record<OrderStatus, StorefrontMetricsBucket>;
  byFulfillment: Record<FulfillmentType, number>;
  topProducts: { productName: string; quantity: number; revenueUSD: number }[];
  daily: ({ date: string } & StorefrontMetricsBucket)[];
  publishedProducts: number;
}

/**
 * Storefront metrics (Phase 1): everything is derived from orders that actually
 * came from the public store (`channel = STOREFRONT`). No visitor tracking — a
 * conversion rate would need instrumentation that does not exist yet.
 */
@Injectable()
export class StorefrontMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(
    scope: OrderScope,
    query: StorefrontMetricsQueryDto,
  ): Promise<StorefrontMetrics> {
    if (!scope.organizationId) {
      throw new ForbiddenException(
        "Elegí un negocio para ver las métricas de su tienda.",
      );
    }

    const createdAt = resolveReportRange(query);
    const where: Prisma.OrderWhereInput = {
      organizationId: scope.organizationId,
      channel: OrderChannel.STOREFRONT,
    };
    if (createdAt.gte || createdAt.lte) where.createdAt = createdAt;

    const [
      totals,
      statusGroups,
      fulfillmentGroups,
      topItems,
      dailyRows,
      publishedProducts,
    ] = await Promise.all([
      this.prisma.order.aggregate({
        where,
        _count: { _all: true },
        _sum: { totalUSD: true },
      }),
      this.prisma.order.groupBy({
        by: ["status"],
        where,
        orderBy: { status: "asc" },
        _count: { _all: true },
        _sum: { totalUSD: true },
      }),
      this.prisma.order.groupBy({
        by: ["fulfillmentType"],
        where,
        orderBy: { fulfillmentType: "asc" },
        _count: { _all: true },
      }),
      this.prisma.orderItem.groupBy({
        by: ["productName"],
        where: { order: where },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
        _sum: { quantity: true, totalUSD: true },
      }),
      this.prisma.order.findMany({
        where,
        select: { createdAt: true, totalUSD: true },
      }),
      this.prisma.product.count({
        where: {
          organizationId: scope.organizationId,
          isPublic: true,
          deletedAt: null,
        },
      }),
    ]);

    const revenueUSD = round2(Number(totals._sum.totalUSD ?? 0));
    const orders = totals._count._all ?? 0;

    const byStatus = Object.values(OrderStatus).reduce(
      (accumulator, status) => {
        accumulator[status] = { orders: 0, revenueUSD: 0 };
        return accumulator;
      },
      {} as Record<OrderStatus, StorefrontMetricsBucket>,
    );
    for (const row of statusGroups) {
      byStatus[row.status] = {
        orders: row._count._all ?? 0,
        revenueUSD: round2(Number(row._sum.totalUSD ?? 0)),
      };
    }

    const byFulfillment = Object.values(FulfillmentType).reduce(
      (accumulator, type) => {
        accumulator[type] = 0;
        return accumulator;
      },
      {} as Record<FulfillmentType, number>,
    );
    for (const row of fulfillmentGroups) {
      byFulfillment[row.fulfillmentType] = row._count._all ?? 0;
    }

    return {
      from: query.from ?? null,
      to: query.to ?? null,
      totals: {
        orders,
        revenueUSD,
        avgTicketUSD: orders > 0 ? round2(revenueUSD / orders) : 0,
      },
      byStatus,
      byFulfillment,
      topProducts: topItems.map((row) => ({
        productName: row.productName,
        quantity: round2(Number(row._sum.quantity ?? 0)),
        revenueUSD: round2(Number(row._sum.totalUSD ?? 0)),
      })),
      daily: this.bucketByDay(dailyRows),
      publishedProducts,
    };
  }

  /** One point per business day (tenant zone), oldest first. */
  private bucketByDay(
    rows: { createdAt: Date; totalUSD: unknown }[],
  ): ({ date: string } & StorefrontMetricsBucket)[] {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: BUSINESS_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const buckets = new Map<string, StorefrontMetricsBucket>();
    for (const row of rows) {
      const date = formatter.format(new Date(row.createdAt));
      const bucket = buckets.get(date) ?? { orders: 0, revenueUSD: 0 };
      bucket.orders += 1;
      bucket.revenueUSD = round2(
        bucket.revenueUSD + Number(row.totalUSD ?? 0),
      );
      buckets.set(date, bucket);
    }

    return [...buckets.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([date, bucket]) => ({ date, ...bucket }));
  }
}
