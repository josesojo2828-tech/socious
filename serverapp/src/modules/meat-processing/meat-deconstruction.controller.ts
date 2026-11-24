import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import { SessionAuthGuard } from "../auth/guards/authenticated.guard";
import { MeatDeconstructionService } from "./meat-deconstruction.service";
import { CreateMeatDeconstructionDto } from "./dto/meat-deconstruction.dto";
import { WorkspaceContextService } from "src/shared/services/workspace-context.service";
import { OrganizationScopeService } from "src/shared/services/organization-scope.service";
import type { RequestWithUser } from "src/shared/types/server.type";

@Controller("api/meat-processing/deconstructions")
@UseGuards(SessionAuthGuard)
export class MeatDeconstructionController {
  private readonly organizationScope: OrganizationScopeService;

  constructor(
    private readonly deconstructionService: MeatDeconstructionService,
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
  async findAll(
    @Req() request: RequestWithUser,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("q") q?: string,
  ) {
    const orgId = await this.resolveOrgId(request);
    return this.deconstructionService.findAll(orgId, { page, limit, q });
  }

  @Get(":id")
  async findOne(@Req() request: RequestWithUser, @Param("id") id: string) {
    const orgId = await this.resolveOrgId(request);
    return this.deconstructionService.findOne(orgId, id);
  }

  @Post()
  async create(
    @Req() request: RequestWithUser,
    @Body() dto: CreateMeatDeconstructionDto,
  ) {
    const orgId = await this.resolveOrgId(request);
    const userId = request.user?.id || "";
    return this.deconstructionService.create(orgId, userId, dto);
  }
}
