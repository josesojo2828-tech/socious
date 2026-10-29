import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import UserActivityLogRepository from "../repositories/user-activity-log.repository";
import { WorkspaceContextService } from "src/shared/services/workspace-context.service";
import { hashIp, PII_HASH_SALT_ENV } from "src/shared/event/pii";
import {
  sanitizeDescription,
  sanitizeEventPayload,
} from "src/shared/event/payload-whitelist";
import type {
  FindGlobalParams,
  IActivityFeedQuery,
  IActivityStats,
  IActivityStatsQuery,
  ICalendarActiveUsersBucket,
  ICalendarActiveUsersQuery,
  ICohortActivityRow,
  ICohortRetention,
  ICohortRetentionQuery,
  IDormantUsers,
  IDormantUsersQuery,
  IPaginatedResponse,
  IUserActivityLog,
} from "../interfaces/activity.interface";

/** Dormant threshold in days — FIXED at 30 in this first release (design DC). */
export const DORMANT_DAYS_FIXED = 30;

/** Outer lookback for the dormant report (users idle longer are churned). */
export const DEFAULT_DORMANT_WINDOW_DAYS = 90;

@Injectable()
export class ActivityService {
  constructor(
    private readonly repo: UserActivityLogRepository,
    private readonly workspaceContext: WorkspaceContextService,
    private readonly config: ConfigService,
  ) {}

