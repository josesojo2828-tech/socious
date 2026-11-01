export interface IActivityLog {
  id: string;
  userId: string;
  action: string;
  description?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
  /** Taxonomy event name; `null` on legacy/fallback rows. */
  eventName?: string | null;
  /** Taxonomy category (e.g. `clinical`, `auth.session`); `null` on legacy rows. */
  category?: string | null;
  /** Tenant scope; `null` for user-scoped auth events. */
  organizationId?: string | null;
  /** Origin channel: `web | mobile | api | system`. */
  source?: string | null;
  /** Taxonomy version (e.g. `v1`); `null` on legacy rows. */
  eventVersion?: string | null;
  createdAt: string;
  user?: { id: string; fullName: string; email: string } | null;
}

export interface IActivityFeedResponse {
  data: IActivityLog[];
  nextCursor: string | null;
}

export interface IActivityStats {
  totalActions: number;
  topUsers: Array<{ userId: string; userName: string; actionCount: number }>;
  actionsByType: Array<{ action: string; count: number }>;
  dailyTrend: Array<{ date: string; count: number }>;
}
