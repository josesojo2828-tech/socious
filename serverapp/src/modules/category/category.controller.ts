import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Query,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import { CategoryService, CategoryScope } from "./category.service";
import { CreateCategoryDto, UpdateCategoryDto } from "./dto/category.dto";
import { Public } from "src/shared/decorators/public.decorator";
import { SessionAuthGuard } from "../auth/guards/authenticated.guard";
import { WorkspaceContextService } from "src/shared/services/workspace-context.service";
import { OrganizationScopeService } from "src/shared/services/organization-scope.service";
import { isSuperadmin } from "../permit/authz";
import type { RequestWithUser } from "src/shared/types/server.type";

/**
 * Category tree (S5).
 *
 * - `GET /api/categories` — public platform catalog (storefront safe).
 * - `GET /api/categories/mine` — catalog plus the caller's own categories.
 * - write routes — SUPERADMIN only for the system catalog, plus the tenant's
 *   own categories through the same guarded service rule.
 */
@Controller("api/categories")
export class CategoryController {
  private readonly organizationScope: OrganizationScopeService;

  constructor(
    private readonly categoryService: CategoryService,
    private readonly workspaceContext: WorkspaceContextService,
    private readonly prisma: PrismaService,
  ) {
    this.organizationScope = new OrganizationScopeService(this.prisma);
  }

  private async resolveScope(request: RequestWithUser): Promise<CategoryScope> {
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
      isSuperadmin: isSuperadmin(request.user as any),
    };
  }

  /** Public platform catalog — never exposes tenant-owned categories. */
  @Public()
  @Get()
  listPublicCatalog() {
    return this.categoryService.listTree(null);
  }

  /** Catalog + the caller's own categories. `?includeInactive=1` for settings. */
  @Get("mine")
  @UseGuards(SessionAuthGuard)
  async listMine(
    @Req() request: RequestWithUser,
    @Query("includeInactive") includeInactive?: string,
  ) {
    const scope = await this.resolveScope(request);
    return this.categoryService.listTree(
      scope.organizationId,
      includeInactive === "1" || includeInactive === "true",
    );
  }

  @Get(":id")
  @UseGuards(SessionAuthGuard)
  async getOne(@Req() request: RequestWithUser, @Param("id") id: string) {
    const scope = await this.resolveScope(request);
    return this.categoryService.getOne(scope.organizationId, id);
  }

  @Post()
  @UseGuards(SessionAuthGuard)
  async create(
    @Req() request: RequestWithUser,
    @Body() body: CreateCategoryDto,
  ) {
    const scope = await this.resolveScope(request);
    return this.categoryService.create(scope, body);
  }

  @Patch(":id")
  @UseGuards(SessionAuthGuard)
  async update(
    @Req() request: RequestWithUser,
    @Param("id") id: string,
    @Body() body: UpdateCategoryDto,
  ) {
    const scope = await this.resolveScope(request);
    return this.categoryService.update(scope, id, body);
  }

  @Delete(":id")
  @UseGuards(SessionAuthGuard)
  async remove(@Req() request: RequestWithUser, @Param("id") id: string) {
    const scope = await this.resolveScope(request);
    return this.categoryService.remove(scope, id);
  }
}
