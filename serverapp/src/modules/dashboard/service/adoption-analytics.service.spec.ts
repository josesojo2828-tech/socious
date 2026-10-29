import { OrganizationMemberStatus } from "@prisma/client";
import {
  AdoptionAnalyticsService,
  ADOPTION_TZ_ENV,
  DEFAULT_ADOPTION_TZ,
} from "./adoption-analytics.service";
import { MissingOrganizationScopeError } from "../../activity/repositories/user-activity-log.repository";

/**
 * Phase 6 (task 6.1) — adoption analytics unit coverage.
 *
 * Contract under test: TZ resolution/override, calendar DAU/WAU/MAU wiring,
 * dormant (30d FIXED) + per-user logins, cohort percentage mapping, funnel
 * conversion math and feature-depth org scoping / demo exclusion.
 *
 * NOTE: authored for task 6.1; the serverapp jest runner is treated as
 * unavailable in this batch, so this spec is not executed here.
 */
const ORG_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const makeActivity = () => ({
  countActiveUsersInCalendarWindow: jest.fn().mockResolvedValue(0),
  getDormantUsers: jest
    .fn()
    .mockResolvedValue({ days: 30, count: 0, users: [] }),
  getCohortRetention: jest.fn().mockResolvedValue([]),
});

const makePrisma = () => ({
  patient: { count: jest.fn().mockResolvedValue(0) },
  menu: { count: jest.fn().mockResolvedValue(0) },
  exchangeList: { count: jest.fn().mockResolvedValue(0) },
  calculatorUsage: { count: jest.fn().mockResolvedValue(0) },
  userSession: { groupBy: jest.fn().mockResolvedValue([]) },
});

const makeConfig = (env?: Record<string, string>) => ({
  get: jest.fn((key: string) => env?.[key]),
});

const makeService = (env?: Record<string, string>) => {
  const prisma = makePrisma();
  const activity = makeActivity();
  const config = makeConfig(env);
  const service = new AdoptionAnalyticsService(
    prisma as any,
    activity as any,
    config as any,
  );
  return { service, prisma, activity, config };
};

describe("AdoptionAnalyticsService — timezone resolution (task 6.1)", () => {
  it("per-request `tz` override wins over ADOPTION_TZ", () => {
    const { service } = makeService({ [ADOPTION_TZ_ENV]: "America/Bogota" });
    expect(service.resolveTimezone("UTC")).toBe("UTC");
  });

  it("falls back to ADOPTION_TZ when no override is provided", () => {
    const { service } = makeService({ [ADOPTION_TZ_ENV]: "America/Bogota" });
    expect(service.resolveTimezone()).toBe("America/Bogota");
  });

  it("falls back to America/Caracas when ADOPTION_TZ is blank or unset", () => {
    expect(makeService({ [ADOPTION_TZ_ENV]: "   " }).service.resolveTimezone()).toBe(
      DEFAULT_ADOPTION_TZ,
    );
    expect(makeService().service.resolveTimezone()).toBe(DEFAULT_ADOPTION_TZ);
  });

  it("treats a blank override as absent and keeps the configured default", () => {
    const { service } = makeService({ [ADOPTION_TZ_ENV]: "America/Santiago" });
    expect(service.resolveTimezone("  ")).toBe("America/Santiago");
  });
});

describe("AdoptionAnalyticsService — DAU/WAU/MAU (task 6.1)", () => {
  it("derives DAU/WAU/MAU from calendar day windows (1/7/30) in the resolved TZ", async () => {
    const { service, activity } = makeService();
    activity.countActiveUsersInCalendarWindow.mockResolvedValue(5);
    const referenceDate = new Date("2026-01-15T12:00:00Z");

    const result = await service.getActiveUsers(ORG_A, {
      tz: "UTC",
      referenceDate,
    });

    expect(result).toEqual({
      tz: "UTC",
      asOf: referenceDate.toISOString(),
      dau: 5,
      wau: 5,
      mau: 5,
    });
    expect(activity.countActiveUsersInCalendarWindow).toHaveBeenCalledTimes(3);
    expect(
      activity.countActiveUsersInCalendarWindow.mock.calls.map((c) => c[1].periods),
    ).toEqual([1, 7, 30]);
    expect(
      activity.countActiveUsersInCalendarWindow.mock.calls.every(
        (c) => c[0] === ORG_A && c[1].unit === "day" && c[1].tz === "UTC",
      ),
    ).toBe(true);
  });

  it("global DAU/WAU/MAU uses the explicit null-org path", async () => {
    const { service, activity } = makeService();
    activity.countActiveUsersInCalendarWindow.mockResolvedValue(2);

    const result = await service.getActiveUsersGlobal({ tz: "UTC" });

    expect(result.dau).toBe(2);
    expect(
      activity.countActiveUsersInCalendarWindow.mock.calls.every(
        (c) => c[0] === null,
      ),
    ).toBe(true);
  });

  it("rejects a tenant read without an organization (never falls back to global)", async () => {
    const { service, activity } = makeService();

    await expect(service.getActiveUsers("")).rejects.toBeInstanceOf(
      MissingOrganizationScopeError,
    );
    expect(activity.countActiveUsersInCalendarWindow).not.toHaveBeenCalled();
  });
});

