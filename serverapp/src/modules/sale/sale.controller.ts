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
import { SaleService, SaleScope } from "./sale.service";
import { SaleReturnService } from "./sale-return.service";
import { CreateSaleReturnDto, ListSaleReturnsQueryDto } from "./dto/sale-return.dto";
import {
  AddSalePaymentDto,
  CreateSaleDto,
  ListSalesQueryDto,
  SalesReportQueryDto,
} from "./dto/sale.dto";
import { SessionAuthGuard } from "../auth/guards/authenticated.guard";
import { WorkspaceContextService } from "src/shared/services/workspace-context.service";
import { OrganizationScopeService } from "src/shared/services/organization-scope.service";
import type { RequestWithUser } from "src/shared/types/server.type";

/**
 * Sales and invoicing (S7): accrual document with frozen rates, collections
 * dated independently and the accrual/collections report.
 */
@Controller("api/sales")
@UseGuards(SessionAuthGuard)
export class SaleController {
  private readonly organizationScope: OrganizationScopeService;

  constructor(
    private readonly saleService: SaleService,
    private readonly saleReturnService: SaleReturnService,
    private readonly workspaceContext: WorkspaceContextService,
    private readonly prisma: PrismaService,
  ) {
    this.organizationScope = new OrganizationScopeService(this.prisma);
  }

  private async resolveScope(request: RequestWithUser): Promise<SaleScope> {
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
    @Query() query: SalesReportQueryDto,
  ) {
    const scope = await this.resolveScope(request);
    return this.saleService.getReport(scope, query);
  }

  @Get()
  async list(
    @Req() request: RequestWithUser,
    @Query() query: ListSalesQueryDto,
  ) {
    const scope = await this.resolveScope(request);
    return this.saleService.list(scope, query);
  }

  // Returns are declared before ":id" so "/returns" never resolves as a sale id.
  @Get("returns")
  async listReturns(
    @Req() request: RequestWithUser,
    @Query() query: ListSaleReturnsQueryDto,
  ) {
    const scope = await this.resolveScope(request);
    return this.saleReturnService.list(scope, query);
  }

  @Get("returns/:id")
  async getReturn(@Req() request: RequestWithUser, @Param("id") id: string) {
    const scope = await this.resolveScope(request);
    return this.saleReturnService.getOne(scope, id);
  }

  @Get(":id/returns")
  async listReturnsOfSale(
    @Req() request: RequestWithUser,
    @Param("id") id: string,
    @Query() query: ListSaleReturnsQueryDto,
  ) {
    const scope = await this.resolveScope(request);
    return this.saleReturnService.listBySale(scope, id, query);
  }

  @Post(":id/returns")
  async createReturn(
    @Req() request: RequestWithUser,
    @Param("id") id: string,
    @Body() body: CreateSaleReturnDto,
  ) {
    const scope = await this.resolveScope(request);
    return this.saleReturnService.create(scope, id, body);
  }

  @Get(":id")
  async getOne(@Req() request: RequestWithUser, @Param("id") id: string) {
    const scope = await this.resolveScope(request);
    return this.saleService.getOne(scope, id);
  }

  @Post()
  async create(@Req() request: RequestWithUser, @Body() body: CreateSaleDto) {
    const scope = await this.resolveScope(request);
    return this.saleService.create(scope, body);
  }

  @Post(":id/payments")
  async addPayment(
    @Req() request: RequestWithUser,
    @Param("id") id: string,
    @Body() body: AddSalePaymentDto,
  ) {
    const scope = await this.resolveScope(request);
    return this.saleService.addPayment(scope, id, body);
  }

  @Post(":id/cancel")
  async cancel(@Req() request: RequestWithUser, @Param("id") id: string) {
    const scope = await this.resolveScope(request);
    return this.saleService.cancel(scope, id);
  }
}
