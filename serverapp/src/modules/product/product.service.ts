import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import { ProductStatus, Prisma } from "@prisma/client";
import {
  AdjustStockDto,
  CreateProductDto,
  ListProductsQueryDto,
  ListStockMovementsQueryDto,
  UpdateProductDto,
} from "./dto/product.dto";

import { EventEmitter2 } from "@nestjs/event-emitter";
import { emitEvent } from "src/shared/event/event-envelope";
import type { EventName } from "src/shared/event/event-taxonomy";
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

export interface ProductScope {
  organizationId: string | null;
  createdById?: string | null;
}

/**
 * Status stays explicit when the merchant chose one (INACTIVE / ON_SALE);
 * otherwise stock drives ACTIVE <-> OUT_OF_STOCK. Services ignore stock.
 */
export function deriveProductStatus(
  current: ProductStatus,
  isService: boolean,
  stock: number,
): ProductStatus {
  if (current === ProductStatus.INACTIVE || current === ProductStatus.ON_SALE) {
    return current;
  }
  if (isService) return ProductStatus.ACTIVE;
  return stock <= 0 ? ProductStatus.OUT_OF_STOCK : ProductStatus.ACTIVE;
}

const emptyPage = (limit: number, page: number) => ({
  list: [],
  total: 0,
  totalRecords: 0,
  totalPages: 0,
  currentPage: page,
  limit,
  hasPrev: page > 1,
  hasNext: false,
});

