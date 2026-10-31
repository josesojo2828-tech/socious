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
import { SupplierService, SupplierScope } from "./supplier.service";
import {
  CreateSupplierDto,
  ListSuppliersQueryDto,
  UpdateSupplierDto,
} from "./dto/supplier.dto";
import { SessionAuthGuard } from "../auth/guards/authenticated.guard";
import { WorkspaceContextService } from "src/shared/services/workspace-context.service";
import { OrganizationScopeService } from "src/shared/services/organization-scope.service";
import type { RequestWithUser } from "src/shared/types/server.type";
import { CreateSupplierLocationDto, UpdateSupplierLocationDto } from "./dto/supplier-location.dto";

/** Supplier directory (S4), tenant-scoped like the client module. */
@Controller("api/suppliers")
@UseGuards(SessionAuthGuard)
export class SupplierController {
  private readonly organizationScope: OrganizationScopeService;

  constructor(
    private readonly supplierService: SupplierService,
    private readonly workspaceContext: WorkspaceContextService,
    private readonly prisma: PrismaService,
  ) {
    this.organizationScope = new OrganizationScopeService(this.prisma);
  }

  private async resolveScope(
    request: RequestWithUser,
  ): Promise<SupplierScope> {
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
    @Query() query: ListSuppliersQueryDto,
  ) {
    const scope = await this.resolveScope(request);
    return this.supplierService.list(scope, query);
  }

  @Get(":id/balance")
  async getBalance(@Req() request: RequestWithUser, @Param("id") id: string) {
    const scope = await this.resolveScope(request);
    return this.supplierService.getBalance(scope, id);
  }

  @Get(":id")
  async getOne(@Req() request: RequestWithUser, @Param("id") id: string) {
    const scope = await this.resolveScope(request);
    return this.supplierService.getOne(scope, id);
  }

  @Post()
  async create(
    @Req() request: RequestWithUser,
    @Body() body: CreateSupplierDto,
  ) {
    const scope = await this.resolveScope(request);
    return this.supplierService.create(scope, body);
  }

  // Ubicaciones (CRM S3)
  @Get(":id/locations")
  async listLocations(@Req() request: RequestWithUser, @Param("id") id: string) {
    const scope = await this.resolveScope(request);
    return this.supplierService.listLocations(scope, id);
  }

  @Post(":id/locations")
  async createLocation(
    @Req() request: RequestWithUser,
    @Param("id") id: string,
    @Body() body: CreateSupplierLocationDto,
  ) {
    const scope = await this.resolveScope(request);
    return this.supplierService.createLocation(scope, id, body);
  }

  @Patch("locations/:locationId")
  async updateLocation(
    @Req() request: RequestWithUser,
    @Param("locationId") locationId: string,
    @Body() body: UpdateSupplierLocationDto,
  ) {
    const scope = await this.resolveScope(request);
    return this.supplierService.updateLocation(scope, locationId, body);
  }

  @Delete("locations/:locationId")
  async removeLocation(
    @Req() request: RequestWithUser,
    @Param("locationId") locationId: string,
  ) {
    const scope = await this.resolveScope(request);
    return this.supplierService.removeLocation(scope, locationId);
  }

  @Patch(":id")
  async update(
    @Req() request: RequestWithUser,
    @Param("id") id: string,
    @Body() body: UpdateSupplierDto,
  ) {
    const scope = await this.resolveScope(request);
    return this.supplierService.update(scope, id, body);
  }

  @Delete(":id")
  async remove(@Req() request: RequestWithUser, @Param("id") id: string) {
    const scope = await this.resolveScope(request);
    return this.supplierService.remove(scope, id);
  }
}
