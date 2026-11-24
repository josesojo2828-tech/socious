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
import { SessionAuthGuard } from "../auth/guards/authenticated.guard";
import { MeatCarcassService } from "./meat-carcass.service";
import { CreateMeatCarcassDto, UpdateMeatCarcassDto } from "./dto/meat-carcass.dto";
import { WorkspaceContextService } from "src/shared/services/workspace-context.service";
import { OrganizationScopeService } from "src/shared/services/organization-scope.service";
import type { RequestWithUser } from "src/shared/types/server.type";

@Controller("api/meat-processing/carcasses")
@UseGuards(SessionAuthGuard)
export class MeatCarcassController {
  private readonly organizationScope: OrganizationScopeService;

  constructor(
    private readonly carcassService: MeatCarcassService,
    private readonly workspaceContext: WorkspaceContextService,
    private readonly prisma: PrismaService,
  ) {
    this.organizationScope = new OrganizationScopeService(this.prisma);
  }

  private async resolveOrgId(request: RequestWithUser): Promise<string> {
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
      throw new UnauthorizedException("Se requiere una organización activa.");
    }
    return resolved.organizationId;
  }

  @Get()
  async findAll(@Req() request: RequestWithUser) {
    const orgId = await this.resolveOrgId(request);
    return this.carcassService.findAll(orgId);
  }

  @Get(":id")
  async findOne(@Req() request: RequestWithUser, @Param("id") id: string) {
    const orgId = await this.resolveOrgId(request);
    return this.carcassService.findOne(orgId, id);
  }

  @Get(":id/last-deconstruction")
  async getLastDeconstruction(
    @Req() request: RequestWithUser,
    @Param("id") id: string,
  ) {
    const orgId = await this.resolveOrgId(request);
    return this.carcassService.getLastDeconstruction(orgId, id);
  }

  @Post()
  async create(
    @Req() request: RequestWithUser,
    @Body() dto: CreateMeatCarcassDto,
  ) {
    const orgId = await this.resolveOrgId(request);
    return this.carcassService.create(orgId, dto);
  }

  @Patch(":id")
  async update(
    @Req() request: RequestWithUser,
    @Param("id") id: string,
    @Body() dto: UpdateMeatCarcassDto,
  ) {
    const orgId = await this.resolveOrgId(request);
    return this.carcassService.update(orgId, id, dto);
  }

  @Delete(":id")
  async delete(@Req() request: RequestWithUser, @Param("id") id: string) {
    const orgId = await this.resolveOrgId(request);
    return this.carcassService.delete(orgId, id);
  }
}
