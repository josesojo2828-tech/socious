import { AdminAnalyticsService } from "./admin-analytics.service";

/**
 * Admin analytics contract for Socius ERP.
 *
 * The response shape (`AdminDashboardStats`) is stable, but the metrics now
 * read ERP data:
 *  - `totalNutritionists` → ACTIVE organization members (team size)
 *  - `totalPatients`      → clients
 *  - `totalConsultations` → sales
 *  - `totalDietPlans`     → products
 */
const ORG_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const makePrisma = () => ({
  subscription: {
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    groupBy: jest.fn().mockResolvedValue([]),
  },
  organizationMember: {
    count: jest.fn().mockResolvedValue(0),
    findMany: jest.fn().mockResolvedValue([]),
  },
  user: {
    count: jest.fn().mockResolvedValue(0),
    findMany: jest.fn().mockResolvedValue([]),
  },
  client: { count: jest.fn().mockResolvedValue(0) },
  product: { count: jest.fn().mockResolvedValue(0) },
  sale: {
    count: jest.fn().mockResolvedValue(0),
    groupBy: jest.fn().mockResolvedValue([]),
  },
  order: { count: jest.fn().mockResolvedValue(0) },
  transaction: {
    count: jest.fn().mockResolvedValue(0),
    aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
    findMany: jest.fn().mockResolvedValue([]),
  },
  subscriptionPlan: { findMany: jest.fn().mockResolvedValue([]) },
});

const makeService = () => {
  const prisma = makePrisma();
  const service = new AdminAnalyticsService(prisma as any);
  return { service, prisma };
};

describe("AdminAnalyticsService — ERP dashboard stats", () => {
  it("counts ACTIVE organization members as team size", async () => {
    const { service, prisma } = makeService();
    prisma.organizationMember.count.mockResolvedValue(3);

    const stats = await service.getDashboardStats(ORG_A);

    expect(stats.kpi.totalNutritionists).toBe(3);

    const where = prisma.organizationMember.count.mock.calls[0][0].where;
    expect(where.organizationId).toBe(ORG_A);
    expect(where.status).toBe("ACTIVE");
  });

  it("returns 0 (not an error) when the org has no members", async () => {
    const { service } = makeService();

    const stats = await service.getDashboardStats(ORG_A);

    expect(stats.kpi.totalNutritionists).toBe(0);
  });

  it("counts platform users (never demo) in the global branch", async () => {
    const { service, prisma } = makeService();
    prisma.user.count.mockResolvedValue(7);

    const stats = await service.getDashboardStats(null);

    expect(stats.kpi.totalNutritionists).toBe(7);
    const where = prisma.user.count.mock.calls[0][0].where;
    expect(where.deletedAt).toBeNull();
    expect(where.isDemo).toBe(false);
  });

  it("maps clients, sales and products into the KPI payload", async () => {
    const { service, prisma } = makeService();
    prisma.client.count.mockResolvedValue(12);
    prisma.sale.count.mockResolvedValue(34);
    prisma.product.count.mockResolvedValue(56);

    const stats = await service.getDashboardStats(ORG_A);

    expect(stats.kpi.totalPatients).toBe(12);
    expect(stats.kpi.totalConsultations).toBe(34);
    expect(stats.kpi.totalDietPlans).toBe(56);
    expect(prisma.client.count).toHaveBeenCalledWith({
      where: { organizationId: ORG_A },
    });
  });

  it("ranks the top sellers by created sales", async () => {
    const { service, prisma } = makeService();
    prisma.sale.groupBy.mockResolvedValue([
      { createdById: "u-1", _count: { id: 9 } },
      { createdById: "u-2", _count: { id: 4 } },
    ]);
    prisma.user.findMany.mockResolvedValue([
      {
        id: "u-1",
        username: "ana",
        email: "ana@socius.test",
        subscriptions: [],
      },
      {
        id: "u-2",
        username: "bruno",
        email: "bruno@socius.test",
        subscriptions: [],
      },
    ]);

    const stats = await service.getDashboardStats(ORG_A);

    expect(stats.tables.topUsers).toEqual([
      { name: "ana", patients: 9, plan: "Sin plan" },
      { name: "bruno", patients: 4, plan: "Sin plan" },
    ]);
    const groupByWhere = prisma.sale.groupBy.mock.calls[0][0].where;
    expect(groupByWhere.organizationId).toBe(ORG_A);
  });
});
