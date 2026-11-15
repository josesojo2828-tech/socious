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
import { ProductSizeService } from "./product-size.service";
import {
  CreateProductSizeDto,
  UpdateProductSizeDto,
} from "./dto/product-size.dto";
import { SessionAuthGuard } from "../auth/guards/authenticated.guard";
import { WorkspaceContextService } from "src/shared/services/workspace-context.service";
import { OrganizationScopeService } from "src/shared/services/organization-scope.service";
import type { RequestWithUser } from "src/shared/types/server.type";

/** Size catalog (tallas): system catalog + tenant CRUD. */
@Controller("api/sizes")
@UseGuards(SessionAuthGuard)
export class ProductSizeController {
  private readonly organizationScope: OrganizationScopeService;

  constructor(
    private readonly sizes: ProductSizeService,
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
      user: request.user as never,
      requestedOrganizationId: this.workspaceContext.getWorkspaceId(),
      unauthorizedFallback: "personal",
      missingFallback: "personal",
    });
    return resolved.organizationId;
  }

  @Get()
  async list(@Req() request: RequestWithUser) {
    const organizationId = await this.resolveOrg(request);
    return this.sizes.list(organizationId);
  }

  @Post()
  async create(
    @Req() request: RequestWithUser,
    @Body() body: CreateProductSizeDto,
  ) {
    const organizationId = await this.resolveOrg(request);
    if (!organizationId) {
      throw new UnauthorizedException(
        "Crea una organización para gestionar tallas.",
      );
    }
    return this.sizes.create(organizationId, body);
  }

  @Patch(":id")
  async update(
    @Req() request: RequestWithUser,
    @Param("id") id: string,
    @Body() body: UpdateProductSizeDto,
  ) {
    const organizationId = await this.resolveOrg(request);
    if (!organizationId) {
      throw new UnauthorizedException(
        "Crea una organización para gestionar tallas.",
      );
    }
    return this.sizes.update(organizationId, id, body);
  }

  @Delete(":id")
  async remove(@Req() request: RequestWithUser, @Param("id") id: string) {
    const organizationId = await this.resolveOrg(request);
    if (!organizationId) {
      throw new UnauthorizedException(
        "Crea una organización para gestionar tallas.",
      );
    }
    return this.sizes.remove(organizationId, id);
  }
}
