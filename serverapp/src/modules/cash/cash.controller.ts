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
import { CashService, CashScope } from "./cash.service";
import {
  CreateCashMovementDto,
  CreateCashRegisterDto,
  ListShiftsQueryDto,
  OpenShiftDto,
  CloseShiftDto,
  UpdateCashRegisterDto,
} from "./dto/cash.dto";
import { SessionAuthGuard } from "../auth/guards/authenticated.guard";
import { WorkspaceContextService } from "src/shared/services/workspace-context.service";
import { OrganizationScopeService } from "src/shared/services/organization-scope.service";
import type { RequestWithUser } from "src/shared/types/server.type";

/**
 * Cash registers and shifts (S7 support): opening float, manual movements,
 * blind-count close and the drawer summary the POS reads before ringing up.
 */
@Controller("api/cash")
@UseGuards(SessionAuthGuard)
export class CashController {
  private readonly organizationScope: OrganizationScopeService;

  constructor(
    private readonly cashService: CashService,
    private readonly workspaceContext: WorkspaceContextService,
    private readonly prisma: PrismaService,
  ) {
    this.organizationScope = new OrganizationScopeService(this.prisma);
  }

  private async resolveScope(request: RequestWithUser): Promise<CashScope> {
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
      userId: request.user.id,
    };
  }

  // ---------------------------------------------------------------
  // Registers
  // ---------------------------------------------------------------

  @Get("registers")
  async listRegisters(@Req() request: RequestWithUser) {
    const scope = await this.resolveScope(request);
    return this.cashService.listRegisters(scope);
  }

  @Post("registers")
  async createRegister(
    @Req() request: RequestWithUser,
    @Body() body: CreateCashRegisterDto,
  ) {
    const scope = await this.resolveScope(request);
    return this.cashService.createRegister(scope, body);
  }

  @Patch("registers/:id")
  async updateRegister(
    @Req() request: RequestWithUser,
    @Param("id") id: string,
    @Body() body: UpdateCashRegisterDto,
  ) {
    const scope = await this.resolveScope(request);
    return this.cashService.updateRegister(scope, id, body);
  }

  @Delete("registers/:id")
  async removeRegister(@Req() request: RequestWithUser, @Param("id") id: string) {
    const scope = await this.resolveScope(request);
    return this.cashService.removeRegister(scope, id);
  }

  // ---------------------------------------------------------------
  // Shifts
  // ---------------------------------------------------------------

  @Get("shifts/current")
  async getCurrentShift(@Req() request: RequestWithUser) {
    const scope = await this.resolveScope(request);
    return this.cashService.getCurrentShift(scope);
  }

  @Get("shifts")
  async listShifts(
    @Req() request: RequestWithUser,
    @Query() query: ListShiftsQueryDto,
  ) {
    const scope = await this.resolveScope(request);
    return this.cashService.listShifts(scope, query);
  }

  @Get("shifts/:id")
  async getShift(@Req() request: RequestWithUser, @Param("id") id: string) {
    const scope = await this.resolveScope(request);
    return this.cashService.getShift(scope, id);
  }

  @Get("shifts/:id/movements")
  async listMovements(
    @Req() request: RequestWithUser,
    @Param("id") id: string,
  ) {
    const scope = await this.resolveScope(request);
    return this.cashService.listMovements(scope, id);
  }

  @Post("registers/:id/shifts")
  async openShift(
    @Req() request: RequestWithUser,
    @Param("id") registerId: string,
    @Body() body: OpenShiftDto,
  ) {
    const scope = await this.resolveScope(request);
    return this.cashService.openShift(scope, registerId, body);
  }

  @Post("shifts/:id/close")
  async closeShift(
    @Req() request: RequestWithUser,
    @Param("id") id: string,
    @Body() body: CloseShiftDto,
  ) {
    const scope = await this.resolveScope(request);
    return this.cashService.closeShift(scope, id, body);
  }

  @Post("shifts/:id/movements")
  async addMovement(
    @Req() request: RequestWithUser,
    @Param("id") id: string,
    @Body() body: CreateCashMovementDto,
  ) {
    const scope = await this.resolveScope(request);
    return this.cashService.addMovement(scope, id, body);
  }
}
