import { AdminAnalyticsService } from "./admin-analytics.service";

/**
 * Phase 5 (task 5.2) — R4 nutritionist KPI uses the canonical `USER` permit.
 *
 * Contract under test: `totalNutritionists` counts ACTIVE org members whose user
 * carries `permits.name === "USER"` (both org-scoped and global branches); the
 * stale `NUTRITIONIST` permit name is gone. No USER members => 0, never an error.
 */
const ORG_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const makeMember = (username: string) => ({
  user: {
    username,
    email: `${username}@nutringest.test`,
    subscriptions: [],
    nutritionistProfile: { patientNutritionists: [] },
  },
});

const makePrisma = () => ({
  subscription: {
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    groupBy: jest.fn().mockResolvedValue([]),
  },
  organizationMember: { findMany: jest.fn().mockResolvedValue([]) },
  user: { count: jest.fn().mockResolvedValue(0) },
  patient: { count: jest.fn().mockResolvedValue(0) },
  consultation: { count: jest.fn().mockResolvedValue(0) },
  nutritionalPlan: { count: jest.fn().mockResolvedValue(0) },
  transaction: {
    count: jest.fn().mockResolvedValue(0),
    aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
    findMany: jest.fn().mockResolvedValue([]),
  },
  subscriptionPlan: { findMany: jest.fn().mockResolvedValue([]) },
  nutritionist: { findMany: jest.fn().mockResolvedValue([]) },
});

const makeService = () => {
  const prisma = makePrisma();
  const service = new AdminAnalyticsService(prisma as any);
  return { service, prisma };
};

describe("AdminAnalyticsService — nutritionist KPI (task 5.2, R4)", () => {
  it("counts active USER-permit org members (non-zero)", async () => {
    const { service, prisma } = makeService();
    prisma.organizationMember.findMany.mockResolvedValue([
      makeMember("ana"),
      makeMember("bruno"),
      makeMember("carla"),
    ]);

    const stats = await service.getDashboardStats(ORG_A);

    expect(stats.kpi.totalNutritionists).toBe(3);

    const where = prisma.organizationMember.findMany.mock.calls[0][0].where;
    expect(where.organizationId).toBe(ORG_A);
    expect(where.status).toBe("ACTIVE");
    expect(where.user.permits.name).toBe("USER");
    expect(where.user.deletedAt).toBeNull();
    expect(where.user.isDemo).toBe(false);
  });

  it("returns 0 (not an error) when the org has no USER members", async () => {
    const { service, prisma } = makeService();
    prisma.organizationMember.findMany.mockResolvedValue([]);

    const stats = await service.getDashboardStats(ORG_A);

    expect(stats.kpi.totalNutritionists).toBe(0);
  });

  it("global branch also filters by the USER permit", async () => {
    const { service, prisma } = makeService();
    prisma.user.count.mockResolvedValue(7);

    const stats = await service.getDashboardStats(null);

    expect(stats.kpi.totalNutritionists).toBe(7);
    const where = prisma.user.count.mock.calls[0][0].where;
    expect(where.permits.name).toBe("USER");
    expect(where.deletedAt).toBeNull();
    expect(where.isDemo).toBe(false);
  });
});
