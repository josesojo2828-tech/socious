import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Patch,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import { SessionAuthGuard } from "src/modules/auth/guards/authenticated.guard";
import { WorkspaceContextService } from "src/shared/services/workspace-context.service";
import { OrganizationScopeService } from "src/shared/services/organization-scope.service";
import { assertCanEditOrganization } from "src/shared/services/organization-write-access";
import type { RequestWithUser } from "src/shared/types/server.type";
import { OrganizationService } from "./organization.service";
import { UpdateOrganizationIdentityDto } from "./dto/organization-identity.dto";

/**
 * Tenant identity surface (logo, brand colors and business details).
 *
 * The active organization is resolved EXACTLY like `GET/PATCH /api/settings`:
 * from the `x-workspace-id` header through `OrganizationScopeService`, never
 * from a client-supplied body id. A caller without an ACTIVE membership can
 * never reach a foreign organization.
 *
 * `GET` — any authenticated member of the workspace.
 * `PATCH` — the same roles that may edit tenant settings, via the shared
 * `assertCanEditOrganization` helper.
 */
@Controller("api/organizations/identity")
@UseGuards(SessionAuthGuard)
export class OrganizationIdentityController {
  private readonly organizationScope: OrganizationScopeService;

  constructor(
    private readonly organizationService: OrganizationService,
    private readonly workspaceContext: WorkspaceContextService,
    private readonly prisma: PrismaService,
  ) {
    this.organizationScope = new OrganizationScopeService(this.prisma);
  }

  private async resolveOrganizationId(
    request: RequestWithUser,
  ): Promise<string> {
    if (!request.user) {
      throw new UnauthorizedException("No autorizado");
    }

    const resolved = await this.organizationScope.resolveOrganizationScope({
      user: request.user as any,
      requestedOrganizationId: this.workspaceContext.getWorkspaceId(),
      unauthorizedFallback: "personal",
      missingFallback: "personal",
    });

    if (!resolved.organizationId) {
      throw new ForbiddenException(
        "Selecciona una organización para gestionar su identidad.",
      );
    }

    return resolved.organizationId;
  }

  @Get()
  async getIdentity(@Req() request: RequestWithUser) {
    const organizationId = await this.resolveOrganizationId(request);
    return this.organizationService.getIdentity(organizationId);
  }

  @Patch()
  async updateIdentity(
    @Req() request: RequestWithUser,
    @Body() dto: UpdateOrganizationIdentityDto,
  ) {
    const organizationId = await this.resolveOrganizationId(request);
    await assertCanEditOrganization(
      this.prisma,
      request.user as any,
      organizationId,
    );
    return this.organizationService.updateIdentity(organizationId, dto);
  }
}
