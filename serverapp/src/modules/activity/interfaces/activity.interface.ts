export interface IUserActivityLog {
  id: string;
  userId: string;
  action: string;
  description?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: any;
  eventName?: string | null;
  category?: string | null;
  organizationId?: string | null;
  source?: string | null;
  eventVersion?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  user?: { id: string; fullName: string; email: string };
}

export interface IActivityFeedQuery {
  action?: string;
  userId?: string;
  fromDate?: string;
  toDate?: string;
  /**
   * Tenant scope. When present, reads filter `organizationId = X` STRICTLY and
   * never return null-org rows. Omit only for platform-global (SUPERADMIN) views.
   */
  organizationId?: string;
}

export interface IActivityStatsQuery {
  fromDate?: string;
  toDate?: string;
  userId?: string;
  /** Tenant scope — same semantics as `IActivityFeedQuery.organizationId`. */
  organizationId?: string;
}

export interface IActivityStats {
  totalActions: number;
  topUsers: Array<{ userId: string; userName: string; actionCount: number }>;
  actionsByType: Array<{ action: string; count: number }>;
  dailyTrend: Array<{ date: string; count: number }>;
}

/** Calendar granularity for TZ-aware adoption bucketing. */
export type ActivityCalendarUnit = "day" | "week" | "month";

/**
 * TZ-aware calendar window for distinct-active-user counts. The window is
 * anchored on `referenceDate` truncated to `unit` in `tz` and spans `periods`
 * calendar periods ending at that bucket (DAU/WAU/MAU = `day` with 1/7/30).
 */
export interface ICalendarActiveUsersQuery {
  /** IANA timezone used to bucket activity (e.g. `America/Caracas`). */
  tz: string;
  /** Calendar granularity of the window buckets. */
  unit: ActivityCalendarUnit;
  /** Number of calendar periods in the window (>= 1). */
  periods: number;
  /** Reference instant; defaults to the current time when omitted. */
  referenceDate?: Date;
}

/** A calendar bucket with its distinct-active-user count. */
export interface ICalendarActiveUsersBucket {
  /** Bucket start in `YYYY-MM-DD` (week/month bucket = its first local day). */
  bucket: string;
  count: number;
}

/**
 * Dormant-user query. `dormantDays` is FIXED at 30 in this first release
 * (design DC); `windowDays` is the outer lookback — users idle longer than it
 * are considered churned, not dormant.
 */
export interface IDormantUsersQuery {
  /** Idle threshold in days. */
  dormantDays: number;
  /** Outer lookback in days. Omit to include every user with any activity. */
  windowDays?: number;
}

/** A dormant user and the instant of their last activity. */
export interface IDormantUser {
  id: string;
  name: string;
  lastSeenAt: string | null;
}

/** Dormant-user report (demo users excluded). */
export interface IDormantUsers {
  days: number;
  count: number;
  users: IDormantUser[];
}

/**
 * Cohort-retention query. Cohorts are assigned by first-activity bucket in
 * `tz`; `periods` bounds the reported retention offsets (0..periods-1). The
 * optional UTC bounds limit the activity scan (bounded-cohort approximation).
 */
export interface ICohortRetentionQuery {
  tz: string;
  granularity: "week" | "month";
  /** Number of retention periods to report. */
  periods: number;
  /** Optional lower bound (UTC) for the activity scan. */
  fromDate?: Date;
  /** Optional upper bound (UTC) for the activity scan. */
  toDate?: Date;
}

/** Raw cohort activity row: cohort bucket + activity bucket + retained count. */
export interface ICohortActivityRow {
  cohort: string;
  bucket: string;
  retained: number;
}

/** Assembled cohort retention: cohort size + retained count per period offset. */
export interface ICohortRetention {
  cohort: string;
  size: number;
  retention: number[];
}

export interface IPaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
}

/**
 * Query params shared by BOTH the tenant (`findByOrganization`) and global
 * (`findGlobal`) repository reads. It deliberately carries NO `organizationId`:
 * the scope is expressed by WHICH method you call, never by an optional field
 * that could silently degrade a tenant read into a global one.
 */
export interface FindGlobalParams {
  action?: string;
  userId?: string;
  fromDate?: string;
  toDate?: string;
  cursorDate?: Date;
  cursorId?: string;
  take: number;
}
