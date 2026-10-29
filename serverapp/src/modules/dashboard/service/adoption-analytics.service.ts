import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "nestjs-prisma";
import { OrganizationMemberStatus, Prisma } from "@prisma/client";

import {
  ActivityService,
  DEFAULT_DORMANT_WINDOW_DAYS,
  DORMANT_DAYS_FIXED,
} from "../../activity/services/activity.service";
import { MissingOrganizationScopeError } from "../../activity/repositories/user-activity-log.repository";
import type {
  IAdoptionActiveUsers,
  IClinicalFunnel,
  ICohortRetention,
  IDormantUsers,
  IFeatureDepth,
} from "../dto/adoption.type";

/** Env key holding the business timezone used to bucket adoption metrics. */
export const ADOPTION_TZ_ENV = "ADOPTION_TZ";

/** Fallback timezone when `ADOPTION_TZ` is unset or blank. */
export const DEFAULT_ADOPTION_TZ = "America/Caracas";

/** Default number of weekly retention periods reported when unspecified. */
const DEFAULT_WEEK_COHORT_PERIODS = 8;

/** Default number of monthly retention periods reported when unspecified. */
const DEFAULT_MONTH_COHORT_PERIODS = 12;

/** Optional parameters for the DAU/WAU/MAU snapshot. */
export interface IAdoptionActiveUsersQuery {
  /** Per-request TZ override; falls back to `ADOPTION_TZ`. */
  tz?: string | null;
  /** Reference instant; defaults to the current time. */
  referenceDate?: Date;
}

/** Optional parameters for the dormant-user report. */
export interface IAdoptionDormantQuery {
  /** Outer lookback in days; defaults to `DEFAULT_DORMANT_WINDOW_DAYS`. */
  windowDays?: number;
}

/** Optional parameters for cohort retention. */
export interface IAdoptionCohortQuery {
  /** Cohort granularity; defaults to `week`. */
  granularity?: "week" | "month";
  /** Number of retention periods; defaults to 8 (week) / 12 (month). */
  periods?: number;
  /** Per-request TZ override; falls back to `ADOPTION_TZ`. */
  tz?: string | null;
  /** Optional lower bound (UTC) for the activity scan. */
  fromDate?: Date;
  /** Optional upper bound (UTC) for the activity scan. */
  toDate?: Date;
}

type FunnelStageKey = IClinicalFunnel["stages"][number]["key"];

/** Clinical funnel stages, in order, from broadest to narrowest. */
const FUNNEL_STAGE_KEYS: readonly FunnelStageKey[] = [
  "patients",
  "anamnesis",
  "anthropometry",
  "consultation",
  "plan",
];

/**
 * Adoption analytics (design `dashboard-adopcion`).
 *
 * Computes the adoption dashboard metrics (DAU/WAU/MAU, dormant users, cohort
 * retention, clinical funnel, feature depth) on top of the telemetry foundation
 * delivered in `telemetria-adopcion`.
 *
 * Scope is expressed by WHICH method you call: the tenant methods take a
 * REQUIRED `organizationId` (asserted — never fall back to global), while the
 * `*Global` methods are explicitly platform-wide. `isDemo` users are excluded
 * in every metric (telemetry at the query level, clinical via the patient's
 * `createdBy`/`user`).
 */
