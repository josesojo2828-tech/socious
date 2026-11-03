import { BadRequestException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { round2 } from "./money";
import { deriveProductStatus } from "src/modules/product/product.service";

/**
 * Bill-of-materials stock movements (S3): selling a composite consumes its
 * components; cancel/return puts them back. Runs inside the caller's
 * transaction so an insufficient component reverts the whole document.
 *
 * Direction "SALE" refuses to go negative (the accepted decision: block the
 * sale instead of letting the kardex lie). Components marked `isService`
 * are skipped — services carry no stock to move.
 */
export interface BomScope {
  organizationId: string | null;
  createdById?: string | null;
}

/** Prisma returns Decimal columns; Number() coerces them (and test doubles). */
interface BomComponentRow {
  componentId: string;
  quantity: unknown;
  component: {
    id: string;
    name: string;
    stock: unknown;
    isService: boolean;
    status: string;
  };
}

export async function applyBomStock(
  tx: Prisma.TransactionClient,
  scope: BomScope,
  productId: string,
  unitQuantity: number,
  reference: string,
  direction: "SALE" | "RETURN",
  parentLabel: string,
): Promise<void> {
  const rows: BomComponentRow[] = await tx.productComponent.findMany({
    where: { productId },
    include: {
      component: {
        select: {
          id: true,
          name: true,
          stock: true,
          isService: true,
          status: true,
        },
      },
    },
  });

  for (const row of rows) {
    if (row.component.isService) continue;

    const perSale = Number(row.quantity);
    if (!Number.isFinite(perSale) || perSale <= 0) continue;
    const needed = round2(unitQuantity * perSale);
    const available = Number(row.component.stock ?? 0);

    if (direction === "SALE") {
      if (available < needed) {
        throw new BadRequestException(
          `Stock insuficiente de "${row.component.name}": necesitás ${needed} y hay ${available}.`,
        );
      }
      const nextStock = round2(available - needed);
      await tx.stockMovement.create({
        data: {
          productId: row.componentId,
          organizationId: scope.organizationId,
          createdById: scope.createdById ?? null,
          type: "SALE",
          quantity: needed,
          previousStock: available,
          newStock: nextStock,
          reference,
          notes: `Consumo por ${parentLabel}`,
        },
      });
      await tx.product.update({
        where: { id: row.componentId },
        data: {
          stock: nextStock,
          status: deriveProductStatus(
            row.component.status as any,
            false,
            nextStock,
          ),
        },
      });
    } else {
      const nextStock = round2(available + needed);
      await tx.stockMovement.create({
        data: {
          productId: row.componentId,
          organizationId: scope.organizationId,
          createdById: scope.createdById ?? null,
          type: "RETURN",
          quantity: needed,
          previousStock: available,
          newStock: nextStock,
          reference,
          notes: `Devolución por ${parentLabel}`,
        },
      });
      await tx.product.update({
        where: { id: row.componentId },
        data: {
          stock: nextStock,
          status: deriveProductStatus(
            row.component.status as any,
            false,
            nextStock,
          ),
        },
      });
    }
  }
}
