import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "nestjs-prisma";
import { LoggerService } from "src/shared/logger/logger.service";
import ActivityModel from "../model/activity.model";
import type {
  ActivityCalendarUnit,
  FindGlobalParams,
  IActivityStats,
  IActivityStatsQuery,
  ICalendarActiveUsersBucket,
  ICalendarActiveUsersQuery,
  ICohortActivityRow,
  ICohortRetentionQuery,
  IDormantUser,
  IDormantUsersQuery,
} from "../interfaces/activity.interface";

/**
 * Thrown when a tenant-scoped read is attempted without a usable
 * `organizationId`. Tenant reads NEVER fall back to a global query — this is
 * the structural guarantee that prevents cross-tenant leaks even for callers
 * that bypass the controller/service layers.
 */
export class MissingOrganizationScopeError extends Error {
  constructor() {
    super("organizationId is required for tenant-scoped activity reads");
    this.name = "MissingOrganizationScopeError";
  }
}

const assertOrganizationScope = (
  organizationId?: string | null,
): string => {
  if (!organizationId || organizationId.trim().length === 0) {
    throw new MissingOrganizationScopeError();
  }
  return organizationId;
};

/**
 * Whitelisted calendar units → raw SQL fragments. `unit` is always one of the
 * closed `ActivityCalendarUnit` values, never user input, so inlining the
 * fragments via `Prisma.raw` is safe (the `tz` value is always parameterized).
 */
const CALENDAR_UNIT_SQL: Record<
  ActivityCalendarUnit,
  { trunc: string; interval: string }
> = {
  day: { trunc: "'day'", interval: "'1 day'" },
  week: { trunc: "'week'", interval: "'1 week'" },
  month: { trunc: "'month'", interval: "'1 month'" },
};

@Injectable()
export default class UserActivityLogRepository extends ActivityModel {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {
    super();
  }

  async create(data: {
    userId: string;
    action: string;
    description?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
    organizationId?: string | null;
    eventName?: string | null;
    category?: string | null;
    source?: string | null;
    eventVersion?: string | null;
  }): Promise<void> {
    const serialized =
      data.metadata && typeof data.metadata === "object"
        ? JSON.parse(JSON.stringify(data.metadata))
        : undefined;

    await this.prisma.userActivityLog
      .create({
        data: {
          userId: data.userId,
          action: data.action,
          description: data.description,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          metadata: serialized,
          organizationId: data.organizationId ?? null,
          eventName: data.eventName ?? null,
          category: data.category ?? null,
          source: data.source ?? null,
          eventVersion: data.eventVersion ?? null,
        },
      })
      .catch((error) => {
        this.logger.logError("Failed to create activity log", error);
      });
  }

  /**
   * TENANT read — `organizationId` is REQUIRED. Throws
   * `MissingOrganizationScopeError` when it is missing/blank; it NEVER falls
   * back to an unscoped (global) query.
   */
  async findByOrganization(
    organizationId: string,
    params: FindGlobalParams,
  ): Promise<any[]> {
    const scopedOrganizationId = assertOrganizationScope(organizationId);
    const where = this.buildFindWhere(params);
    where.organizationId = scopedOrganizationId;
    return this.findManyWithUser(where, params.take);
  }

  /**
   * GLOBAL (platform) read — explicit by method name. It applies NO
   * organization filter and is the ONLY path that may include null-org rows.
   * Reachable exclusively for SUPERADMIN/global callers.
   */
  async findGlobal(params: FindGlobalParams): Promise<any[]> {
    const where = this.buildFindWhere(params);
    return this.findManyWithUser(where, params.take);
  }

  /**
   * TENANT stats — `organizationId` is REQUIRED and asserted at the boundary.
   */
  async getStatsByOrganization(
    organizationId: string,
    query: IActivityStatsQuery,
  ): Promise<IActivityStats> {
    return this.getStatsInternal(assertOrganizationScope(organizationId), query);
  }

  /**
   * GLOBAL (platform) stats — explicit by method name, no org filter.
   */
  async getGlobalStats(query: IActivityStatsQuery): Promise<IActivityStats> {
    return this.getStatsInternal(null, query);
  }

  /**
   * Distinct active users (DAU/WAU/MAU primitive) for a REQUIRED organization.
   * Demo users (`isDemo = true`) are always excluded. Throws when the org is
   * missing — never aggregates across tenants.
   */
  async countDistinctActiveUsersInOrganization(
    organizationId: string,
    { fromDate, toDate }: { fromDate: Date; toDate: Date },
  ): Promise<number> {
    const org = assertOrganizationScope(organizationId);

    const rows = await this.prisma.$queryRaw<Array<{ count: number }>>(
      Prisma.sql`
        SELECT COUNT(DISTINCT ual."userId")::int AS count
        FROM "UserActivityLog" ual
        INNER JOIN "User" u ON u.id = ual."userId"
        WHERE ual."createdAt" >= ${fromDate}
          AND ual."createdAt" < ${toDate}
          AND u."isDemo" = false
          AND ual."organizationId" = ${org}
      `,
    );

    return Number(rows[0]?.count ?? 0);
  }

