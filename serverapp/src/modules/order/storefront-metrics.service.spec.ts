import { ForbiddenException } from "@nestjs/common";
import { StorefrontMetricsService } from "./storefront-metrics.service";

const ORG = "org-1";
const SCOPE = { organizationId: ORG, createdById: "u-1" };

const makeService = () => {
  const prisma = {
    order: {
      aggregate: jest.fn(async () => ({
        _count: { _all: 3 },
        _sum: { totalUSD: 60 },
      })),
      groupBy: jest.fn(async ({ by }: any) => {
        if (by[0] === "status") {
          return [
            { status: "PENDING", _count: { _all: 2 }, _sum: { totalUSD: 30 } },
            { status: "DELIVERED", _count: { _all: 1 }, _sum: { totalUSD: 30 } },
          ];
        }
        return [
          { fulfillmentType: "PICKUP", _count: { _all: 2 } },
          { fulfillmentType: "DELIVERY", _count: { _all: 1 } },
        ];
      }),
      findMany: jest.fn(async () => [
        // 02:30Z is still the previous evening in the tenant zone.
        { createdAt: new Date("2026-11-08T02:30:00.000Z"), totalUSD: 20 },
        { createdAt: new Date("2026-11-07T12:00:00.000Z"), totalUSD: 10 },
        { createdAt: new Date("2026-11-08T14:00:00.000Z"), totalUSD: 30 },
      ]),
    },
    orderItem: {
      groupBy: jest.fn(async () => [
        { productName: "Hoja A4", _sum: { quantity: 10, totalUSD: 20 } },
      ]),
    },
    product: { count: jest.fn(async () => 7) },
  };

  return { service: new StorefrontMetricsService(prisma as any), prisma };
};

describe("StorefrontMetricsService", () => {
  it("rejects a caller without a workspace", async () => {
    const { service } = makeService();

    await expect(
      service.get({ organizationId: null, createdById: "u-1" }, {}),
    ).rejects.toThrow(ForbiddenException);
  });

  it("counts only STOREFRONT orders of the caller's organization", async () => {
    const { service, prisma } = makeService();

    await service.get(SCOPE, {});

    expect(prisma.order.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: ORG, channel: "STOREFRONT" },
      }),
    );
    expect(prisma.orderItem.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          order: { organizationId: ORG, channel: "STOREFRONT" },
        },
      }),
    );
  });

  it("applies the requested range as an inclusive day filter", async () => {
    const { service, prisma } = makeService();

    await service.get(SCOPE, { from: "2026-11-01", to: "2026-11-08" });

    const where = prisma.order.aggregate.mock.calls[0][0].where;
    expect(where.createdAt.gte.toISOString()).toBe("2026-11-01T00:00:00.000Z");
    expect(where.createdAt.lte.toISOString()).toBe("2026-11-08T23:59:59.999Z");
  });

  it("summarizes totals, statuses, fulfillment and top products", async () => {
    const { service } = makeService();

    const metrics = await service.get(SCOPE, {});

    expect(metrics.totals).toEqual({
      orders: 3,
      revenueUSD: 60,
      avgTicketUSD: 20,
    });
    expect(metrics.byStatus.PENDING).toEqual({ orders: 2, revenueUSD: 30 });
    expect(metrics.byStatus.DELIVERED).toEqual({ orders: 1, revenueUSD: 30 });
    // Every status is present so the UI never renders undefined.
    expect(metrics.byStatus.CANCELLED).toEqual({ orders: 0, revenueUSD: 0 });
    expect(metrics.byFulfillment).toEqual({
      PICKUP: 2,
      DELIVERY: 1,
      SHIPPING: 0,
    });
    expect(metrics.topProducts).toEqual([
      { productName: "Hoja A4", quantity: 10, revenueUSD: 20 },
    ]);
    expect(metrics.publishedProducts).toBe(7);
  });

  it("buckets the daily series by business day in the tenant zone", async () => {
    const { service } = makeService();
    const zone = process.env.BILLING_TIMEZONE || "America/Caracas";
    const dayKey = (iso: string) =>
      new Intl.DateTimeFormat("en-CA", {
        timeZone: zone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(iso));

    const metrics = await service.get(SCOPE, {});

    // The 02:30Z order belongs to the previous local day; the 14:00Z one does
    // not. Buckets are sorted oldest first.
    const expectedDates = [
      dayKey("2026-11-08T02:30:00.000Z"),
      dayKey("2026-11-08T14:00:00.000Z"),
    ].sort();
    expect(metrics.daily.map((row) => row.date)).toEqual(expectedDates);
    expect(metrics.daily[0].orders).toBe(2);
  });

  it("returns zeroed metrics when the period has no orders", async () => {
    const { service, prisma } = makeService();
    prisma.order.aggregate.mockResolvedValueOnce({
      _count: { _all: 0 },
      _sum: { totalUSD: null },
    });
    prisma.order.groupBy.mockResolvedValue([]);
    prisma.order.findMany.mockResolvedValue([]);
    prisma.orderItem.groupBy.mockResolvedValue([]);

    const metrics = await service.get(SCOPE, {});

    expect(metrics.totals).toEqual({ orders: 0, revenueUSD: 0, avgTicketUSD: 0 });
    expect(metrics.daily).toEqual([]);
    expect(metrics.topProducts).toEqual([]);
  });
});
