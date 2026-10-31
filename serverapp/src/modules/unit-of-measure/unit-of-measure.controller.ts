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
import { UnitOfMeasureService } from "./unit-of-measure.service";
import { CreateUnitDto, UpdateUnitDto } from "./dto/unit.dto";
import { SessionAuthGuard } from "../auth/guards/authenticated.guard";
import { WorkspaceContextService } from "src/shared/services/workspace-context.service";
import { OrganizationScopeService } from "src/shared/services/organization-scope.service";
import type { RequestWithUser } from "src/shared/types/server.type";

/** Units of measure (S2): system catalog + tenant CRUD. */
@Controller("api/units")
@UseGuards(SessionAuthGuard)
export class UnitOfMeasureController {
  private readonly organizationScope: OrganizationScopeService;

  constructor(
    private readonly units: UnitOfMeasureService,
    private readonly workspaceContext: WorkspaceContextService,
    private readonly prisma: PrismaService,
  ) {
    this.organizationScope = new OrganizationScopeService(this.prisma);
  }

  private async resolveOrg(request: RequestWithUser): Promise<string | null> {
    if (!request.user) {
      throw new UnauthorizedException("No autorizado");
    }
    const resolved = await this.organizationScope.resolveOrganizationScope({
      user: request.user as any,
      requestedOrganizationId: this.workspaceContext.getWorkspaceId(),
      unauthorizedFallback: "personal",
      missingFallback: "personal",
    });
    return resolved.organizationId;
  }

  @Get()
  async list(@Req() request: RequestWithUser) {
    const organizationId = await this.resolveOrg(request);
    return this.units.list(organizationId);
  }

  @Post()
  async create(@Req() request: RequestWithUser, @Body() body: CreateUnitDto) {
    const organizationId = await this.resolveOrg(request);
    if (!organizationId) {
      throw new UnauthorizedException(
        "Crea una organización para gestionar unidades.",
      );
    }
    return this.units.create(organizationId, body);
  }

  @Patch(":id")
  async update(
    @Req() request: RequestWithUser,
    @Param("id") id: string,
    @Body() body: UpdateUnitDto,
  ) {
    const organizationId = await this.resolveOrg(request);
    if (!organizationId) {
      throw new UnauthorizedException(
        "Crea una organización para gestionar unidades.",
      );
    }
    return this.units.update(organizationId, id, body);
  }

  @Delete(":id")
  async remove(@Req() request: RequestWithUser, @Param("id") id: string) {
    const organizationId = await this.resolveOrg(request);
    if (!organizationId) {
      throw new UnauthorizedException(
        "Crea una organización para gestionar unidades.",
      );
    }
    return this.units.remove(organizationId, id);
  }
}
