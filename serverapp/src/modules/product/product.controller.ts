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
  Res,
  UnauthorizedException,
  UseGuards,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import type { FastifyReply } from "fastify";
import { ProductService, ProductScope } from "./product.service";
import { ProductImportService } from "./import/product-import.service";
import {
  AdjustStockDto,
  CreateProductDto,
  ListProductsQueryDto,
  ListStockMovementsQueryDto,
  UpdateProductDto,
} from "./dto/product.dto";
import { PresentationService } from "./presentation.service";
import {
  CreatePresentationDto,
  DecomposeDto,
} from "./dto/presentation.dto";
import { Public } from "src/shared/decorators/public.decorator";
import { SessionAuthGuard } from "../auth/guards/authenticated.guard";
import { WorkspaceContextService } from "src/shared/services/workspace-context.service";
import { OrganizationScopeService } from "src/shared/services/organization-scope.service";
import { TenantSettingsService } from "src/shared/services/tenant-settings.service";
import {
  activeOfferPercentMap,
  discountedPrice,
} from "src/shared/utils/offer-price";
import type { RequestWithUser } from "src/shared/types/server.type";

/**
 * Product catalog (S6): states, stock control through the Kardex and the
 * public storefront listing (`isPublic`).
 */
@Controller("api/products")
export class ProductController {
  private readonly organizationScope: OrganizationScopeService;

  constructor(
    private readonly productService: ProductService,
    private readonly presentationService: PresentationService,
    private readonly workspaceContext: WorkspaceContextService,
    private readonly tenantSettings: TenantSettingsService,
    private readonly prisma: PrismaService,
    private readonly productImportService: ProductImportService,
  ) {
    this.organizationScope = new OrganizationScopeService(this.prisma);
  }