describe("AdoptionAnalyticsService — dormant users (task 6.1)", () => {
  it("keeps `days` FIXED at 30 and joins per-user login frequency", async () => {
    const { service, activity, prisma } = makeService();
    activity.getDormantUsers.mockResolvedValue({
      days: 30,
      count: 1,
      users: [
        { id: "u1", name: "Ana", lastSeenAt: "2026-01-01T00:00:00.000Z" },
      ],
    });
    prisma.userSession.groupBy.mockResolvedValue([
      { userId: "u1", _count: { id: 4 } },
    ]);

    const result = await service.getDormantUsers(ORG_A, { windowDays: 60 });

    expect(activity.getDormantUsers).toHaveBeenCalledWith(ORG_A, {
      windowDays: 60,
    });
    expect(result.days).toBe(30);
    expect(result.count).toBe(1);
    expect(result.users[0]).toMatchObject({ id: "u1", logins: 4 });

    const groupByArg = prisma.userSession.groupBy.mock.calls[0][0];
    expect(groupByArg.where.organizationId).toBe(ORG_A);
    expect(groupByArg.where.userId.in).toEqual(["u1"]);
    expect(groupByArg.where.startedAt.gte).toBeInstanceOf(Date);
  });

  it("short-circuits login counts when there are no dormant users (zero-safe)", async () => {
    const { service, activity, prisma } = makeService();
    activity.getDormantUsers.mockResolvedValue({
      days: 30,
      count: 0,
      users: [],
    });

    const result = await service.getDormantUsers(ORG_A);

    expect(result).toEqual({ days: 30, count: 0, users: [] });
    expect(prisma.userSession.groupBy).not.toHaveBeenCalled();
  });

  it("global dormant read does not constrain sessions by organization", async () => {
    const { service, activity, prisma } = makeService();
    activity.getDormantUsers.mockResolvedValue({
      days: 30,
      count: 1,
      users: [{ id: "u1", name: "Ana", lastSeenAt: null }],
    });

    await service.getDormantUsersGlobal();

    const groupByArg = prisma.userSession.groupBy.mock.calls[0][0];
    expect(groupByArg.where.organizationId).toBeUndefined();
  });
});

describe("AdoptionAnalyticsService — cohort retention (task 6.1)", () => {
  it("maps retained counts to percentages of the cohort size", async () => {
    const { service, activity } = makeService();
    activity.getCohortRetention.mockResolvedValue([
      { cohort: "2026-01-05", size: 10, retention: [10, 4, 0] },
    ]);

    const result = await service.getCohortRetention(ORG_A, {
      granularity: "week",
      periods: 3,
      tz: "UTC",
    });

    expect(activity.getCohortRetention).toHaveBeenCalledWith(ORG_A, {
      tz: "UTC",
      granularity: "week",
      periods: 3,
      fromDate: undefined,
      toDate: undefined,
    });
    expect(result.cohorts[0].retention).toEqual([100, 40, 0]);
  });

  it("returns 0 (not NaN) for an empty cohort", async () => {
    const { service, activity } = makeService();
    activity.getCohortRetention.mockResolvedValue([
      { cohort: "2026-01-05", size: 0, retention: [0, 0] },
    ]);

    const result = await service.getCohortRetention(ORG_A, { periods: 2 });

    expect(result.cohorts[0].retention).toEqual([0, 0]);
    expect(result.cohorts[0].retention.some(Number.isNaN)).toBe(false);
  });
});

