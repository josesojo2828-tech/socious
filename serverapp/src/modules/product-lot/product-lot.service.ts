import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import {
  AdjustProductLotDto,
  CreateProductLotDto,
  ListProductLotsQueryDto,
  UpdateProductLotDto,
} from "./dto/product-lot.dto";
import {
  ensureOpeningLot,
  roundLot,
  syncAggregateStock,
} from "./lot-stock";

export interface ProductLotScope {
  organizationId: string | null;
  createdById?: string | null;
}

/**
 * Rollos y partidas (S3): solo existen para productos con `tracksLots`. El
 * stock agregado del producto (o de la presentación) siempre se recalcula desde
 * la suma de los lotes activos, así el kardex y el catálogo nunca se separan.
 */
@Injectable()
export class ProductLotService {
  constructor(private readonly prisma: PrismaService) {}

  private scopeWhere(organizationId: string | null) {
    return { organizationId };
  }

  /** A product that opts into lot control, inside this tenant. */
  private async trackedProduct(scope: ProductLotScope, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        ...this.scopeWhere(scope.organizationId),
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        isService: true,
        tracksLots: true,
      },
    });

    if (!product) throw new NotFoundException("Producto no encontrado.");
    if (product.isService) {
      throw new BadRequestException(
        `"${product.name}" es un servicio: no maneja rollos.`,
      );
    }
    if (!product.tracksLots) {
      throw new BadRequestException(
        `Activa el control por rollos de "${product.name}" antes de cargar un lote.`,
      );
    }
    return product;
  }

  /** A lot of this tenant, or 404 (another tenant's row never leaks). */
  private async ownLot(scope: ProductLotScope, id: string) {
    const lot = await this.prisma.productLot.findFirst({
      where: { id, ...this.scopeWhere(scope.organizationId) },
    });
    if (!lot) throw new NotFoundException("Rollo no encontrado.");
    return lot;
  }

  async list(scope: ProductLotScope, query: ListProductLotsQueryDto) {
    const lots = await this.prisma.productLot.findMany({
      where: {
        ...this.scopeWhere(scope.organizationId),
        productId: query.productId,
        ...(query.presentationId !== undefined && {
          presentationId: query.presentationId || null,
        }),
        ...(query.includeInactive ? {} : { active: true }),
      },
      orderBy: [{ receivedAt: "asc" }, { createdAt: "asc" }],
      include: { presentation: { select: { id: true, name: true } } },
    });

    const totalRemaining = roundLot(
      lots
        .filter((lot) => lot.active)
        .reduce((sum, lot) => sum + Number(lot.remainingQuantity), 0),
    );

    return { lots, totalRemaining };
  }

  /**
   * Carga un rollo. El stock que ya existía se captura primero como lote de
   * apertura, así el nuevo lote suma metros en vez de duplicar lo que había.
   */
  async create(scope: ProductLotScope, data: CreateProductLotDto) {
    const product = await this.trackedProduct(scope, data.productId);
    const quantity = roundLot(Number(data.quantity));

    return this.prisma.$transaction(async (tx) => {
      await ensureOpeningLot(tx, {
        organizationId: scope.organizationId,
        productId: product.id,
        presentationId: data.presentationId ?? null,
      });

      const lot = await tx.productLot.create({
        data: {
          organizationId: scope.organizationId,
          productId: product.id,
          presentationId: data.presentationId ?? null,
          code: data.code?.trim() || null,
          widthCm: data.widthCm ?? null,
          initialQuantity: quantity,
          remainingQuantity: quantity,
          unitCostUSD: data.unitCostUSD ?? null,
          receivedAt: data.receivedAt ? new Date(data.receivedAt) : new Date(),
          notes: data.notes?.trim() || null,
        },
      });

      await tx.stockMovement.create({
        data: {
          productId: product.id,
          presentationId: data.presentationId ?? null,
          lotId: lot.id,
          organizationId: scope.organizationId,
          createdById: scope.createdById ?? null,
          type: "IN",
          quantity,
          unitCostUSD: data.unitCostUSD ?? null,
          previousStock: 0,
          newStock: quantity,
          reference: "LOTE",
          notes: `Carga de rollo${lot.code ? ` ${lot.code}` : ""}`,
        },
      });

      const stock = await syncAggregateStock(
        tx,
        product.id,
        data.presentationId ?? null,
      );

      return { lot, stock };
    });
  }

  /** Datos descriptivos del rollo; los metros se mueven con `adjust`. */
  async update(scope: ProductLotScope, id: string, data: UpdateProductLotDto) {
    const lot = await this.ownLot(scope, id);

    if (data.active === false && Number(lot.remainingQuantity) > 0) {
      throw new BadRequestException(
        "Ajusta el rollo a cero antes de desactivarlo.",
      );
    }

    const updated = await this.prisma.productLot.update({
      where: { id: lot.id },
      data: {
        ...(data.code !== undefined && { code: data.code?.trim() || null }),
        ...(data.widthCm !== undefined && { widthCm: data.widthCm }),
        ...(data.unitCostUSD !== undefined && {
          unitCostUSD: data.unitCostUSD,
        }),
        ...(data.notes !== undefined && { notes: data.notes?.trim() || null }),
        ...(data.active !== undefined && { active: data.active }),
      },
    });

    const stock = await syncAggregateStock(
      this.prisma,
      updated.productId,
      updated.presentationId,
    );
    return { lot: updated, stock };
  }

  /** Conteo físico, merma o corrección: deja el rollo en los metros pedidos. */
  async adjust(scope: ProductLotScope, id: string, data: AdjustProductLotDto) {
    const lot = await this.ownLot(scope, id);
    const previous = roundLot(Number(lot.remainingQuantity));
    const next = roundLot(Number(data.remainingQuantity));

    if (previous === next) {
      const stock = await syncAggregateStock(
        this.prisma,
        lot.productId,
        lot.presentationId,
      );
      return { lot, stock };
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.productLot.update({
        where: { id: lot.id },
        data: { remainingQuantity: next },
      });

      await tx.stockMovement.create({
        data: {
          productId: lot.productId,
          presentationId: lot.presentationId,
          lotId: lot.id,
          organizationId: scope.organizationId,
          createdById: scope.createdById ?? null,
          type: "ADJUSTMENT",
          quantity: roundLot(Math.abs(next - previous)),
          previousStock: previous,
          newStock: next,
          reference: "AJUSTE_ROLLO",
          notes: data.notes?.trim() || null,
        },
      });

      const stock = await syncAggregateStock(
        tx,
        lot.productId,
        lot.presentationId,
      );
      return { lot: updated, stock };
    });
  }

  /** Un rollo con metros no se borra: se ajusta a cero primero. */
  async remove(scope: ProductLotScope, id: string) {
    const lot = await this.ownLot(scope, id);
    if (Number(lot.remainingQuantity) > 0) {
      throw new BadRequestException(
        "El rollo todavía tiene metros: ajusta a cero antes de eliminarlo.",
      );
    }
    const removed = await this.prisma.productLot.update({
      where: { id: lot.id },
      data: { active: false },
    });
    const stock = await syncAggregateStock(
      this.prisma,
      removed.productId,
      removed.presentationId,
    );
    return { lot: removed, stock };
  }
}