  /**
   * TENANT — distinct active users within a TZ-aware CALENDAR window. Activity
   * is bucketed with `date_trunc(unit, createdAt AT TIME ZONE tz)` so a UTC
   * instant maps to exactly one local calendar day (DST-correct). DAU/WAU/MAU
   * are `unit: "day"` with 1/7/30 periods. Demo users are always excluded.
   * Throws when the org is missing — never aggregates across tenants.
   */
  async countDistinctActiveUsersInOrganizationCalendar(
    organizationId: string,
    query: ICalendarActiveUsersQuery,
  ): Promise<number> {
    const org = assertOrganizationScope(organizationId);
    return this.countDistinctActiveUsersCalendar(query, org);
  }

  /** GLOBAL — same calendar window, explicit no-org filter (includes null-org). */
  async countDistinctActiveUsersGlobalCalendar(
    query: ICalendarActiveUsersQuery,
  ): Promise<number> {
    return this.countDistinctActiveUsersCalendar(query, null);
  }

  private async countDistinctActiveUsersCalendar(
    query: ICalendarActiveUsersQuery,
    organizationId: string | null,
  ): Promise<number> {
    const rows = await this.prisma.$queryRaw<Array<{ count: number }>>(
      Prisma.sql`
        SELECT COUNT(DISTINCT ual."userId")::int AS count
        FROM "UserActivityLog" ual
        INNER JOIN "User" u ON u.id = ual."userId"
        WHERE ${this.buildCalendarWindow({ ...query, organizationId })}
      `,
    );

    return Number(rows[0]?.count ?? 0);
  }

  /**
   * TENANT — distinct active users per calendar bucket (TZ-aware series) for
   * the requested window. Only buckets with activity are returned; callers
   * zero-fill the missing periods. Demo users are always excluded.
   */
  async getCalendarActiveUsersByOrganization(
    organizationId: string,
    query: ICalendarActiveUsersQuery,
  ): Promise<ICalendarActiveUsersBucket[]> {
    const org = assertOrganizationScope(organizationId);
    return this.getCalendarActiveUsers(query, org);
  }

  /** GLOBAL — same calendar series, explicit no-org filter (includes null-org). */
  async getCalendarActiveUsersGlobal(
    query: ICalendarActiveUsersQuery,
  ): Promise<ICalendarActiveUsersBucket[]> {
    return this.getCalendarActiveUsers(query, null);
  }

  private async getCalendarActiveUsers(
    query: ICalendarActiveUsersQuery,
    organizationId: string | null,
  ): Promise<ICalendarActiveUsersBucket[]> {
    const { trunc } = CALENDAR_UNIT_SQL[query.unit];

    const rows = await this.prisma.$queryRaw<
      Array<{ bucket: string; count: number }>
    >(
      Prisma.sql`
        SELECT to_char(
                 date_trunc(${Prisma.raw(trunc)}, ual."createdAt" AT TIME ZONE ${query.tz}),
                 'YYYY-MM-DD'
               ) AS bucket,
               COUNT(DISTINCT ual."userId")::int AS count
        FROM "UserActivityLog" ual
        INNER JOIN "User" u ON u.id = ual."userId"
        WHERE ${this.buildCalendarWindow({ ...query, organizationId })}
        GROUP BY 1
        ORDER BY 1 ASC
      `,
    );

    return rows.map((row) => ({ bucket: row.bucket, count: Number(row.count) }));
  }

  /**
   * TENANT — dormant users: last activity older than `dormantDays` but within
   * the optional `windowDays` outer lookback (users idle longer are churned).
   * Demo users are always excluded. Throws when the org is missing.
   */
  async findDormantUsersByOrganization(
    organizationId: string,
    query: IDormantUsersQuery,
  ): Promise<IDormantUser[]> {
    const org = assertOrganizationScope(organizationId);
    return this.findDormantUsers(query, org);
  }

  /** GLOBAL — same dormant report, explicit no-org filter (includes null-org). */
  async findDormantUsersGlobal(
    query: IDormantUsersQuery,
  ): Promise<IDormantUser[]> {
    return this.findDormantUsers(query, null);
  }

