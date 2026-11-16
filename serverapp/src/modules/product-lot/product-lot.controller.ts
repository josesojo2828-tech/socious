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
import {
  AdjustProductLotDto,
  CreateProductLotDto,
  ListProductLotsQueryDto,
  UpdateProductLotDto,
} from "./dto/product-lot.dto";
import { ProductLotScope, ProductLotService } from "./product-lot.service";
import { SessionAuthGuard } from "../auth/guards/authenticated.guard";
import { WorkspaceContextService } from "src/shared/services/workspace-context.service";
import { OrganizationScopeService } from "src/shared/services/organization-scope.service";
import type { RequestWithUser } from "src/shared/types/server.type";

/** Rollos y partidas (S3): solo para productos con `tracksLots`. */
@Controller("api/product-lots")
@UseGuards(SessionAuthGuard)
export class ProductLotController {
  private readonly organizationScope: OrganizationScopeService;

  constructor(
    private readonly lots: ProductLotService,
    private readonly workspaceContext: WorkspaceContextService,
    private readonly prisma: PrismaService,
  ) {
    this.organizationScope = new OrganizationScopeService(this.prisma);
  }

  private async resolveScope(
    request: RequestWithUser,
  ): Promise<ProductLotScope> {
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
    @Query() query: ListProductLotsQueryDto,
  ) {
    const scope = await this.resolveScope(request);
    return this.lots.list(scope, query);
  }

  @Post()
  async create(
    @Req() request: RequestWithUser,
    @Body() body: CreateProductLotDto,
  ) {
    const scope = await this.resolveScope(request);
    return this.lots.create(scope, body);
  }

  @Patch(":id")
  async update(
    @Req() request: RequestWithUser,
    @Param("id") id: string,
    @Body() body: UpdateProductLotDto,
  ) {
    const scope = await this.resolveScope(request);
    return this.lots.update(scope, id, body);
  }

  @Post(":id/adjust")
  async adjust(
    @Req() request: RequestWithUser,
    @Param("id") id: string,
    @Body() body: AdjustProductLotDto,
  ) {
    const scope = await this.resolveScope(request);
    return this.lots.adjust(scope, id, body);
  }

  @Delete(":id")
  async remove(@Req() request: RequestWithUser, @Param("id") id: string) {
    const scope = await this.resolveScope(request);
    return this.lots.remove(scope, id);
  }
}
