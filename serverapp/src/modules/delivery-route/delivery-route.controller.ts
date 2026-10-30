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
import { DeliveryRouteService, RouteScope } from "./delivery-route.service";
import {
  AssignOrdersDto,
  CreateDeliveryRouteDto,
  ListDeliveryRoutesQueryDto,
  MarkRouteItemDto,
  UpdateRouteStatusDto,
} from "./dto/delivery-route.dto";
import { SessionAuthGuard } from "../auth/guards/authenticated.guard";
import { WorkspaceContextService } from "src/shared/services/workspace-context.service";
import { OrganizationScopeService } from "src/shared/services/organization-scope.service";
import type { RequestWithUser } from "src/shared/types/server.type";

/**
 * Delivery routes (S8). Every route answers 409 while
 * `settings.routes.enabled` is off, so one check drives the API and the
 * sidebar entry together.
 */
@Controller("api/delivery-routes")
@UseGuards(SessionAuthGuard)
export class DeliveryRouteController {
  private readonly organizationScope: OrganizationScopeService;

  constructor(
    private readonly deliveryRouteService: DeliveryRouteService,
    private readonly workspaceContext: WorkspaceContextService,
    private readonly prisma: PrismaService,
  ) {
    this.organizationScope = new OrganizationScopeService(this.prisma);
  }

  private async resolveScope(request: RequestWithUser): Promise<RouteScope> {
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

  @Get()
  async list(
    @Req() request: RequestWithUser,
    @Query() query: ListDeliveryRoutesQueryDto,
  ) {
    const scope = await this.resolveScope(request);
    return this.deliveryRouteService.list(scope, query);
  }

  @Get(":id")
  async getOne(@Req() request: RequestWithUser, @Param("id") id: string) {
    const scope = await this.resolveScope(request);
    return this.deliveryRouteService.getOne(scope, id);
  }

  @Post()
  async create(
    @Req() request: RequestWithUser,
    @Body() body: CreateDeliveryRouteDto,
  ) {
    const scope = await this.resolveScope(request);
    return this.deliveryRouteService.create(scope, body);
  }

  @Post(":id/orders")
  async assignOrders(
    @Req() request: RequestWithUser,
    @Param("id") id: string,
    @Body() body: AssignOrdersDto,
  ) {
    const scope = await this.resolveScope(request);
    return this.deliveryRouteService.assignOrders(scope, id, body.orderIds);
  }

  @Delete(":id/orders/:orderId")
  async removeOrder(
    @Req() request: RequestWithUser,
    @Param("id") id: string,
    @Param("orderId") orderId: string,
  ) {
    const scope = await this.resolveScope(request);
    return this.deliveryRouteService.removeOrder(scope, id, orderId);
  }

  @Patch(":id/items/:itemId")
  async markItem(
    @Req() request: RequestWithUser,
    @Param("id") id: string,
    @Param("itemId") itemId: string,
    @Body() body: MarkRouteItemDto,
  ) {
    const scope = await this.resolveScope(request);
    return this.deliveryRouteService.markItem(scope, id, itemId, body);
  }

  @Patch(":id/status")
  async updateStatus(
    @Req() request: RequestWithUser,
    @Param("id") id: string,
    @Body() body: UpdateRouteStatusDto,
  ) {
    const scope = await this.resolveScope(request);
    return this.deliveryRouteService.updateStatus(scope, id, body.status);
  }
}
