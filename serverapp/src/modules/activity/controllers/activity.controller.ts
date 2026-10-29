import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import { SessionAuthGuard } from "../../auth/guards/authenticated.guard";
import { WorkspaceContextService } from "src/shared/services/workspace-context.service";
import { OrganizationScopeService } from "src/shared/services/organization-scope.service";
import type { RequestWithUser } from "src/shared/types/server.type";
import { ActivityService } from "../services/activity.service";

@Controller("api")
@UseGuards(SessionAuthGuard)
export class ActivityController {
  /**
   * Shared tenant-isolation rule for the `x-workspace-id` header (S6).
   * Instantiated with the Prisma client this controller already holds (the
   * constructor arity is frozen by the existing specs).
   */
  private readonly organizationScope: OrganizationScopeService;

  constructor(
    private readonly activityService: ActivityService,
    private readonly workspaceContext: WorkspaceContextService,
    private readonly prisma: PrismaService,
  ) {
    this.organizationScope = new OrganizationScopeService(this.prisma);
  }

  /**
   * Resolves the tenant scope for activity reads.
   *
   * - SUPERADMIN/ADMIN are platform-global: they may read with a workspace
   *   header (scoped) or with none (global, null-org rows included).
   * - Every other caller is a TENANT and MUST be scoped to an organization.
   *   The org comes from the request workspace context (`x-workspace-id`,
   *   populated by the global `WorkspaceContextInterceptor`) or, failing that,
   *   from the user's active organization membership. A requested org is
   *   honored ONLY with an ACTIVE membership: a foreign org degrades to the
   *   caller's own membership org. If no org can be resolved the request is
   *   REJECTED — tenants never fall back to global.
   */
  private async resolveOrganizationId(
    request: RequestWithUser,
  ): Promise<string | null> {
    const user = request.user;
    if (!user) {
      throw new UnauthorizedException("No autorizado");
    }

    const requestedOrganizationId =
      this.workspaceContext.getWorkspaceId() ??
      ((request.headers["x-workspace-id"] as string | undefined) || null);

    const { organizationId, isGlobalRole } =
      await this.organizationScope.resolveOrganizationScope({
        user: { id: user.id, permits: user.permits },
        requestedOrganizationId,
        unauthorizedFallback: "own-membership",
        missingFallback: "own-membership",
      });

    // A global role may read platform-wide rows (null org); a tenant may not.
    if (!organizationId && !isGlobalRole) {
      throw new ForbiddenException(
        "Workspace context required: no organization could be resolved",
      );
    }

    return organizationId;
  }

  @Get("users/:id/activity")
  async getUserActivity(
    @Req() request: RequestWithUser,
    @Param("id") userId: string,
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: number,
    @Query("action") action?: string,
  ) {
    const organizationId = await this.resolveOrganizationId(request);
    return this.activityService.getUserActivity(
      userId,
      cursor,
      limit,
      action,
      organizationId ?? undefined,
    );
  }

  @Get("dashboard/activity/feed")
  async getGlobalFeed(
    @Req() request: RequestWithUser,
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: number,
    @Query("action") action?: string,
    @Query("userId") userId?: string,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
  ) {
    const organizationId = await this.resolveOrganizationId(request);
    return this.activityService.getGlobalFeed(
      {
        action,
        userId,
        fromDate,
        toDate,
        organizationId: organizationId ?? undefined,
      },
      cursor,
      limit,
    );
  }

  @Get("dashboard/activity/stats")
  async getStats(
    @Req() request: RequestWithUser,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
    @Query("userId") userId?: string,
  ) {
    const organizationId = await this.resolveOrganizationId(request);
    return this.activityService.getActivityStats({
      fromDate,
      toDate,
      userId,
      organizationId: organizationId ?? undefined,
    });
  }
}
