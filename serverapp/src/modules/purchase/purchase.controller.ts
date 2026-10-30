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
import { PurchaseService, PurchaseScope } from "./purchase.service";
import {
  AddPurchasePaymentDto,
  CreatePurchaseDto,
  ListPurchasesQueryDto,
  PurchasesReportQueryDto,
} from "./dto/purchase.dto";
import { SessionAuthGuard } from "../auth/guards/authenticated.guard";
import { WorkspaceContextService } from "src/shared/services/workspace-context.service";
import { OrganizationScopeService } from "src/shared/services/organization-scope.service";
import type { RequestWithUser } from "src/shared/types/server.type";

/** Purchases from suppliers (S8), tenant-scoped. */
@Controller("api/purchases")
@UseGuards(SessionAuthGuard)
export class PurchaseController {
  private readonly organizationScope: OrganizationScopeService;

  constructor(
    private readonly purchaseService: PurchaseService,
    private readonly workspaceContext: WorkspaceContextService,
    private readonly prisma: PrismaService,
  ) {
    this.organizationScope = new OrganizationScopeService(this.prisma);
  }

  private async resolveScope(
    request: RequestWithUser,
  ): Promise<PurchaseScope> {
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

  @Get("report")
  async getReport(
    @Req() request: RequestWithUser,
    @Query() query: PurchasesReportQueryDto,
  ) {
    const scope = await this.resolveScope(request);
    return this.purchaseService.getReport(scope, query);
  }

  @Get()
  async list(
    @Req() request: RequestWithUser,
    @Query() query: ListPurchasesQueryDto,
  ) {
    const scope = await this.resolveScope(request);
    return this.purchaseService.list(scope, query);
  }

  @Get(":id")
  async getOne(@Req() request: RequestWithUser, @Param("id") id: string) {
    const scope = await this.resolveScope(request);
    return this.purchaseService.getOne(scope, id);
  }

  @Post()
  async create(
    @Req() request: RequestWithUser,
    @Body() body: CreatePurchaseDto,
  ) {
    const scope = await this.resolveScope(request);
    return this.purchaseService.create(scope, body);
  }

  @Post(":id/receive")
  async receive(@Req() request: RequestWithUser, @Param("id") id: string) {
    const scope = await this.resolveScope(request);
    return this.purchaseService.receive(scope, id);
  }

  @Post(":id/payments")
  async addPayment(
    @Req() request: RequestWithUser,
    @Param("id") id: string,
    @Body() body: AddPurchasePaymentDto,
  ) {
    const scope = await this.resolveScope(request);
    return this.purchaseService.addPayment(scope, id, body);
  }

  @Post(":id/cancel")
  async cancel(@Req() request: RequestWithUser, @Param("id") id: string) {
    const scope = await this.resolveScope(request);
    return this.purchaseService.cancel(scope, id);
  }
}