@Injectable()
export class AdoptionAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Resolves the bucketing timezone: an explicit per-request `tz` override wins
   * over the `ADOPTION_TZ` env default, which falls back to
   * `America/Caracas` when unset or blank.
   */
  resolveTimezone(tzOverride?: string | null): string {
    const candidate = tzOverride?.trim();
    if (candidate) return candidate;

    const configured = this.config.get<string>(ADOPTION_TZ_ENV)?.trim();
    return configured || DEFAULT_ADOPTION_TZ;
  }

  // ---------------------------------------------------------------------------
  // 3.1 — DAU / WAU / MAU
  // ---------------------------------------------------------------------------

  /** Org-scoped DAU/WAU/MAU (calendar day, trailing 1/7/30 days). */
  async getActiveUsers(
    organizationId: string,
    query: IAdoptionActiveUsersQuery = {},
  ): Promise<IAdoptionActiveUsers> {
    return this.buildActiveUsers(
      this.assertOrganizationScope(organizationId),
      query,
    );
  }

  /** Global DAU/WAU/MAU (all nutritionists, including null-org). */
  async getActiveUsersGlobal(
    query: IAdoptionActiveUsersQuery = {},
  ): Promise<IAdoptionActiveUsers> {
    return this.buildActiveUsers(null, query);
  }

  private async buildActiveUsers(
    organizationId: string | null,
    query: IAdoptionActiveUsersQuery,
  ): Promise<IAdoptionActiveUsers> {
    const tz = this.resolveTimezone(query.tz);
    const referenceDate = query.referenceDate ?? new Date();

    const [dau, wau, mau] = await Promise.all([
      this.activityService.countActiveUsersInCalendarWindow(organizationId, {
        tz,
        unit: "day",
        periods: 1,
        referenceDate,
      }),
      this.activityService.countActiveUsersInCalendarWindow(organizationId, {
        tz,
        unit: "day",
        periods: 7,
        referenceDate,
      }),
      this.activityService.countActiveUsersInCalendarWindow(organizationId, {
        tz,
        unit: "day",
        periods: 30,
        referenceDate,
      }),
    ]);

    return { tz, asOf: referenceDate.toISOString(), dau, wau, mau };
  }

  // ---------------------------------------------------------------------------
  // 3.2 — Dormant users + login frequency
  // ---------------------------------------------------------------------------

  /** Org-scoped dormant users (idle >= 30 days) with per-user login counts. */
  async getDormantUsers(
    organizationId: string,
    query: IAdoptionDormantQuery = {},
  ): Promise<IDormantUsers> {
    return this.buildDormantUsers(
      this.assertOrganizationScope(organizationId),
      query,
    );
  }

  /** Global dormant report (all nutritionists, including null-org). */
  async getDormantUsersGlobal(
    query: IAdoptionDormantQuery = {},
  ): Promise<IDormantUsers> {
    return this.buildDormantUsers(null, query);
  }

  private async buildDormantUsers(
    organizationId: string | null,
    query: IAdoptionDormantQuery,
  ): Promise<IDormantUsers> {
    const windowDays = query.windowDays ?? DEFAULT_DORMANT_WINDOW_DAYS;
    const report = await this.activityService.getDormantUsers(organizationId, {
      windowDays,
    });

    const logins = await this.countLoginsByUser(
      organizationId,
      report.users.map((user) => user.id),
      windowDays,
    );

    return {
      days: DORMANT_DAYS_FIXED,
      count: report.count,
      users: report.users.map((user) => ({
        ...user,
        logins: logins.get(user.id) ?? 0,
      })),
    };
  }

  /**
   * Per-user session counts within the dormant outer window. Zero-safe: an
   * empty user list short-circuits without hitting the database.
   */
  private async countLoginsByUser(
    organizationId: string | null,
    userIds: string[],
    windowDays: number,
  ): Promise<Map<string, number>> {
    if (userIds.length === 0) return new Map<string, number>();

    const days = Math.max(0, Math.trunc(windowDays));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const rows = await this.prisma.userSession.groupBy({
      by: ["userId"],
      where: {
        userId: { in: userIds },
        startedAt: { gte: since },
        ...(organizationId ? { organizationId } : {}),
      },
      _count: { id: true },
    });

    return new Map(rows.map((row) => [row.userId, row._count.id]));
  }

  // ---------------------------------------------------------------------------
  // 3.3 — Cohort retention
  // ---------------------------------------------------------------------------

  /** Org-scoped cohort retention (first-activity cohorts, week/month). */
  async getCohortRetention(
    organizationId: string,
    query: IAdoptionCohortQuery = {},
  ): Promise<ICohortRetention> {
    return this.buildCohortRetention(
      this.assertOrganizationScope(organizationId),
      query,
    );
  }

  /** Global cohort retention (all nutritionists, including null-org). */
  async getCohortRetentionGlobal(
    query: IAdoptionCohortQuery = {},
  ): Promise<ICohortRetention> {
    return this.buildCohortRetention(null, query);
  }

  private async buildCohortRetention(
    organizationId: string | null,
    query: IAdoptionCohortQuery,
  ): Promise<ICohortRetention> {
    const granularity = query.granularity ?? "week";
    const defaultPeriods =
      granularity === "month"
        ? DEFAULT_MONTH_COHORT_PERIODS
        : DEFAULT_WEEK_COHORT_PERIODS;
    const periods = Math.max(1, Math.trunc(query.periods ?? defaultPeriods));
    const tz = this.resolveTimezone(query.tz);

    const cohorts = await this.activityService.getCohortRetention(
      organizationId,
      {
        tz,
        granularity,
        periods,
        fromDate: query.fromDate,
        toDate: query.toDate,
      },
    );

    // The activity layer returns raw retained COUNTS per offset; the spec
    // reports retention as retained/cohort size, so map each offset to a
    // percentage (zero-safe when the cohort is empty).
    return {
      granularity,
      cohorts: cohorts.map((cohort) => ({
        cohort: cohort.cohort,
        size: cohort.size,
        retention: cohort.retention.map((retained) =>
          this.toPercent(retained, cohort.size),
        ),
      })),
    };
  }

  // ---------------------------------------------------------------------------
  // 3.4 — Clinical funnel
  // ---------------------------------------------------------------------------

  /** Org-scoped clinical funnel patient -> anamnesis -> ... -> plan. */
  async getClinicalFunnel(organizationId: string): Promise<IClinicalFunnel> {
    return this.buildClinicalFunnel(
      this.assertOrganizationScope(organizationId),
    );
  }

  /** Global clinical funnel (all patients, including null-org). */
  async getClinicalFunnelGlobal(): Promise<IClinicalFunnel> {
    return this.buildClinicalFunnel(null);
  }

  private async buildClinicalFunnel(
    organizationId: string | null,
  ): Promise<IClinicalFunnel> {
    const counts = await this.computeFunnelCounts(organizationId);
    return this.toFunnel(counts);
  }

  /**
   * Distinct patients per stage, scoped through `Patient.organizationId`
   * (`Anamnesis`/`Anthropometry` have no organization of their own). Demo
   * patients (via `createdBy`/`user`) are excluded; unlinked ones are kept.
   */
  private async computeFunnelCounts(
    organizationId: string | null,
  ): Promise<number[]> {
    const base = this.patientScopeWhere(organizationId);

    const [patients, anamnesis, anthropometry, consultation, plan] =
      await Promise.all([
        this.prisma.patient.count({ where: base }),
        this.prisma.patient.count({
          where: { ...base, anamnesis: { isNot: null } },
        }),
        this.prisma.patient.count({
          where: { ...base, anthropometrics: { some: {} } },
        }),
        this.prisma.patient.count({
          where: { ...base, consultations: { some: {} } },
        }),
        this.prisma.patient.count({ where: { ...base, plans: { some: {} } } }),
      ]);

    return [patients, anamnesis, anthropometry, consultation, plan];
  }

  /**
   * Base patient scope: not soft-deleted, org filter only for tenant reads, and
   * demo exclusion that keeps unlinked patients (no `createdBy`/`user`).
   */
  private patientScopeWhere(
    organizationId: string | null,
  ): Prisma.PatientWhereInput {
    return {
      deletedAt: null,
      ...(organizationId ? { organizationId } : {}),
      AND: [
        { OR: [{ createdById: null }, { createdBy: { is: { isDemo: false } } }] },
        { OR: [{ userId: null }, { user: { is: { isDemo: false } } }] },
      ],
    };
  }

  /** Converts raw stage counts into the funnel DTO with zero-safe ratios. */
  private toFunnel(counts: number[]): IClinicalFunnel {
    const first = counts[0] ?? 0;

    const stages = FUNNEL_STAGE_KEYS.map((key, index) => {
      const count = counts[index] ?? 0;
      const previous = index === 0 ? count : (counts[index - 1] ?? 0);

      return {
        key,
        count,
        conversionFromPrevious:
          index === 0
            ? count > 0
              ? 100
              : 0
            : this.toPercent(count, previous),
        conversionFromFirst: this.toPercent(count, first),
      };
    });

    return { stages };
  }

  /** Percentage rounded to two decimals; zero-safe (never NaN/Infinity). */
  private toPercent(numerator: number, denominator: number): number {
    if (!denominator || denominator <= 0) return 0;
    return Math.round((numerator / denominator) * 10000) / 100;
  }

  // ---------------------------------------------------------------------------
  // 3.5 — Feature depth
  // ---------------------------------------------------------------------------

  /**
   * Org-scoped feature depth. `CalculatorUsage` has no `organizationId`, so it
   * is scoped by joining its user to an ACTIVE membership of the organization —
   * never a cross-tenant count.
   */
  async getFeatureDepth(organizationId: string): Promise<IFeatureDepth> {
    return this.buildFeatureDepth(
      this.assertOrganizationScope(organizationId),
    );
  }

  /** Global feature depth (all nutritionists, including null-org). */
  async getFeatureDepthGlobal(): Promise<IFeatureDepth> {
    return this.buildFeatureDepth(null);
  }

  private async buildFeatureDepth(
    organizationId: string | null,
  ): Promise<IFeatureDepth> {
    const [calculators, menus, exchangeLists] = await Promise.all([
      this.countCalculatorUsage(organizationId),
      this.prisma.menu.count({
        where: {
          deletedAt: null,
          archivedAt: null,
          ...(organizationId ? { organizationId } : {}),
          OR: [{ createdById: null }, { createdBy: { is: { isDemo: false } } }],
        },
      }),
      this.prisma.exchangeList.count({
        where: {
          deletedAt: null,
          archivedAt: null,
          ...(organizationId ? { organizationId } : {}),
          OR: [{ createdById: null }, { createdBy: { is: { isDemo: false } } }],
        },
      }),
    ]);

    return { calculators, menus, exchangeLists };
  }

  /**
   * Calculator usage count. Tenant reads require the usage's user to be an
   * ACTIVE member of the organization (the only isolation mechanism available,
   * since `CalculatorUsage` lacks `organizationId`); global reads keep unlinked
   * rows and exclude demo users.
   */
  private countCalculatorUsage(
    organizationId: string | null,
  ): Promise<number> {
    if (organizationId) {
      return this.prisma.calculatorUsage.count({
        where: {
          user: {
            is: {
              isDemo: false,
              organizationMembers: {
                some: {
                  organizationId,
                  status: OrganizationMemberStatus.ACTIVE,
                },
              },
            },
          },
        },
      });
    }

    return this.prisma.calculatorUsage.count({
      where: { OR: [{ userId: null }, { user: { is: { isDemo: false } } }] },
    });
  }

  // ---------------------------------------------------------------------------
  // Scope guard
  // ---------------------------------------------------------------------------

  /**
   * Asserts a tenant scope. Tenant reads NEVER degrade into a global query —
   * they throw instead of leaking cross-tenant data (design D4).
   */
  private assertOrganizationScope(organizationId?: string | null): string {
    if (!organizationId || organizationId.trim().length === 0) {
      throw new MissingOrganizationScopeError();
    }
    return organizationId;
  }
}