  private async resolveScope(
    request: RequestWithUser,
  ): Promise<ProductScope> {
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

  /**
   * Public storefront catalog (S6/S9): only products the merchant published,
   * resolved by the shop slug so a visitor never needs an account.
   */
  @Public()
  @Get("public")
  async listPublicCatalog(
    @Query("organization") organizationSlug?: string,
    @Query("q") q?: string,
  ) {
    const organization = organizationSlug
      ? await this.prisma.organization.findUnique({
          where: { slug: organizationSlug },
          select: { id: true },
        })
      : null;

    if (!organization) {
      return { list: [], total: 0 };
    }

    const [list, total] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          organizationId: organization.id,
          deletedAt: null,
          isPublic: true,
          status: "ACTIVE",
          ...(q?.trim()
            ? { name: { contains: q.trim(), mode: "insensitive" } }
            : {}),
        },
        orderBy: { name: "asc" },
        take: 100,
        select: {
          id: true,
          sku: true,
          barcode: true,
          name: true,
          description: true,
          salePriceUSD: true,
          wholesalePriceUSD: true,
          unit: true,
          taxRate: true,
          imageUrl: true,
          stock: true,
          categoryId: true,
        },
      }),
      this.prisma.product.count({
        where: {
          organizationId: organization.id,
          deletedAt: null,
          isPublic: true,
          status: "ACTIVE",
        },
      }),
    ]);

    // Ofertas con descuento real (D2): el mismo precio que pagará el carrito.
    const percentMap = await activeOfferPercentMap(
      this.prisma,
      organization.id,
      list.map((row) => row.id),
    );
    const decorated = list.map((row) => {
      const percent = percentMap.get(row.id) ?? 0;
      if (!percent) return { ...row, offerPercent: 0 };
      return {
        ...row,
        salePriceUSD: discountedPrice(Number(row.salePriceUSD), percent),
        offerPercent: percent,
        // Precio de lista original (S11): la tienda lo muestra tachado
        // junto al ya-descontado `salePriceUSD`, sin hacer cuentas abajo.
        listPriceUSD: Number(row.salePriceUSD),
      };
    });

    return { list: decorated, total };
  }

  @Get()
  @UseGuards(SessionAuthGuard)
  async list(
    @Req() request: RequestWithUser,
    @Query() query: ListProductsQueryDto,
  ) {
    const scope = await this.resolveScope(request);
    return this.productService.list(scope, query);
  }

  /** Distinct BOM components for the Materiales screen (must precede `:id`). */
  @Get("raw-materials")
  @UseGuards(SessionAuthGuard)
  async listRawMaterials(@Req() request: RequestWithUser) {
    const scope = await this.resolveScope(request);
    return this.productService.listRawMaterials(scope);
  }

  /** CSV import template (S1): must precede `:id` like `raw-materials`. */
  @Get("import/template")
  @UseGuards(SessionAuthGuard)
  template(@Res({ passthrough: true }) reply: FastifyReply) {
    reply.header("Content-Type", "text/csv; charset=utf-8");
    reply.header(
      "Content-Disposition",
      'attachment; filename="plantilla-productos.csv"',
    );
    return this.productImportService.template();
  }

  @Get(":id/stock-movements")
  @UseGuards(SessionAuthGuard)
  async listStockMovements(
    @Req() request: RequestWithUser,
    @Param("id") id: string,
    @Query() query: ListStockMovementsQueryDto,
  ) {
    const scope = await this.resolveScope(request);
    return this.productService.listStockMovements(scope, id, query);
  }

  @Get(":id")
  @UseGuards(SessionAuthGuard)
  async getOne(@Req() request: RequestWithUser, @Param("id") id: string) {
    const scope = await this.resolveScope(request);
    return this.productService.getOne(scope, id);
  }

  @Post()
  @UseGuards(SessionAuthGuard)
  async create(
    @Req() request: RequestWithUser,
    @Body() body: CreateProductDto,
  ) {
    const scope = await this.resolveScope(request);
    return this.productService.create(scope, body);
  }

  @Post(":id/stock")
  @UseGuards(SessionAuthGuard)
  async adjustStock(
    @Req() request: RequestWithUser,
    @Param("id") id: string,
    @Body() body: AdjustStockDto,
  ) {
    const scope = await this.resolveScope(request);
    return this.productService.adjustStock(scope, id, body);
  }

  // Presentations (S4, AVANZADO+): variants with an independent stock.
  @Get(":id/presentations")
  @UseGuards(SessionAuthGuard)
  async listPresentations(
    @Req() request: RequestWithUser,
    @Param("id") id: string,
  ) {
    const scope = await this.resolveScope(request);
    return this.presentationService.list(scope.organizationId, id);
  }

  @Post(":id/presentations")
  @UseGuards(SessionAuthGuard)
  async createPresentation(
    @Req() request: RequestWithUser,
    @Param("id") id: string,
    @Body() body: CreatePresentationDto,
  ) {
    const scope = await this.resolveScope(request);
    if (!scope.organizationId) {
      throw new UnauthorizedException(
        "Crea una organización para gestionar presentaciones.",
      );
    }
    return this.presentationService.create(scope.organizationId, id, body);
  }

  @Post(":id/decompose")
  @UseGuards(SessionAuthGuard)
  async decompose(
    @Req() request: RequestWithUser,
    @Param("id") id: string,
    @Body() body: DecomposeDto,
  ) {
    const scope = await this.resolveScope(request);
    if (!scope.organizationId) {
      throw new UnauthorizedException(
        "Crea una organización para descomponer stock.",
      );
    }
    return this.presentationService.decompose(scope.organizationId, id, body);
  }

  // Imágenes del producto (S8): la clave la sube el cliente a /api/file/upload.
  @Post(":id/images")
  @UseGuards(SessionAuthGuard)
  async addImage(
    @Req() request: RequestWithUser,
    @Param("id") id: string,
    @Body() body: { key?: string },
  ) {
    const scope = await this.resolveScope(request);
    if (!scope.organizationId || !body.key?.trim()) {
      throw new BadRequestException("Falta la imagen subida.");
    }
    const existing = await this.prisma.productImage.count({
      where: { productId: id },
    });
    const limits = await this.tenantSettings.imageLimits(scope.organizationId);
    if (existing >= limits.product) {
      throw new BadRequestException(
        `Tu plan permite ${limits.product} imagen(es) por producto.`,
      );
    }
    return this.prisma.productImage.create({
      data: {
        productId: id,
        key: body.key.trim(),
        position: existing,
      },
    });
  }

  @Delete("images/:imageId")
  @UseGuards(SessionAuthGuard)
  async removeImage(
    @Req() request: RequestWithUser,
    @Param("imageId") imageId: string,
  ) {
    const scope = await this.resolveScope(request);
    const image = await this.prisma.productImage.findFirst({
      where: { id: imageId },
      include: { product: { select: { organizationId: true } } },
    });
    if (!image || image.product.organizationId !== scope.organizationId) {
      throw new NotFoundException("Imagen no encontrada.");
    }
    await this.prisma.productImage.delete({ where: { id: imageId } });
    return { deleted: true };
  }

  @Patch(":id")
  @UseGuards(SessionAuthGuard)
  async update(
    @Req() request: RequestWithUser,
    @Param("id") id: string,
    @Body() body: UpdateProductDto,
  ) {
    // Catálogo online es de Avanzado+ (S10): publicar exige el módulo.
    if (body.isPublic === true) {
      const modules =
        (request.user as { entitlements?: { modules?: { key: string }[] } })
          ?.entitlements?.modules ?? [];
      if (!modules.some((m) => m.key === "CATALOG_ONLINE")) {
        throw new ForbiddenException(
          "Publicar en la tienda requiere el plan Avanzado o superior.",
        );
      }
    }
    const scope = await this.resolveScope(request);
    return this.productService.update(scope, id, body);
  }

  @Delete(":id")
  @UseGuards(SessionAuthGuard)
  async remove(@Req() request: RequestWithUser, @Param("id") id: string) {
    const scope = await this.resolveScope(request);
    return this.productService.remove(scope, id);
  }
}
