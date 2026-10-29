import {
  Controller,
  Get,
  Req,
  UseGuards,
  Param,
  Query,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { DashboardService } from "./dashboard.service";
import { buildSidebarSections } from "./sidebar.helper";
import { SessionAuthGuard } from "../auth/guards/authenticated.guard";
import type { RequestWithUser } from "src/shared/types/server.type";
import { AdminAnalyticsService } from "./service/admin-analytics.service";
import { UserDetailService } from "./service/user-detail.service";
import {
  AdoptionAnalyticsService,
  IAdoptionActiveUsersQuery,
  IAdoptionCohortQuery,
  IAdoptionDormantQuery,
} from "./service/adoption-analytics.service";
import { PrismaService } from "nestjs-prisma";
import { Logger } from "@nestjs/common";
import { EntitlementService } from "../permit/service/entitlement.service";
import type { ResolvedEntitlements } from "../permit/service/entitlement-resolver";
import { OrganizationScopeService } from "src/shared/services/organization-scope.service";
const logger = new Logger("dashboard.controller");

/** Resolved adoption read scope: platform-global or a concrete tenant org. */
type AdoptionScope =
  | { kind: "global"; organizationId: null }
  | { kind: "org"; organizationId: string };

@Controller("api/dashboard")
export class DashboardController {
  /**
   * Shared tenant-isolation rule for the `x-workspace-id` header (S6).
   * Instantiated with the Prisma client this controller already holds (the
   * constructor arity is frozen by the existing specs).
   */
  private readonly organizationScope: OrganizationScopeService;

  constructor(
    private readonly dashboardService: DashboardService,
    private readonly adminAnalyticsService: AdminAnalyticsService,
    private readonly userDetailService: UserDetailService,
    private readonly adoptionAnalyticsService: AdoptionAnalyticsService,
    private readonly prisma: PrismaService,
    private readonly entitlementService: EntitlementService,
  ) {
    this.organizationScope = new OrganizationScopeService(this.prisma);
  }

  /**
   * Obtiene el organizationId del request.
   *
   * Regla compartida (S6): el header `x-workspace-id` solo tiene efecto si
   * el usuario es miembro ACTIVE de esa organización. Un header ajeno degrada
   * a la organización propia del usuario (o al contexto personal) y nunca
   * llega a una consulta.
   * Si el usuario es SUPERADMIN/ADMIN, el header se respeta (alcance global).
   */
  private async getOrganizationId(request: RequestWithUser): Promise<string | null> {
    const user = request.user;
    if (!user) {
      logger.log('[getOrganizationId] No user found');
      return null;
    }

    logger.log(`[getOrganizationId] User: ${user.email}, permit: ${user.permits?.name}`);

    const requestedOrganizationId =
      (request.headers["x-workspace-id"] as string | undefined) ?? null;
    logger.log(`[getOrganizationId] Requested workspace header: ${requestedOrganizationId}`);

    const { organizationId, isGlobalRole } =
      await this.organizationScope.resolveOrganizationScope({
        user: { id: user.id, permits: user.permits },
        requestedOrganizationId,
        unauthorizedFallback: "own-membership",
        missingFallback: "own-membership",
      });

    logger.log(
      `[getOrganizationId] Effective organization: ${organizationId} (global role: ${isGlobalRole})`,
    );

    return organizationId;
  }

  /**
   * Resolves user entitlements for the request if not already populated on request.user.
   */
  private async getOrResolveEntitlements(
    request: RequestWithUser,
  ): Promise<ResolvedEntitlements | undefined> {
    const user = request.user;
    if (!user) return undefined;
    if (user.entitlements) return user.entitlements;

    const workspaceId =
      (request.headers["x-workspace-id"] as string | undefined) ?? null;
    return this.entitlementService.resolve(user.id, workspaceId, user);
  }

  /**
   * Resolves the adoption read scope and enforces gating (design D4/D7).
   *
   * - `?scope=global` is allowed ONLY for `SUPERADMIN`/`ADMIN` (role check, no
   *   new permit key) and reads platform-wide.
   * - Org scope (the default) requires the `PERMIT_DASHBOARD` permit AND a
   *   resolvable organization. A tenant without an org is REJECTED — it NEVER
   *   falls back to global.
   */
  private async resolveAdoptionScope(
    request: RequestWithUser,
    scope?: string,
  ): Promise<AdoptionScope> {
    const user = request.user;
    if (!user) {
      throw new UnauthorizedException("No autorizado");
    }

    if (scope === "global") {
      if (!this.isGlobalRole(user)) {
        throw new ForbiddenException(
          "El alcance global requiere rol SUPERADMIN o ADMIN",
        );
      }
      return { kind: "global", organizationId: null };
    }

    const entitlements = await this.getOrResolveEntitlements(request);

    if (!this.hasDashboardPermit(user, entitlements)) {
      throw new ForbiddenException("Permiso de dashboard requerido");
    }

    const organizationId = await this.getOrganizationId(request);
    if (!organizationId) {
      throw new ForbiddenException(
        "Workspace context required: no organization could be resolved",
      );
    }

    return { kind: "org", organizationId };
  }

  /** Global-role check: `SUPERADMIN`/`ADMIN` (not a permit). */
  private isGlobalRole(user: RequestWithUser["user"]): boolean {
    return (
      user.permits?.name === "SUPERADMIN" || user.permits?.name === "ADMIN"
    );
  }

  /** Org adoption gate: the existing `PERMIT_DASHBOARD` permit. */
  private hasDashboardPermit(
    user: RequestWithUser["user"],
    entitlements?: ResolvedEntitlements,
  ): boolean {
    const permissions = entitlements?.permissions ?? user.permits?.list;
    return permissions?.includes("PERMIT_DASHBOARD") ?? false;
  }

  /** Parses a positive integer query param; returns `undefined` when invalid. */
  private parsePositiveInt(value?: string): number | undefined {
    if (value === undefined || value === null || value === "") return undefined;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
    return Math.trunc(parsed);
  }

  /** Parses a date query param; returns `undefined` when invalid. */
  private parseDate(value?: string): Date | undefined {
    if (!value) return undefined;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  @Get("/stats")
  @UseGuards(SessionAuthGuard)
  async getStatsJson(@Req() request: RequestWithUser) {
    const user = request.user;
    if (!user) {
      throw new UnauthorizedException("No autorizado");
    }

    const organizationId = await this.getOrganizationId(request);

    // T26: on this endpoint a null organization means PLATFORM-WIDE, not the
    // caller's personal scope. Only a global role may read platform-wide
    // statistics; a tenant without a resolvable organization is rejected
    // instead of receiving them. Same rule as `resolveAdoptionScope`.
    if (!organizationId && !this.isGlobalRole(user)) {
      throw new ForbiddenException(
        "Workspace context required: no organization could be resolved",
      );
    }

    return this.adminAnalyticsService.getDashboardStats(organizationId);
  }

  @Get("/sidebar")
  @UseGuards(SessionAuthGuard)
  private async sidebar(@Req() request: RequestWithUser) {
    const user = request.user;
    if (!user) return { sections: [] };

    console.log('[SIDEBAR DEBUG] User:', user?.email, 'ID:', user?.id);

    const entitlements = await this.getOrResolveEntitlements(request);

    console.log('[SIDEBAR DEBUG] Resolved Entitlements:', JSON.stringify(entitlements));

    // Shared with `InjectUserInterceptor` so both sidebar build sites cannot
    // drift (task 3.4).
    const sections = await buildSidebarSections(
      this.dashboardService,
      user,
      entitlements,
    );
    return { sections };
  }

  @Get("/tabs")
  @UseGuards(SessionAuthGuard)
  private async tabs(@Req() request: RequestWithUser) {
    const user = request.user;
    if (!user) return { sections: [] };

    const resolved = await this.getOrResolveEntitlements(request);
    const permits = resolved?.permissions ?? user.permits?.list ?? [];
    const modules = resolved?.modules?.map((m) => m.key) ?? [];
    const hasAdminAccess =
      permits.includes("USER_LIST") || permits.includes("PERMIT_DASHBOARD");
    const isGlobalRole =
      user.permits?.name === "SUPERADMIN" || user.permits?.name === "ADMIN";
    const sections = hasAdminAccess
      ? this.dashboardService.getTabs({
          id: user.id,
          permits,
          modules,
          isGlobalRole,
        })
      : this.dashboardService.getUserTabs({
          id: user.id,
          permits,
        });
    return { sections };
  }

  @Get("/users/:id")
  @UseGuards(SessionAuthGuard)
  async getUserDetail(@Req() request: RequestWithUser, @Param("id") id: string) {
    const detail = await this.userDetailService.getUserDetail(id);
    if (!detail) {
      return { error: "Usuario no encontrado" };
    }
    return detail;
  }

  @Get("/locations")
  @UseGuards(SessionAuthGuard)
  async getOfficeLocations(@Req() request: RequestWithUser) {
    const user = request.user;
    if (!user) return { list: [] };

    const resolved = await this.getOrResolveEntitlements(request);
    const permits = resolved?.permissions ?? user.permits?.list ?? [];
    const hasAdminAccess =
      permits.includes("USER_LIST") ||
      permits.includes("PERMIT_DASHBOARD");
    if (!hasAdminAccess) {
      return { list: [] };
    }
    return this.adminAnalyticsService.getOfficeLocations();
  }

  // ---------------------------------------------------------------------------
  // Adoption analytics (design `dashboard-adopcion`, Phase 4)
  // ---------------------------------------------------------------------------

  /**
   * DAU/WAU/MAU (calendar day, trailing 1/7/30 days). `?scope=global` reads all
   * nutritionists (SUPERADMIN/ADMIN only); otherwise org-scoped and gated by the
   * dashboard permit. Optional `?tz=` overrides `ADOPTION_TZ`.
   */
  @Get("/adoption/active-users")
  @UseGuards(SessionAuthGuard)
  async getAdoptionActiveUsers(
    @Req() request: RequestWithUser,
    @Query("scope") scope?: string,
    @Query("tz") tz?: string,
  ) {
    const resolved = await this.resolveAdoptionScope(request, scope);
    const query: IAdoptionActiveUsersQuery = { tz };
    return resolved.kind === "global"
      ? this.adoptionAnalyticsService.getActiveUsersGlobal(query)
      : this.adoptionAnalyticsService.getActiveUsers(
          resolved.organizationId,
          query,
        );
  }

  /** Dormant users (idle >= 30 days, FIXED) + per-user login frequency. */
  @Get("/adoption/dormant")
  @UseGuards(SessionAuthGuard)
  async getAdoptionDormant(
    @Req() request: RequestWithUser,
    @Query("scope") scope?: string,
    @Query("windowDays") windowDays?: string,
  ) {
    const resolved = await this.resolveAdoptionScope(request, scope);
    const query: IAdoptionDormantQuery = {
      windowDays: this.parsePositiveInt(windowDays),
    };
    return resolved.kind === "global"
      ? this.adoptionAnalyticsService.getDormantUsersGlobal(query)
      : this.adoptionAnalyticsService.getDormantUsers(
          resolved.organizationId,
          query,
        );
  }

  /** Cohort retention (first-activity cohorts, week/month). */
  @Get("/adoption/cohorts")
  @UseGuards(SessionAuthGuard)
  async getAdoptionCohorts(
    @Req() request: RequestWithUser,
    @Query("scope") scope?: string,
    @Query("granularity") granularity?: string,
    @Query("periods") periods?: string,
    @Query("tz") tz?: string,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
  ) {
    const resolved = await this.resolveAdoptionScope(request, scope);
    const query: IAdoptionCohortQuery = {
      granularity:
        granularity === "month" || granularity === "week"
          ? granularity
          : undefined,
      periods: this.parsePositiveInt(periods),
      tz,
      fromDate: this.parseDate(fromDate),
      toDate: this.parseDate(toDate),
    };
    return resolved.kind === "global"
      ? this.adoptionAnalyticsService.getCohortRetentionGlobal(query)
      : this.adoptionAnalyticsService.getCohortRetention(
          resolved.organizationId,
          query,
        );
  }

  /** Clinical funnel patient -> anamnesis -> anthropometry -> consultation -> plan. */
  @Get("/adoption/funnel")
  @UseGuards(SessionAuthGuard)
  async getAdoptionFunnel(
    @Req() request: RequestWithUser,
    @Query("scope") scope?: string,
  ) {
    const resolved = await this.resolveAdoptionScope(request, scope);
    return resolved.kind === "global"
      ? this.adoptionAnalyticsService.getClinicalFunnelGlobal()
      : this.adoptionAnalyticsService.getClinicalFunnel(
          resolved.organizationId,
        );
  }

  /** Feature depth (calculators, menus, exchange lists). */
  @Get("/adoption/depth")
  @UseGuards(SessionAuthGuard)
  async getAdoptionDepth(
    @Req() request: RequestWithUser,
    @Query("scope") scope?: string,
  ) {
    const resolved = await this.resolveAdoptionScope(request, scope);
    return resolved.kind === "global"
      ? this.adoptionAnalyticsService.getFeatureDepthGlobal()
      : this.adoptionAnalyticsService.getFeatureDepth(
          resolved.organizationId,
        );
  }
}
