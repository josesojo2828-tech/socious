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
import { PrismaService } from "nestjs-prisma";
import { Logger } from "@nestjs/common";
import { EntitlementService } from "../permit/service/entitlement.service";
import type { ResolvedEntitlements } from "../permit/service/entitlement-resolver";
import { OrganizationScopeService } from "src/shared/services/organization-scope.service";
const logger = new Logger("dashboard.controller");

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

  /** Global-role check: `SUPERADMIN`/`ADMIN` (not a permit). */
  private isGlobalRole(user: RequestWithUser["user"]): boolean {
    return (
      user.permits?.name === "SUPERADMIN" || user.permits?.name === "ADMIN"
    );
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

}
