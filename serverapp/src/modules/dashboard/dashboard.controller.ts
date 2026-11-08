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
import {
  buildSidebarSections,
  resolveOrganizationSlug,
} from "./sidebar.helper";
import { SessionAuthGuard } from "../auth/guards/authenticated.guard";
import type { RequestWithUser } from "src/shared/types/server.type";
import { UserDetailService } from "./service/user-detail.service";
import { PrismaService } from "nestjs-prisma";
import { Logger } from "@nestjs/common";
import { EntitlementService } from "../permit/service/entitlement.service";
import type { ResolvedEntitlements } from "../permit/service/entitlement-resolver";
import { OrganizationScopeService } from "src/shared/services/organization-scope.service";
import { startOfDayInZone } from "src/shared/utils/day-boundary";
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

  /**
   * Platform-wide ERP numbers for the admin panel (analytics rewrite):
   * real counts only — organizations, users (total, active today and new
   * today), the latest sign-ups, active subscriptions per plan and the MRR
   * those subscriptions add up to. Global roles only.
   */
  @Get("/platform-stats")
  @UseGuards(SessionAuthGuard)
  async getPlatformStats(@Req() request: RequestWithUser) {
    const user = request.user;
    if (!user) {
      throw new UnauthorizedException("No autorizado");
    }
    if (!this.isGlobalRole(user)) {
      throw new ForbiddenException(
        "Las métricas de plataforma son solo para roles globales.",
      );
    }

    // "Today" is the business day, not the server's UTC day.
    const timeZone = process.env.BILLING_TIMEZONE || "America/Caracas";
    const startOfToday = startOfDayInZone(new Date(), timeZone);

    const [organizations, users, activeToday, newToday, recentUsers, subscriptions] =
      await Promise.all([
        this.prisma.organization.count(),
        this.prisma.user.count({ where: { deletedAt: null } }),
        this.prisma.userSession.findMany({
          where: {
            deletedAt: null,
            startedAt: { gte: startOfToday },
          },
          select: { userId: true },
          distinct: ["userId"],
        }),
        this.prisma.user.count({
          where: { deletedAt: null, createdAt: { gte: startOfToday } },
        }),
        this.prisma.user.findMany({
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            fullName: true,
            email: true,
            status: true,
            createdAt: true,
            permits: { select: { name: true } },
          },
        }),
        this.prisma.subscription.findMany({
          where: { status: "ACTIVE" },
          include: { plan: { select: { id: true, name: true, price: true } } },
        }),
      ]);

    const byPlan = new Map<
      string,
      { planId: string; name: string; priceUSD: number; count: number }
    >();
    let mrrUSD = 0;
    for (const subscription of subscriptions) {
      const price = Number(subscription.plan.price ?? 0);
      mrrUSD += price;
      const row =
        byPlan.get(subscription.plan.id) ??
        {
          planId: subscription.plan.id,
          name: subscription.plan.name,
          priceUSD: price,
          count: 0,
        };
      row.count += 1;
      byPlan.set(subscription.plan.id, row);
    }

    return {
      organizations,
      users,
      activeUsersToday: activeToday.length,
      newUsersToday: newToday,
      recentUsers: recentUsers.map((row) => ({
        id: row.id,
        name:
          row.fullName?.trim() ||
          `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim() ||
          row.email,
        email: row.email,
        status: row.status,
        createdAt: row.createdAt,
        permitName: row.permits?.name ?? null,
      })),
      activeSubscriptions: subscriptions.length,
      mrrUSD: Math.round(mrrUSD * 100) / 100,
      plans: [...byPlan.values()].sort((a, b) =>
        a.planId.localeCompare(b.planId),
      ),
    };
  }

  @Get("/sidebar")
  @UseGuards(SessionAuthGuard)
  private async sidebar(@Req() request: RequestWithUser) {
    const user = request.user;
    if (!user) return { sections: [] };

    const entitlements = await this.getOrResolveEntitlements(request);

    // Shared with `InjectUserInterceptor` so both sidebar build sites cannot
    // drift (task 3.4). The resolved workspace drives tenant-only entries
    // like the delivery routes (S8) and the public storefront URL.
    const organizationId = await this.getOrganizationId(request);
    // Only a CATALOG_ONLINE workspace renders a shop entry; skip the lookup
    // for every other tenant.
    const organizationSlug = (entitlements?.modules ?? []).some(
      (module) => module.key === "CATALOG_ONLINE",
    )
      ? await resolveOrganizationSlug(this.prisma, organizationId)
      : null;
    const sections = await buildSidebarSections(
      this.dashboardService,
      user,
      entitlements,
      organizationId,
      organizationSlug,
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


}
