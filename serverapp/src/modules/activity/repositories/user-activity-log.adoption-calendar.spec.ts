import UserActivityLogRepository, {
  MissingOrganizationScopeError,
} from "./user-activity-log.repository";

/**
 * Phase 6 (task 6.1) — TZ-aware calendar/dormant SQL coverage.
 *
 * Contract under test: calendar buckets are built with
 * `date_trunc(unit, ts AT TIME ZONE tz)` and the window boundaries are computed
 * in LOCAL wall-clock and converted back with `AT TIME ZONE tz` (DST-safe, a
 * 7-day window across a DST change is 167/169 real hours). The `tz` value is
 * always parameterized, `isDemo` is always excluded and tenant reads require an
 * organization (they NEVER degrade to global).
 *
 * NOTE: authored for task 6.1; the serverapp jest runner is treated as
 * unavailable in this batch, so this spec is not executed here. Assertions
 * inspect the generated `Prisma.Sql` (`strings` / `values`) instead of a live DB.
 */
const ORG_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const TZ = "America/Caracas";

const makeRepo = () => {
  const prisma = { $queryRaw: jest.fn().mockResolvedValue([]) };
  const logger = { logError: jest.fn() };
  const repo = new UserActivityLogRepository(prisma as any, logger as any);
  return { repo, prisma };
};

const sqlOf = (prisma: any, call = 0) => {
  const sql = prisma.$queryRaw.mock.calls[call][0];
  // Join with "" to reconstruct the statement with value placeholders omitted
  // (the raw fragments, e.g. `'1 day'`, stay glued to their literal neighbours).
  return { sql, text: sql.strings.join("") };
};

describe("UserActivityLogRepository — calendar window TZ bucketing (task 6.1)", () => {
  it("buckets with date_trunc(unit, ts AT TIME ZONE tz) and excludes demo users", async () => {
    const { repo, prisma } = makeRepo();

    await repo.countDistinctActiveUsersInOrganizationCalendar(ORG_A, {
      tz: TZ,
      unit: "day",
      periods: 1,
      referenceDate: new Date("2026-01-01T03:00:00Z"),
    });

    const { sql, text } = sqlOf(prisma);
    expect(text).toContain("COUNT(DISTINCT");
    expect(text).toContain("date_trunc('day'");
    expect(text).toContain("AT TIME ZONE");
    expect(text).toContain("isDemo");
    expect(sql.values).toContain(TZ);
    expect(sql.values).toContain(ORG_A);
  });

  it("parameterizes the tz so a per-request override changes the bucket boundary", async () => {
    const { repo, prisma } = makeRepo();

    await repo.countDistinctActiveUsersInOrganizationCalendar(ORG_A, {
      tz: "UTC",
      unit: "day",
      periods: 1,
      referenceDate: new Date("2026-01-01T03:00:00Z"),
    });

    const { sql } = sqlOf(prisma);
    expect(sql.values).toContain("UTC");
    expect(sql.values).not.toContain(TZ);
  });

  it("builds DST-safe boundaries: local wall-clock arithmetic converted back with AT TIME ZONE", async () => {
    const { repo, prisma } = makeRepo();

    await repo.countDistinctActiveUsersInOrganizationCalendar(ORG_A, {
      tz: TZ,
      unit: "day",
      periods: 7,
      referenceDate: new Date("2026-03-10T12:00:00Z"),
    });

    const { sql, text } = sqlOf(prisma);
    // Lower bound: truncated local reference minus (periods - 1) local days.
    expect(text).toContain("- (::int - 1) * '1 day'::interval");
    // Upper bound: truncated local reference plus one local interval.
    expect(text).toContain("+ '1 day'::interval");
    // Both bounds convert the local wall-clock back to timestamptz.
    expect(text).toContain(") AT TIME ZONE");
    expect(sql.values).toContain(7);
  });

  it("uses the week/month interval when bucketing those units", async () => {
    const { repo, prisma } = makeRepo();

    await repo.countDistinctActiveUsersInOrganizationCalendar(ORG_A, {
      tz: TZ,
      unit: "week",
      periods: 8,
      referenceDate: new Date("2026-03-10T12:00:00Z"),
    });

    const { text } = sqlOf(prisma);
    expect(text).toContain("date_trunc('week'");
    expect(text).toContain("'1 week'::interval");
  });

  it("global calendar read has NO organization filter (explicit platform path)", async () => {
    const { repo, prisma } = makeRepo();

    await repo.countDistinctActiveUsersGlobalCalendar({
      tz: TZ,
      unit: "day",
      periods: 1,
      referenceDate: new Date("2026-01-01T03:00:00Z"),
    });

    const { sql, text } = sqlOf(prisma);
    expect(text).not.toContain('"organizationId" =');
    expect(sql.values).not.toContain(ORG_A);
  });

  it("throws without an organization and never queries (tenant isolation)", async () => {
    const { repo, prisma } = makeRepo();

    await expect(
      repo.countDistinctActiveUsersInOrganizationCalendar(undefined as any, {
        tz: TZ,
        unit: "day",
        periods: 1,
      }),
    ).rejects.toBeInstanceOf(MissingOrganizationScopeError);

    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });
});

describe("UserActivityLogRepository — calendar series (task 6.1)", () => {
  it("emits one TZ-aware bucket per period via to_char(date_trunc(...))", async () => {
    const { repo, prisma } = makeRepo();

    await repo.getCalendarActiveUsersByOrganization(ORG_A, {
      tz: TZ,
      unit: "day",
      periods: 7,
      referenceDate: new Date("2026-01-01T03:00:00Z"),
    });

    const { text } = sqlOf(prisma);
    expect(text).toContain("to_char(");
    expect(text).toContain("date_trunc('day'");
    expect(text).toContain("AT TIME ZONE");
    expect(text).toContain("GROUP BY");
  });
});

describe("UserActivityLogRepository — dormant window (task 6.1)", () => {
  it("filters by the fixed dormant threshold and excludes demo users", async () => {
    const { repo, prisma } = makeRepo();

    await repo.findDormantUsersByOrganization(ORG_A, {
      dormantDays: 30,
      windowDays: 90,
    });

    const { sql, text } = sqlOf(prisma);
    expect(text).toContain('u."isDemo" = false');
    expect(text).toContain("make_interval(days =>");
    expect(text).toContain('MAX(ual."createdAt") <');
    expect(sql.values).toContain(30);
    expect(sql.values).toContain(90);
    expect(sql.values).toContain(ORG_A);
  });

  it("global dormant read has no organization filter", async () => {
    const { repo, prisma } = makeRepo();

    await repo.findDormantUsersGlobal({ dormantDays: 30, windowDays: 90 });

    const { sql, text } = sqlOf(prisma);
    expect(text).not.toContain('ual."organizationId" =');
    expect(sql.values).not.toContain(ORG_A);
  });
});