describe("AdoptionAnalyticsService — clinical funnel (task 6.1)", () => {
  it("computes conversion percentages with zero-safe math", async () => {
    const { service, prisma } = makeService();
    [100, 80, 60, 50, 40].forEach((n) =>
      prisma.patient.count.mockResolvedValueOnce(n),
    );

    const result = await service.getClinicalFunnel(ORG_A);

    expect(result.stages.map((s) => s.count)).toEqual([100, 80, 60, 50, 40]);
    expect(result.stages.map((s) => s.conversionFromPrevious)).toEqual([
      100, 80, 75, 83.33, 80,
    ]);
    expect(result.stages.map((s) => s.conversionFromFirst)).toEqual([
      100, 80, 60, 50, 40,
    ]);
  });

  it("returns zeros (no NaN) when the period is empty", async () => {
    const { service } = makeService();

    const result = await service.getClinicalFunnel(ORG_A);

    expect(result.stages.every((s) => s.count === 0)).toBe(true);
    expect(
      result.stages.every(
        (s) =>
          s.conversionFromPrevious === 0 &&
          s.conversionFromFirst === 0 &&
          !Number.isNaN(s.conversionFromPrevious),
      ),
    ).toBe(true);
  });

  it("scopes the funnel to the org, excludes demo and keeps unlinked patients", async () => {
    const { service, prisma } = makeService();

    await service.getClinicalFunnel(ORG_A);

    const where = prisma.patient.count.mock.calls[0][0].where;
    expect(where.organizationId).toBe(ORG_A);
    expect(where.deletedAt).toBeNull();
    const serialized = JSON.stringify(where);
    expect(serialized).toContain('"isDemo":false');
    expect(serialized).toContain('"createdById":null');
    expect(serialized).toContain('"userId":null');
  });

  it("applies the relation filters for each funnel stage", async () => {
    const { service, prisma } = makeService();

    await service.getClinicalFunnel(ORG_A);

    const wheres = prisma.patient.count.mock.calls.map((c) => c[0].where);
    expect(wheres[0]).not.toHaveProperty("anamnesis");
    expect(wheres[1]).toHaveProperty("anamnesis");
    expect(wheres[2]).toHaveProperty("anthropometrics");
    expect(wheres[3]).toHaveProperty("consultations");
    expect(wheres[4]).toHaveProperty("plans");
  });

  it("global funnel does not filter by organization (explicit platform read)", async () => {
    const { service, prisma } = makeService();

    await service.getClinicalFunnelGlobal();

    const where = prisma.patient.count.mock.calls[0][0].where;
    expect(where.organizationId).toBeUndefined();
  });
});

describe("AdoptionAnalyticsService — feature depth (task 6.1)", () => {
  it("counts calculators, menus and exchange lists for the org", async () => {
    const { service, prisma } = makeService();
    prisma.calculatorUsage.count.mockResolvedValue(3);
    prisma.menu.count.mockResolvedValue(2);
    prisma.exchangeList.count.mockResolvedValue(1);

    const result = await service.getFeatureDepth(ORG_A);

    expect(result).toEqual({ calculators: 3, menus: 2, exchangeLists: 1 });
  });

  it("scopes CalculatorUsage through an ACTIVE organization membership (demo excluded)", async () => {
    const { service, prisma } = makeService();

    await service.getFeatureDepth(ORG_A);

    const where = prisma.calculatorUsage.count.mock.calls[0][0].where;
    const membership =
      where.user.is.organizationMembers.some;
    expect(where.user.is.isDemo).toBe(false);
    expect(membership.organizationId).toBe(ORG_A);
    expect(membership.status).toBe(OrganizationMemberStatus.ACTIVE);
  });

  it("scopes menus/exchange lists to the org and excludes demo creators", async () => {
    const { service, prisma } = makeService();

    await service.getFeatureDepth(ORG_A);

    for (const model of [prisma.menu, prisma.exchangeList]) {
      const where = model.count.mock.calls[0][0].where;
      expect(where.organizationId).toBe(ORG_A);
      expect(where.deletedAt).toBeNull();
      expect(JSON.stringify(where)).toContain('"isDemo":false');
    }
  });

  it("global depth keeps unlinked calculator usage and excludes demo users", async () => {
    const { service, prisma } = makeService();

    await service.getFeatureDepthGlobal();

    const where = prisma.calculatorUsage.count.mock.calls[0][0].where;
    expect(where.user).toBeUndefined();
    expect(JSON.stringify(where)).toContain('"userId":null');
    expect(JSON.stringify(where)).toContain('"isDemo":false');
    expect(prisma.menu.count.mock.calls[0][0].where.organizationId).toBeUndefined();
  });
});