  async logActivity(data: {
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
    // PII minimization at the write boundary (task 5.1): hash the IP, strip
    // free text from the description and enforce the per-category payload
    // whitelist before anything reaches the database.
    await this.repo.create({
      ...data,
      description: sanitizeDescription(data.description),
      ipAddress: hashIp(data.ipAddress, this.piiSalt),
      metadata: sanitizeEventPayload(data.category ?? null, data.metadata),
      organizationId: this.resolveOrganizationId(data.organizationId),
    });
  }

  async getUserActivity(
    userId: string,
    cursor?: string,
    limit: number = 20,
    actionFilter?: string,
    organizationId?: string | null,
  ): Promise<IPaginatedResponse<IUserActivityLog>> {
    const { cursorDate, cursorId } = this.decodeCursor(cursor);
    const take = Math.min(limit, 50) + 1;
    const params: FindGlobalParams = {
      userId,
      action: actionFilter,
      cursorDate,
      cursorId,
      take,
    };

    // Explicit scope decision: a resolved org selects the tenant path; an
    // absent org (platform/global caller) selects the explicitly-named global
    // path. The repository never decides this — a tenant read without an org
    // throws instead of leaking global rows.
    const items = organizationId
      ? await this.repo.findByOrganization(organizationId, params)
      : await this.repo.findGlobal(params);

    return this.buildPaginatedResponse(items, take);
  }

  async getGlobalFeed(
    filters: IActivityFeedQuery,
    cursor?: string,
    limit: number = 20,
  ): Promise<IPaginatedResponse<IUserActivityLog>> {
    const { cursorDate, cursorId } = this.decodeCursor(cursor);
    const take = Math.min(limit, 50) + 1;
    const { organizationId, ...rest } = filters;
    const params: FindGlobalParams = { ...rest, cursorDate, cursorId, take };

    const items = organizationId
      ? await this.repo.findByOrganization(organizationId, params)
      : await this.repo.findGlobal(params);

    return this.buildPaginatedResponse(items, take);
  }

  async getActivityStats(filters: IActivityStatsQuery): Promise<IActivityStats> {
    const { organizationId, ...rest } = filters;

    return organizationId
      ? this.repo.getStatsByOrganization(organizationId, rest)
      : this.repo.getGlobalStats(rest);
  }

  /**
   * Distinct active users within a TZ-aware CALENDAR window. `organizationId`
   * selects the explicit scope: a resolved org uses the tenant path; `null`
   * (platform/global caller) uses the explicitly-named global path. A tenant
   * read without an org throws in the repository — it never falls back to
   * global. Demo users are excluded at the query level.
   */
  async countActiveUsersInCalendarWindow(
    organizationId: string | null,
    query: ICalendarActiveUsersQuery,
  ): Promise<number> {
    return organizationId
      ? this.repo.countDistinctActiveUsersInOrganizationCalendar(
          organizationId,
          query,
        )
      : this.repo.countDistinctActiveUsersGlobalCalendar(query);
  }

  /**
   * Distinct active users per calendar bucket (TZ-aware series) for the
   * requested window. Same explicit scope decision as
   * `countActiveUsersInCalendarWindow`. Only buckets with activity are
   * returned; callers zero-fill the missing periods.
   */
  async getActiveUsersCalendar(
    organizationId: string | null,
    query: ICalendarActiveUsersQuery,
  ): Promise<ICalendarActiveUsersBucket[]> {
    return organizationId
      ? this.repo.getCalendarActiveUsersByOrganization(organizationId, query)
      : this.repo.getCalendarActiveUsersGlobal(query);
  }

  /**
   * Dormant users (idle >= `DORMANT_DAYS_FIXED` = 30 days, FIXED in v1) within
   * the `windowDays` outer lookback. Same explicit scope decision as
   * `countActiveUsersInCalendarWindow`.
   */
  async getDormantUsers(
    organizationId: string | null,
    options?: { windowDays?: number },
  ): Promise<IDormantUsers> {
    const query: IDormantUsersQuery = {
      dormantDays: DORMANT_DAYS_FIXED,
      windowDays: options?.windowDays ?? DEFAULT_DORMANT_WINDOW_DAYS,
    };

    const users = organizationId
      ? await this.repo.findDormantUsersByOrganization(organizationId, query)
      : await this.repo.findDormantUsersGlobal(query);

    return { days: query.dormantDays, count: users.length, users };
  }

  /**
   * Cohort retention: users grouped by first-activity cohort (TZ-aware
   * week/month) with retained counts per period offset. Same explicit scope
   * decision as `countActiveUsersInCalendarWindow`.
   */
  async getCohortRetention(
    organizationId: string | null,
    query: ICohortRetentionQuery,
  ): Promise<ICohortRetention[]> {
    const rows = organizationId
      ? await this.repo.getCohortActivityByOrganization(organizationId, query)
      : await this.repo.getCohortActivityGlobal(query);

    return this.buildCohortRetention(rows, query.granularity, query.periods);
  }

  /**
   * Salt used to hash IPs (`sha256(ip + PII_HASH_SALT)`). A missing salt still
   * hashes but weakens the guarantee; configure it in every environment.
   */
  private get piiSalt(): string {
    return this.config.get<string>(PII_HASH_SALT_ENV)?.trim() ?? "";
  }

  /**
   * Resolves the org for a write: explicit value wins, otherwise the request
   * workspace context (`x-workspace-id`). Auth events with no workspace resolve
   * to null; the sentinel `"personal"` is treated as no org.
   */
  private resolveOrganizationId(explicit?: string | null): string | null {
    const candidate = explicit ?? this.workspaceContext.getWorkspaceId();
    if (!candidate || candidate === "personal") return null;
    return candidate;
  }

  private decodeCursor(
    cursor?: string,
  ): { cursorDate?: Date; cursorId?: string } {
    if (!cursor) return {};
    try {
      const decoded = Buffer.from(cursor, "base64").toString("utf-8");
      const [dateStr, id] = decoded.split("_");
      return { cursorDate: new Date(dateStr), cursorId: id };
    } catch {
      return {};
    }
  }

  /**
   * Assembles raw `(cohort, bucket, retained)` rows into one retention row per
   * cohort. `size` is the retained count at offset 0 (the cohort bucket);
   * `retention[i]` is the retained count `i` periods after the cohort, with
   * gaps zero-filled.
   */
  private buildCohortRetention(
    rows: ICohortActivityRow[],
    granularity: "week" | "month",
    periods: number,
  ): ICohortRetention[] {
    const length = Math.max(1, Math.trunc(periods));
    const byCohort = new Map<
      string,
      { size: number; retention: number[] }
    >();

    for (const row of rows) {
      const offset = this.cohortOffset(row.cohort, row.bucket, granularity);
      if (offset < 0 || offset >= length) continue;

      let entry = byCohort.get(row.cohort);
      if (!entry) {
        entry = { size: 0, retention: new Array<number>(length).fill(0) };
        byCohort.set(row.cohort, entry);
      }

      entry.retention[offset] = row.retained;
      if (offset === 0) entry.size = row.retained;
    }

    return Array.from(byCohort.entries())
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([cohort, entry]) => ({
        cohort,
        size: entry.size,
        retention: entry.retention,
      }));
  }

  /** Period offset between two `YYYY-MM-DD` buckets for the given granularity. */
  private cohortOffset(
    cohort: string,
    bucket: string,
    granularity: "week" | "month",
  ): number {
    if (granularity === "month") {
      const [cohortYear, cohortMonth] = cohort.split("-").map(Number);
      const [bucketYear, bucketMonth] = bucket.split("-").map(Number);
      return (bucketYear - cohortYear) * 12 + (bucketMonth - cohortMonth);
    }

    const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
    return Math.round(
      (Date.parse(`${bucket}T00:00:00Z`) -
        Date.parse(`${cohort}T00:00:00Z`)) /
        MS_PER_WEEK,
    );
  }

  private buildPaginatedResponse<T extends { id: string; createdAt: Date }>(
    items: T[],
    take: number,
  ): IPaginatedResponse<T> {
    const hasNext = items.length === take;
    const data = hasNext ? items.slice(0, take - 1) : items;
    const lastItem = data[data.length - 1];
    const nextCursor =
      lastItem && hasNext
        ? Buffer.from(
            `${lastItem.createdAt.toISOString()}_${lastItem.id}`,
          ).toString("base64")
        : null;

    return { data, nextCursor };
  }
}