@Injectable()
export class ProductService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter?: EventEmitter2,
  ) {}

  private scopeWhere(organizationId: string | null): Prisma.ProductWhereInput {
    return { organizationId, deletedAt: null };
  }

  async list(scope: ProductScope, query: ListProductsQueryDto) {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(Math.max(query.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);

    const filters: Prisma.ProductWhereInput[] = [
      this.scopeWhere(scope.organizationId),
    ];

    if (query.status) filters.push({ status: query.status });
    if (query.categoryId) filters.push({ categoryId: query.categoryId });
    if (query.supplierId) filters.push({ supplierId: query.supplierId });
    if (query.variantOfId) filters.push({ variantOfId: query.variantOfId });
    if (query.isPublic !== undefined) filters.push({ isPublic: query.isPublic });

    if (query.lowStock) {
      const lowStockIds = await this.findLowStockIds(scope.organizationId);
      if (lowStockIds.length === 0) {
        return emptyPage(limit, page);
      }
      filters.push({ id: { in: lowStockIds } });
    }

    if (query.q?.trim()) {
      const q = query.q.trim();
      filters.push({
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { sku: { contains: q, mode: "insensitive" } },
          { barcode: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      });
    }

    const where: Prisma.ProductWhereInput = { AND: filters };
    const [list, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          category: true,
          supplier: true,
          images: { orderBy: { position: "asc" } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      list,
      total,
      totalRecords: total,
      totalPages,
      currentPage: page,
      limit,
      hasPrev: page > 1,
      hasNext: page < totalPages,
    };
  }

  /**
   * Raw materials (S6 "Materiales"): every product referenced as a BOM
   * component in this tenant, with how many composites consume it and their
   * names. The Materiales sidebar screen renders this.
   */
  async listRawMaterials(scope: ProductScope) {
    const rows = await this.prisma.productComponent.findMany({
      where: { component: { ...this.scopeWhere(scope.organizationId) } },
      include: {
        component: {
          include: {
            images: { orderBy: { position: "asc" }, take: 1 },
          },
        },
        product: { select: { id: true, name: true } },
      },
      orderBy: { component: { name: "asc" } },
    });

    const grouped = new Map<
      string,
      {
        component: (typeof rows)[number]["component"];
        parents: string[];
        usedIn: number;
      }
    >();
    for (const row of rows) {
      const existing = grouped.get(row.componentId);
      if (existing) {
        existing.parents.push(row.product.name);
        existing.usedIn += 1;
      } else {
        grouped.set(row.componentId, {
          component: row.component,
          parents: [row.product.name],
          usedIn: 1,
        });
      }
    }

    const list = [...grouped.values()].map((entry) => ({
      ...entry.component,
      usedIn: entry.usedIn,
      usedInNames: entry.parents,
    }));

    return { list, total: list.length };
  }

  async getOne(scope: ProductScope, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, ...this.scopeWhere(scope.organizationId) },
      include: {
        images: { orderBy: { position: "asc" } },
        category: true,
        supplier: true,
        components: {
          include: {
            component: {
              select: {
                id: true,
                name: true,
                sku: true,
                stock: true,
                unit: true,
                isService: true,
              },
            },
          },
          orderBy: { component: { name: "asc" } },
        },
        variants: {
          select: {
            id: true,
            name: true,
            sku: true,
            stock: true,
            unit: true,
            isService: true,
            images: {
              orderBy: { position: "asc" },
              take: 1,
              select: { key: true },
            },
          },
          orderBy: { name: "asc" },
        },
      },
    });

    if (!product) throw new NotFoundException("Producto no encontrado.");
    return product;
  }

  async create(scope: ProductScope, data: CreateProductDto) {
    await this.assertSkuAvailable(scope, data.sku);

    const stock = data.isService ? 0 : (data.stock ?? 0);
    const status =
      data.status ??
      deriveProductStatus(ProductStatus.ACTIVE, data.isService ?? false, stock);

    const product = await this.prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          sku: data.sku.trim(),
          barcode: data.barcode?.trim() || null,
          color: data.color?.trim() || null,
          name: data.name.trim(),
          description: data.description?.trim() || null,
          costPriceUSD: data.costPriceUSD ?? 0,
          salePriceUSD: data.salePriceUSD ?? 0,
          wholesalePriceUSD: data.wholesalePriceUSD ?? null,
          stock,
          minStock: data.minStock ?? 0,
          unit: data.unit?.trim() || "UND",
          taxRate: data.taxRate ?? 0,
          isService: data.isService ?? false,
          isPublic: data.isPublic ?? false,
          status,
          imageUrl: data.imageUrl?.trim() || null,
          categoryId: data.categoryId ?? null,
          supplierId: data.supplierId ?? null,
          variantOfId: data.variantOfId ?? null,
          organizationId: scope.organizationId,
        },
      });

      if (stock > 0) {
        await tx.stockMovement.create({
          data: {
            productId: created.id,
            organizationId: scope.organizationId,
            createdById: scope.createdById ?? null,
            type: "ADJUSTMENT",
            quantity: stock,
            unitCostUSD: data.costPriceUSD ?? null,
            previousStock: 0,
            newStock: stock,
            reference: "STOCK_INICIAL",
            notes: "Existencia inicial del producto",
          },
        });
      }

      if (data.components && data.components.length > 0) {
        await this.persistComponents(tx, scope, created.id, data.components);
        await tx.product.update({
          where: { id: created.id },
          data: { isComposite: true },
        });
      }

      return created;
    });

    return product;
  }

  async update(scope: ProductScope, id: string, data: UpdateProductDto) {
    const product = await this.getOne(scope, id);

    if (data.sku !== undefined && data.sku !== product.sku) {
      await this.assertSkuAvailable(scope, data.sku, id);
    }

    const isService = data.isService ?? product.isService;
    const nextStatus =
      data.status ??
      deriveProductStatus(
        product.status,
        isService,
        Number(product.stock ?? 0),
      );

    await this.prisma.product.update({
      where: { id },
      data: {
        ...(data.sku !== undefined && { sku: data.sku.trim() }),
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.barcode !== undefined && { barcode: data.barcode?.trim() || null }),
        ...(data.color !== undefined && { color: data.color?.trim() || null }),
        ...(data.description !== undefined && {
          description: data.description?.trim() || null,
        }),
        ...(data.costPriceUSD !== undefined && { costPriceUSD: data.costPriceUSD }),
        ...(data.salePriceUSD !== undefined && { salePriceUSD: data.salePriceUSD }),
        ...(data.wholesalePriceUSD !== undefined && {
          wholesalePriceUSD: data.wholesalePriceUSD ?? null,
        }),
        ...(data.minStock !== undefined && { minStock: data.minStock }),
        ...(data.unit !== undefined && { unit: data.unit?.trim() || "UND" }),
        ...(data.taxRate !== undefined && { taxRate: data.taxRate }),
        ...(data.isService !== undefined && { isService: data.isService }),
        ...(data.isPublic !== undefined && { isPublic: data.isPublic }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl?.trim() || null }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId ?? null }),
        ...(data.supplierId !== undefined && { supplierId: data.supplierId ?? null }),
        ...(data.components !== undefined && {
          isComposite: data.components.length > 0,
        }),
        status: nextStatus,
      },
    });

    if (data.components !== undefined) {
      await this.prisma.$transaction(async (tx) => {
        await tx.productComponent.deleteMany({ where: { productId: id } });
        if (data.components!.length > 0) {
          await this.persistComponents(tx, scope, id, data.components!);
        }
      });
    }

    return this.getOne(scope, id);
  }

  /**
   * Validates and writes BOM lines (S1). Components must belong to the same
   * tenant, differ from the parent and never repeat. Runs inside the caller's
   * transaction so a bad line rolls the whole product write back.
   */
  private async persistComponents(
    tx: Prisma.TransactionClient,
    scope: ProductScope,
    productId: string,
    inputs: NonNullable<CreateProductDto["components"]>,
  ): Promise<void> {
    const seen = new Set<string>();
    for (const input of inputs) {
      const componentId = input.componentId.trim();
      if (!componentId) {
        throw new BadRequestException("Cada componente necesita un producto.");
      }
      if (componentId === productId) {
        throw new BadRequestException(
          "Un producto no puede ser componente de sí mismo.",
        );
      }
      if (seen.has(componentId)) {
        throw new BadRequestException(
          "Hay componentes repetidos en la lista.",
        );
      }
      seen.add(componentId);

      const component = await tx.product.findFirst({
        where: {
          id: componentId,
          organizationId: scope.organizationId,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!component) {
        throw new BadRequestException(
          "Uno de los componentes no existe en tu catálogo.",
        );
      }

      await tx.productComponent.create({
        data: {
          productId,
          componentId,
          quantity: input.quantity,
        },
      });
    }
  }

  /** Soft delete: sale and purchase history keep pointing at the product. */
  async remove(scope: ProductScope, id: string) {
    await this.getOne(scope, id);

    await this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), isPublic: false },
    });

    return { id, deleted: true };
  }

  /**
   * Manual stock entry, exit or correction (Kardex).
   *
   * The movement records `previousStock`/`newStock` so the history is auditable
   * even when two people adjust the same product in the same minute.
   */
  async adjustStock(scope: ProductScope, id: string, data: AdjustStockDto) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: { id, ...this.scopeWhere(scope.organizationId) },
      });

      if (!product) throw new NotFoundException("Producto no encontrado.");
      if (product.isService) {
        throw new BadRequestException("Los servicios no tienen control de stock.");
      }

      const previousStock = Number(product.stock ?? 0);
      let nextStock: number;

      if (data.type === "ADJUSTMENT") {
        nextStock = data.newStock ?? data.quantity;
      } else if (data.type === "OUT") {
        nextStock = previousStock - data.quantity;
      } else {
        nextStock = previousStock + data.quantity;
      }

      if (nextStock < 0) {
        throw new BadRequestException(
          `Stock insuficiente: hay ${previousStock} y el movimiento requiere ${data.quantity}.`,
        );
      }

      const movement = await tx.stockMovement.create({
        data: {
          productId: product.id,
          organizationId: scope.organizationId,
          createdById: scope.createdById ?? null,
          type: data.type,
          quantity:
            data.type === "ADJUSTMENT"
              ? Math.abs(nextStock - previousStock)
              : data.quantity,
          unitCostUSD: data.unitCostUSD ?? null,
          previousStock,
          newStock: nextStock,
          reference: data.reference?.trim() || null,
          notes: data.notes?.trim() || null,
        },
      });

      const updated = await tx.product.update({
        where: { id: product.id },
        data: {
          stock: nextStock,
          status: deriveProductStatus(product.status, false, nextStock),
        },
      });

      this.emitBusinessEvent(
        "erp.product.stock_adjusted",
        scope.createdById,
        scope.organizationId,
        {
          productId: product.id,
          type: data.type,
          quantity: Number(movement.quantity ?? 0),
        },
      );

      return { product: updated, movement };
    });
  }

  async listStockMovements(
    scope: ProductScope,
    id: string,
    query: ListStockMovementsQueryDto,
  ) {
    await this.getOne(scope, id);

    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(Math.max(query.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);

    const where: Prisma.StockMovementWhereInput = {
      productId: id,
      organizationId: scope.organizationId,
      ...(query.type ? { type: query.type as any } : {}),
    };

    const [list, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      list,
      total,
      totalPages,
      currentPage: page,
      limit,
      hasPrev: page > 1,
      hasNext: page < totalPages,
    };
  }

  /**
   * Prisma cannot compare two columns in a `where`, so the low-stock filter is
   * resolved first with a parameterized raw query and the ids are handed back
   * to the regular query (pagination stays honest).
   */
  private async findLowStockIds(
    organizationId: string | null,
  ): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Product"
      WHERE "deletedAt" IS NULL
        AND "isService" = false
        AND "stock" <= "minStock"
        AND "organizationId" ${
          organizationId
            ? Prisma.sql`= ${organizationId}`
            : Prisma.sql`IS NULL`
        }
      LIMIT 1000
    `;

    return rows.map((row) => row.id);
  }

  private async assertSkuAvailable(
    scope: ProductScope,
    sku: string | undefined,
    excludeId?: string,
  ): Promise<void> {
    const normalized = sku?.trim();
    if (!normalized) return;

    const existing = await this.prisma.product.findFirst({
      where: {
        sku: normalized,
        organizationId: scope.organizationId,
        deletedAt: null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(`Ya existe un producto con el SKU "${normalized}".`);
    }
  }

  /** Fire-and-forget business telemetry (S11). */
  private emitBusinessEvent(
    eventName: EventName,
    actorId: string | null | undefined,
    organizationId: string | null,
    payload: Record<string, unknown>,
  ): void {
    if (!this.eventEmitter || !actorId) return;

    emitEvent(this.eventEmitter, {
      eventName,
      actorId,
      orgId: organizationId,
      source: "api",
      payload,
    });
  }

}
