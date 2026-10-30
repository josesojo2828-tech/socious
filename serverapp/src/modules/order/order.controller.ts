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
import { OrderService, OrderScope } from "./order.service";
import {
  CreateOrderDto,
  ListOrdersQueryDto,
  ShipOrderDto,
  UpdateOrderStatusDto,
} from "./dto/order.dto";
import { Public } from "src/shared/decorators/public.decorator";
import { SessionAuthGuard } from "../auth/guards/authenticated.guard";
import { WorkspaceContextService } from "src/shared/services/workspace-context.service";
import { OrganizationScopeService } from "src/shared/services/organization-scope.service";
import type { RequestWithUser } from "src/shared/types/server.type";

/**
 * Web orders / cart (S9): the public storefront posts here without an account,
 * the merchant manages them from the same resource.
 */
@Controller("api/orders")
export class OrderController {
  private readonly organizationScope: OrganizationScopeService;

  constructor(
    private readonly orderService: OrderService,
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

  /** Public cart submission. */
  @Public()
  @Post("public")
  createPublicOrder(@Body() body: CreateOrderDto) {
    return this.orderService.createPublicOrder(body);
  }

  @Get()
  @UseGuards(SessionAuthGuard)
  async list(
    @Req() request: RequestWithUser,
    @Query() query: ListOrdersQueryDto,
  ) {
    const scope = await this.resolveScope(request);
    return this.orderService.list(scope, query);
  }

  @Get(":id")
  @UseGuards(SessionAuthGuard)
  async getOne(@Req() request: RequestWithUser, @Param("id") id: string) {
    const scope = await this.resolveScope(request);
    return this.orderService.getOne(scope, id);
  }

  @Post(":id/status")
  @UseGuards(SessionAuthGuard)
  async updateStatus(
    @Req() request: RequestWithUser,
    @Param("id") id: string,
    @Body() body: UpdateOrderStatusDto,
  ) {
    const scope = await this.resolveScope(request);
    return this.orderService.updateStatus(scope, id, body);
  }

  /**
   * Dispatches an order to its agency / delivery courier (S7).
   * Only an order that is already confirmed, that actually needs shipping and
   * that has not gone out yet can be stamped here.
   */
  @Post(":id/ship")
  @UseGuards(SessionAuthGuard)
  async shipOrder(
    @Req() request: RequestWithUser,
    @Param("id") id: string,
    @Body() body: ShipOrderDto,
  ) {
    const scope = await this.resolveScope(request);
    return this.orderService.shipOrder(scope, id, body);
  }

  @Post(":id/convert")
  @UseGuards(SessionAuthGuard)
  async convertToSale(
    @Req() request: RequestWithUser,
    @Param("id") id: string,
  ) {
    const scope = await this.resolveScope(request);
    return this.orderService.convertToSale(scope, id);
  }
}
