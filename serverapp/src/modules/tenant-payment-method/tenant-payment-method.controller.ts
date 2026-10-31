import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import { TenantPaymentMethodService } from "./tenant-payment-method.service";
import { SessionAuthGuard } from "../auth/guards/authenticated.guard";
import { WorkspaceContextService } from "src/shared/services/workspace-context.service";
import { OrganizationScopeService } from "src/shared/services/organization-scope.service";
import type { RequestWithUser } from "src/shared/types/server.type";

/** Tenant payment methods (S1). */
@Controller("api/tenant-payment-methods")
@UseGuards(SessionAuthGuard)
export class TenantPaymentMethodController {
  private readonly organizationScope: OrganizationScopeService;

  constructor(
    private readonly methods: TenantPaymentMethodService,
    private readonly workspaceContext: WorkspaceContextService,
    private readonly prisma: PrismaService,
  ) {
    this.organizationScope = new OrganizationScopeService(this.prisma);
  }

  private async requireOrg(request: RequestWithUser): Promise<string> {
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
      throw new UnauthorizedException(
        "Crea una organización para gestionar métodos de pago.",
      );
    }
    return resolved.organizationId;
  }

  /** Built-ins + the tenant's methods; the POS reads this list. */
  @Get("pos-options")
  async posOptions(@Req() request: RequestWithUser) {
    if (!request.user) {
      throw new UnauthorizedException("No autorizado");
    }
    const resolved = await this.organizationScope.resolveOrganizationScope({
      user: request.user as any,
      requestedOrganizationId: this.workspaceContext.getWorkspaceId(),
      unauthorizedFallback: "personal",
      missingFallback: "personal",
    });
    return this.methods.posOptions(resolved.organizationId);
  }

  @Get()
  async list(@Req() request: RequestWithUser) {
    return this.methods.list(await this.requireOrg(request));
  }

  @Post()
  async create(@Req() request: RequestWithUser, @Body() body: any) {
    return this.methods.create(await this.requireOrg(request), body);
  }

  @Patch(":id")
  async update(
    @Req() request: RequestWithUser,
    @Param("id") id: string,
    @Body() body: any,
  ) {
    return this.methods.update(await this.requireOrg(request), id, body);
  }

  @Delete(":id")
  async remove(@Req() request: RequestWithUser, @Param("id") id: string) {
    return this.methods.remove(await this.requireOrg(request), id);
  }
}
