import { AdoptionAnalyticsService } from "./adoption-analytics.service";

/**
 * Phase 6 (task 6.2) — adoption analytics integration coverage.
 *
 * Runs the REAL `AdoptionAnalyticsService` against an in-memory Prisma fake
 * (same style as `telemetry-integration.spec.ts`) to prove: strict tenant
 * isolation (A != B, null-org hidden from tenants), the explicit global variant,
 * funnel relation filters, and the `CalculatorUsage` -> `User`/`OrganizationMember`
 * org join.
 *
 * NOTE: authored for task 6.2; the serverapp jest runner is treated as
 * unavailable in this batch, so this spec is not executed here.
 */
const ORG_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ORG_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

interface AnyRow {
  [key: string]: any;
}

const matchCond = (value: any, cond: any): boolean => {
  if (cond === null) return value === null || value === undefined;
  if (cond instanceof Date)
    return value instanceof Date && value.getTime() === cond.getTime();
  if (Array.isArray(cond)) return cond.some((c) => matchCond(value, c));
  if (typeof cond === "object") {
    if ("isNot" in cond) return value !== null && value !== undefined;
    if ("some" in cond)
      return (
        Array.isArray(value) &&
        value.some((item) => matchWhere(item, cond.some))
      );
    if ("is" in cond)
      return value !== null && value !== undefined
        ? matchWhere(value, cond.is)
        : false;
    if ("in" in cond) return Array.isArray(cond.in) && cond.in.includes(value);
    if ("gte" in cond) return value != null && value >= cond.gte;
    if ("lt" in cond) return value != null && value < cond.lt;
    if ("lte" in cond) return value != null && value <= cond.lte;
    return true;
  }
  return value === cond;
};

const matchWhere = (row: AnyRow, where: any): boolean => {
  if (!where) return true;
  return Object.entries(where).every(([key, cond]) => {
    if (key === "AND")
      return (cond as any[]).every((c) => matchWhere(row, c));
    if (key === "OR") return (cond as any[]).some((c) => matchWhere(row, c));
    return matchCond(row[key], cond);
  });
};

const nonDemo = { isDemo: false };
const demo = { isDemo: true };

const patient = (over: Partial<AnyRow>): AnyRow => ({
  id: "p",
  organizationId: ORG_A,
  deletedAt: null,
  createdById: "creator",
  userId: "subject",
  createdBy: nonDemo,
  user: nonDemo,
  anamnesis: null,
  anthropometrics: [],
  consultations: [],
  plans: [],
  ...over,
});

const seed = () => {
  const userA = {
    id: "uA",
    isDemo: false,
    organizationMembers: [{ organizationId: ORG_A, status: "ACTIVE" }],
  };
  const userB = {
    id: "uB",
    isDemo: false,
    organizationMembers: [{ organizationId: ORG_B, status: "ACTIVE" }],
  };
  const userDemo = {
    id: "uDemo",
    isDemo: true,
    organizationMembers: [{ organizationId: ORG_A, status: "ACTIVE" }],
  };

  return {
    patients: [
      // Org A, fully converted (all stages).
      patient({
        id: "pA1",
        organizationId: ORG_A,
        anamnesis: { id: "an1" },
        anthropometrics: [{ id: "at1" }],
        consultations: [{ id: "co1" }],
        plans: [{ id: "pl1" }],
      }),
      // Org A, registered only.
      patient({ id: "pA2", organizationId: ORG_A }),
      // Org B.
      patient({ id: "pB1", organizationId: ORG_B }),
      // Null-org (global only).
      patient({ id: "pN1", organizationId: null }),
      // Org A but demo-created (must never count).
      patient({
        id: "pDemo",
        organizationId: ORG_A,
        createdById: "demoCreator",
        createdBy: demo,
      }),
    ],
    menus: [
      { id: "m1", organizationId: ORG_A, deletedAt: null, createdById: "c", createdBy: nonDemo },
      { id: "m2", organizationId: ORG_B, deletedAt: null, createdById: "c", createdBy: nonDemo },
      { id: "m3", organizationId: null, deletedAt: null, createdById: null, createdBy: null },
      { id: "m4", organizationId: ORG_A, deletedAt: null, createdById: "dc", createdBy: demo },
    ],
    exchangeLists: [
      { id: "e1", organizationId: ORG_A, deletedAt: null, createdById: "c", createdBy: nonDemo },
      { id: "e2", organizationId: ORG_B, deletedAt: null, createdById: "c", createdBy: nonDemo },
    ],
    calculatorUsages: [
      { id: "cu1", userId: "uA", user: userA },
      { id: "cu2", userId: "uB", user: userB },
      { id: "cu3", userId: null, user: null },
      { id: "cu4", userId: "uDemo", user: userDemo },
    ],
  };
};

