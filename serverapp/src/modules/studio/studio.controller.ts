import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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
import { StudioService, StudioScope } from "./studio.service";
import {
  AppointmentRangeDto,
  CreateAppointmentDto,
  CreateStationDto,
  UpdateAppointmentDto,
  UpdateStationDto,
} from "./dto/studio.dto";

/** Studio plan: mesas/sillas CRUD and the daily agenda. */
@Controller("api/studio")
@UseGuards(SessionAuthGuard)
export class StudioController {
  private readonly organizationScope: OrganizationScopeService;

  constructor(
    private readonly studioService: StudioService,
    private readonly workspaceContext: WorkspaceContextService,
    private readonly prisma: PrismaService,
  ) {
    this.organizationScope = new OrganizationScopeService(this.prisma);
  }

  private async resolveScope(request: RequestWithUser): Promise<StudioScope> {
    if (!request.user) {
      throw new UnauthorizedException("No autorizado");
    }

    const resolved = await this.organizationScope.resolveOrganizationScope({
      user: request.user as any,
      requestedOrganizationId: this.workspaceContext.getWorkspaceId(),
      unauthorizedFallback: "personal",
      missingFallback: "personal",
    });

    return { organizationId: resolved.organizationId };
  }

  // --- Mesas / Sillas -------------------------------------------------------

  @Get("stations")
  async listStations(@Req() request: RequestWithUser) {
    const scope = await this.resolveScope(request);
    return this.studioService.listStations(scope);
  }

  @Post("stations")
  async createStation(
    @Req() request: RequestWithUser,
    @Body() body: CreateStationDto,
  ) {
    const scope = await this.resolveScope(request);
    return this.studioService.createStation(scope, body);
  }

  @Patch("stations/:id")
  async updateStation(
    @Req() request: RequestWithUser,
    @Param("id") id: string,
    @Body() body: UpdateStationDto,
  ) {
    const scope = await this.resolveScope(request);
    return this.studioService.updateStation(scope, id, body);
  }

  @Delete("stations/:id")
  async removeStation(
    @Req() request: RequestWithUser,
    @Param("id") id: string,
  ) {
    const scope = await this.resolveScope(request);
    return this.studioService.removeStation(scope, id);
  }

  // --- Agenda ---------------------------------------------------------------

  @Get("appointments")
  async listAppointments(
    @Req() request: RequestWithUser,
    @Query() query: AppointmentRangeDto,
  ) {
    const scope = await this.resolveScope(request);
    return this.studioService.listAppointments(scope, {
      from: query.from,
      to: query.to,
    });
  }

  @Post("appointments")
  async createAppointment(
    @Req() request: RequestWithUser,
    @Body() body: CreateAppointmentDto,
  ) {
    const scope = await this.resolveScope(request);
    return this.studioService.createAppointment(
      scope,
      body,
      request.user?.id ?? null,
    );
  }

  @Patch("appointments/:id")
  async updateAppointment(
    @Req() request: RequestWithUser,
    @Param("id") id: string,
    @Body() body: UpdateAppointmentDto,
  ) {
    const scope = await this.resolveScope(request);
    return this.studioService.updateAppointment(scope, id, body);
  }

  @Delete("appointments/:id")
  async cancelAppointment(
    @Req() request: RequestWithUser,
    @Param("id") id: string,
  ) {
    const scope = await this.resolveScope(request);
    return this.studioService.cancelAppointment(scope, id);
  }
}
