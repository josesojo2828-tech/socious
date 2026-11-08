import {
  Controller,
  Get,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import { SessionAuthGuard } from "../auth/guards/authenticated.guard";
import { WorkspaceContextService } from "src/shared/services/workspace-context.service";
import { OrganizationScopeService } from "src/shared/services/organization-scope.service";
import type { RequestWithUser } from "src/shared/types/server.type";
import type { OrderScope } from "./order.service";
import { StorefrontMetricsService } from "./storefront-metrics.service";
import { StorefrontMetricsQueryDto } from "./dto/storefront-metrics.dto";

/** Tenant-facing storefront metrics: orders placed on the public store. */
@Controller("api/storefront")
@UseGuards(SessionAuthGuard)
export class StorefrontMetricsController {
  private readonly organizationScope: OrganizationScopeService;

  constructor(
    private readonly metrics: StorefrontMetricsService,
    private readonly workspaceContext: WorkspaceContextService,
    private readonly prisma: PrismaService,
  ) {
    this.organizationScope = new OrganizationScopeService(this.prisma);
  }

  private async resolveScope(request: RequestWithUser): Promise<OrderScope> {
    if (!request.user) {
      throw new UnauthorizedException("No autorizado");
    }

    const resolved = await this.organizationScope.resolveOrganizationScope({
      user: request.user as any,
      requestedOrganizationId: this.workspaceContext.getWorkspaceId(),
      unauthorizedFallback: "personal",
      missingFallback: "personal",
    });

    return {
      organizationId: resolved.organizationId,
      createdById: request.user.id,
    };
  }

  @Get("metrics")
  async get(
    @Req() request: RequestWithUser,
    @Query() query: StorefrontMetricsQueryDto,
  ) {
    const scope = await this.resolveScope(request);
    return this.metrics.get(scope, query);
  }
}