const makeFakePrisma = (data: ReturnType<typeof seed>) => {
  const countOf = (rows: AnyRow[]) =>
    jest.fn(async ({ where }: any) =>
      rows.filter((row) => matchWhere(row, where)).length,
    );

  return {
    patient: { count: countOf(data.patients) },
    menu: { count: countOf(data.menus) },
    exchangeList: { count: countOf(data.exchangeLists) },
    calculatorUsage: { count: countOf(data.calculatorUsages) },
    userSession: { groupBy: jest.fn().mockResolvedValue([]) },
    $queryRaw: jest.fn().mockResolvedValue([]),
  };
};

const makeService = () => {
  const prisma = makeFakePrisma(seed());
  const activity = {
    countActiveUsersInCalendarWindow: jest.fn().mockResolvedValue(0),
    getDormantUsers: jest.fn().mockResolvedValue({ days: 30, count: 0, users: [] }),
    getCohortRetention: jest.fn().mockResolvedValue([]),
  };
  const config = { get: jest.fn().mockReturnValue(undefined) };
  const service = new AdoptionAnalyticsService(
    prisma as any,
    activity as any,
    config as any,
  );
  return { service, prisma };
};

describe("AdoptionAnalyticsService integration — clinical funnel isolation (task 6.2)", () => {
  it("org A sees only its non-demo patients across every stage", async () => {
    const { service } = makeService();

    const funnel = await service.getClinicalFunnel(ORG_A);

    expect(funnel.stages.map((s) => s.count)).toEqual([2, 1, 1, 1, 1]);
  });

  it("org B does not see org A patients (A != B)", async () => {
    const { service } = makeService();

    const funnel = await service.getClinicalFunnel(ORG_B);

    expect(funnel.stages.map((s) => s.count)).toEqual([1, 0, 0, 0, 0]);
  });

  it("global funnel includes null-org rows and excludes demo patients", async () => {
    const { service } = makeService();

    const funnel = await service.getClinicalFunnelGlobal();

    // pA1 + pA2 + pB1 + pN1 (demo excluded).
    expect(funnel.stages[0].count).toBe(4);
  });

  it("applies the relation filters per stage (anamnesis/anthropometry/consultation/plan)", async () => {
    const { service } = makeService();

    const funnel = await service.getClinicalFunnel(ORG_A);

    expect(funnel.stages.map((s) => s.key)).toEqual([
      "patients",
      "anamnesis",
      "anthropometry",
      "consultation",
      "plan",
    ]);
    expect(funnel.stages[1].count).toBe(1);
    expect(funnel.stages[4].count).toBe(1);
  });

  it("throws for a tenant read without an organization (never global)", async () => {
    const { service, prisma } = makeService();

    await expect(service.getClinicalFunnel("")).rejects.toThrow();
    expect(prisma.patient.count).not.toHaveBeenCalled();
  });
});

describe("AdoptionAnalyticsService integration — feature depth isolation (task 6.2)", () => {
  it("scopes menus and exchange lists to org A and excludes demo creators", async () => {
    const { service } = makeService();

    const depth = await service.getFeatureDepth(ORG_A);

    expect(depth.menus).toBe(1);
    expect(depth.exchangeLists).toBe(1);
  });

  it("scopes CalculatorUsage via User/OrganizationMember — never other orgs", async () => {
    const { service } = makeService();

    const orgA = await service.getFeatureDepth(ORG_A);
    const orgB = await service.getFeatureDepth(ORG_B);

    expect(orgA.calculators).toBe(1);
    expect(orgB.calculators).toBe(1);
  });

  it("global depth counts non-demo and unlinked calculator usage across orgs", async () => {
    const { service } = makeService();

    const depth = await service.getFeatureDepthGlobal();

    // cu1 (org A) + cu2 (org B) + cu3 (unlinked); cu4 is demo.
    expect(depth.calculators).toBe(3);
    expect(depth.menus).toBe(3);
    expect(depth.exchangeLists).toBe(2);
  });
});