  private async findDormantUsers(
    { dormantDays, windowDays }: IDormantUsersQuery,
    organizationId: string | null,
  ): Promise<IDormantUser[]> {
    const days = Math.max(0, Math.trunc(dormantDays));
    const window =
      windowDays != null ? Math.max(0, Math.trunc(windowDays)) : null;

    const rows = await this.prisma.$queryRaw<
      Array<{ id: string; name: string; lastSeenAt: Date | null }>
    >(
      Prisma.sql`
        SELECT u.id,
               u."fullName" AS name,
               MAX(ual."createdAt") AS "lastSeenAt"
        FROM "UserActivityLog" ual
        INNER JOIN "User" u ON u.id = ual."userId"
        WHERE u."isDemo" = false
          ${
            organizationId
              ? Prisma.sql`AND ual."organizationId" = ${organizationId}`
              : Prisma.empty
          }
          ${
            window != null
              ? Prisma.sql`AND ual."createdAt" >= now() - make_interval(days => ${window}::int)`
              : Prisma.empty
          }
        GROUP BY u.id, u."fullName"
        HAVING MAX(ual."createdAt") < now() - make_interval(days => ${days}::int)
        ORDER BY "lastSeenAt" ASC
      `,
    );

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      lastSeenAt: row.lastSeenAt
        ? new Date(row.lastSeenAt).toISOString()
        : null,
    }));
  }

  /**
   * TENANT — raw cohort activity rows: each user's first-activity bucket
   * (cohort) and every bucket they were active in, with the retained count.
   * Buckets are TZ-aware; the service assembles the retention array.
   * Demo users are always excluded. Throws when the org is missing.
   */
  async getCohortActivityByOrganization(
    organizationId: string,
    query: ICohortRetentionQuery,
  ): Promise<ICohortActivityRow[]> {
    const org = assertOrganizationScope(organizationId);
    return this.getCohortActivity(query, org);
  }

  /** GLOBAL — same cohort rows, explicit no-org filter (includes null-org). */
  async getCohortActivityGlobal(
    query: ICohortRetentionQuery,
  ): Promise<ICohortActivityRow[]> {
    return this.getCohortActivity(query, null);
  }

  private async getCohortActivity(
    { tz, granularity, fromDate, toDate }: ICohortRetentionQuery,
    organizationId: string | null,
  ): Promise<ICohortActivityRow[]> {
    const { trunc } = CALENDAR_UNIT_SQL[granularity];

    const rows = await this.prisma.$queryRaw<
      Array<{ cohort: string; bucket: string; retained: number }>
    >(
      Prisma.sql`
        WITH activity AS (
          SELECT ual."userId" AS user_id,
                 date_trunc(${Prisma.raw(trunc)}, ual."createdAt" AT TIME ZONE ${tz}) AS bucket
          FROM "UserActivityLog" ual
          INNER JOIN "User" u ON u.id = ual."userId"
          WHERE u."isDemo" = false
            ${
              organizationId
                ? Prisma.sql`AND ual."organizationId" = ${organizationId}`
                : Prisma.empty
            }
            ${
              fromDate
                ? Prisma.sql`AND ual."createdAt" >= ${fromDate.toISOString()}::timestamptz`
                : Prisma.empty
            }
            ${
              toDate
                ? Prisma.sql`AND ual."createdAt" < ${toDate.toISOString()}::timestamptz`
                : Prisma.empty
            }
          GROUP BY 1, 2
        ),
        cohorts AS (
          SELECT user_id, MIN(bucket) AS cohort
          FROM activity
          GROUP BY 1
        )
        SELECT to_char(c.cohort, 'YYYY-MM-DD') AS cohort,
               to_char(a.bucket, 'YYYY-MM-DD') AS bucket,
               COUNT(DISTINCT a.user_id)::int AS retained
        FROM activity a
        INNER JOIN cohorts c ON c.user_id = a.user_id
        GROUP BY 1, 2
        ORDER BY 1 ASC, 2 ASC
      `,
    );

    return rows.map((row) => ({
      cohort: row.cohort,
      bucket: row.bucket,
      retained: Number(row.retained),
    }));
  }

  /**
   * Shared TZ-aware calendar window predicate. The window is anchored on the
   * reference instant truncated to `unit` in `tz` and spans `periods` calendar
   * periods. Boundaries are built in local wall-clock and converted back with
   * `AT TIME ZONE tz`, so DST transitions inside the window are handled (a
   * 7-day window across a DST change has 167/169 real hours). Always excludes
   * demo users.
   */
  private buildCalendarWindow({
    tz,
    unit,
    periods,
    referenceDate,
    organizationId,
  }: {
    tz: string;
    unit: ActivityCalendarUnit;
    periods: number;
    referenceDate?: Date;
    organizationId: string | null;
  }): Prisma.Sql {
    const { trunc, interval } = CALENDAR_UNIT_SQL[unit];
    const safePeriods = Math.max(1, Math.trunc(periods));
    const reference = (referenceDate ?? new Date()).toISOString();

    return Prisma.sql`
      u."isDemo" = false
      AND ual."createdAt" >= (
        date_trunc(${Prisma.raw(trunc)}, ${reference}::timestamptz AT TIME ZONE ${tz})
        - (${safePeriods}::int - 1) * ${Prisma.raw(interval)}::interval
      ) AT TIME ZONE ${tz}
      AND ual."createdAt" < (
        date_trunc(${Prisma.raw(trunc)}, ${reference}::timestamptz AT TIME ZONE ${tz})
        + ${Prisma.raw(interval)}::interval
      ) AT TIME ZONE ${tz}
      ${
        organizationId
          ? Prisma.sql`AND ual."organizationId" = ${organizationId}`
          : Prisma.empty
      }
    `;
  }

  private buildFindWhere({
    action,
    userId,
    fromDate,
    toDate,
    cursorDate,
    cursorId,
  }: Omit<FindGlobalParams, "take">): any {
    const where: any = {};

    if (action) where.action = { contains: action };
    if (userId) where.userId = userId;

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) where.createdAt.lte = new Date(toDate);
    }

    if (cursorDate && cursorId) {
      where.OR = [
        { createdAt: { lt: cursorDate } },
        { createdAt: cursorDate, id: { lt: cursorId } },
      ];
    }

    return where;
  }

  private findManyWithUser(where: any, take: number): Promise<any[]> {
    return this.prisma.userActivityLog.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take,
      include: {
        user: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  /**
   * Internal stats aggregation. `organizationId === null` means an EXPLICIT
   * global call (`getGlobalStats`); it is never reached from a tenant read
   * because `getStatsByOrganization` asserts the scope before delegating.
   */
  private async getStatsInternal(
    organizationId: string | null,
    { fromDate, toDate, userId }: IActivityStatsQuery,
  ): Promise<IActivityStats> {
    const where: any = {};
    if (userId) where.userId = userId;
    if (organizationId) where.organizationId = organizationId;
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) where.createdAt.lte = new Date(toDate);
    }

    const [totalActions, actionsByType, topUsersRaw, dailyTrend] =
      await Promise.all([
        this.prisma.userActivityLog.count({ where }),
        this.prisma.userActivityLog.groupBy({
          by: ["action"],
          _count: { id: true },
          where,
          orderBy: { _count: { id: "desc" } },
          take: 20,
        }),
        this.prisma.userActivityLog.groupBy({
          by: ["userId"],
          _count: { id: true },
          where,
          orderBy: { _count: { id: "desc" } },
          take: 10,
        }),
        this.getDailyTrend({ fromDate, toDate, userId, organizationId }),
      ]);

    const userIds = topUsersRaw.map((u) => u.userId);
    const users =
      userIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, fullName: true },
          })
        : [];
    const userMap = new Map(users.map((u) => [u.id, u.fullName]));

    return {
      totalActions,
      topUsers: topUsersRaw.map((u) => ({
        userId: u.userId,
        userName: userMap.get(u.userId) || "Unknown",
        actionCount: u._count.id,
      })),
      actionsByType: actionsByType.map((a) => ({
        action: a.action,
        count: a._count.id,
      })),
      dailyTrend,
    };
  }

  /**
   * Real per-day bucket counts using `date_trunc` over `createdAt`.
   * Returns an empty array for an empty period (spec allows empty/zero-filled).
   */
  private async getDailyTrend({
    fromDate,
    toDate,
    userId,
    organizationId,
  }: {
    fromDate?: string;
    toDate?: string;
    userId?: string;
    organizationId: string | null;
  }): Promise<Array<{ date: string; count: number }>> {
    const from = fromDate ? new Date(fromDate) : new Date(0);
    const to = toDate ? new Date(toDate) : new Date();

    const rows = await this.prisma.$queryRaw<Array<{ date: string; count: number }>>(
      Prisma.sql`
        SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS date,
               COUNT(*)::int AS count
        FROM "UserActivityLog"
        WHERE "createdAt" >= ${from} AND "createdAt" <= ${to}
        ${userId ? Prisma.sql`AND "userId" = ${userId}` : Prisma.empty}
        ${
          organizationId
            ? Prisma.sql`AND "organizationId" = ${organizationId}`
            : Prisma.empty
        }
        GROUP BY 1
        ORDER BY 1 ASC
      `,
    );

    return rows.map((row) => ({ date: row.date, count: Number(row.count) }));
  }
}
