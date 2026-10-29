/**
 * Adoption analytics response contracts (design `dashboard-adopcion`).
 *
 * All metrics are org-scoped unless the caller is `SUPERADMIN`/`ADMIN`
 * requesting the global variant. Timestamps are stored in UTC (`timestamptz`)
 * and bucketed TZ-aware; `tz` defaults to `ADOPTION_TZ` (America/Caracas) and
 * may be overridden per request via the `?tz=` query param.
 */

/**
 * `GET /dashboard/api/adoption/active-users?scope=org|global&tz=America/Caracas`
 */
export interface IAdoptionActiveUsers {
  tz: string;
  asOf: string;
  dau: number;
  wau: number;
  mau: number;
}

/**
 * `GET /dashboard/api/adoption/dormant`
 * `days` is FIXED at 30 in this first release (design DC).
 *
 * `logins` is the per-user login frequency: the number of sessions started
 * within the dormant outer window. It is an ADDITIVE extension of the design
 * contract, required by the "Dormant users and login frequency" spec
 * requirement (the design DTO only listed `lastSeenAt`).
 */
export interface IDormantUsers {
  days: 30;
  count: number;
  users: Array<{
    id: string;
    name: string;
    lastSeenAt: string | null;
    logins: number;
  }>;
}

/** `GET /dashboard/api/adoption/funnel` */
export interface IClinicalFunnel {
  stages: Array<{
    key:
      | "patients"
      | "anamnesis"
      | "anthropometry"
      | "consultation"
      | "plan";
    count: number;
    conversionFromPrevious: number;
    conversionFromFirst: number;
  }>;
}

/**
 * `GET /dashboard/api/adoption/cohorts?granularity=week|month&tz=America/Caracas`
 * `retention[i]` is the percentage (0-100) of the cohort retained `i` periods
 * after its first-activity bucket; `retention[0]` is always 100 for a non-empty
 * cohort.
 */
export interface ICohortRetention {
  granularity: "week" | "month";
  cohorts: Array<{ cohort: string; size: number; retention: number[] }>;
}

/** `GET /dashboard/api/adoption/depth` */
export interface IFeatureDepth {
  calculators: number;
  menus: number;
  exchangeLists: number;
}
