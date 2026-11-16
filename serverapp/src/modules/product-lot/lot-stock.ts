import { BadRequestException } from "@nestjs/common";
import { Prisma } from "@prisma/client";

/**
 * Lotes/rollos (S3/S4): primitivas compartidas por la venta, la recepción de
 * compras y el CRUD de rollos, para que el stock agregado nunca se separe de la
 * suma de sus lotes.
 *
 * Con `Product.tracksLots = false` este archivo no se toca para ese producto.
 */

type Db = Pick<
  Prisma.TransactionClient,
  "productLot" | "product" | "productPresentation" | "stockMovement"
>;

export interface LotAllocation {
  lotId: string;
  quantity: number;
}

const ACTIVE_LOT = { active: true } as const;

/** Two decimals, the same precision the Decimal(12,2) columns store. */
export function roundLot(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Active lots of one product, or of one of its presentations. */
function lotScope(productId: string, presentationId?: string | null) {
  return { productId, presentationId: presentationId ?? null };
}

export async function sumLots(
  db: Db,
  productId: string,
  presentationId?: string | null,
): Promise<number> {
  const rows = await db.productLot.findMany({
    where: { ...lotScope(productId, presentationId), ...ACTIVE_LOT },
    select: { remainingQuantity: true },
  });
  return roundLot(
    rows.reduce((sum, row) => sum + Number(row.remainingQuantity), 0),
  );
}

/**
 * Sources of truth of a lot-controlled product (or presentation): the sum of
 * its lots. Every write ends here so the aggregate column never drifts.
 */
export async function syncAggregateStock(
  db: Db,
  productId: string,
  presentationId?: string | null,
): Promise<number> {
  const total = await sumLots(db, productId, presentationId);

  if (presentationId) {
    await db.productPresentation.update({
      where: { id: presentationId },
      data: { stock: total },
    });
    return total;
  }

  const product = await db.product.findFirst({
    where: { id: productId },
    select: { status: true },
  });
  const data: Prisma.ProductUncheckedUpdateInput = { stock: total };
  if (total <= 0 && product && product.status !== "ON_SALE") {
    data.status = "OUT_OF_STOCK";
  }
  await db.product.update({ where: { id: productId }, data });
  return total;
}

/**
 * Stock that predates `tracksLots = true` has no lot behind it yet. The first
 * time the product is read or written under lot control, that stock becomes an
 * "Apertura" lot, so nothing is lost and the invariant holds from day one.
 */
export async function ensureOpeningLot(
  db: Db,
  params: {
    organizationId: string | null;
    productId: string;
    presentationId?: string | null;
  },
): Promise<void> {
  const existing = await db.productLot.count({
    where: { ...lotScope(params.productId, params.presentationId), ...ACTIVE_LOT },
  });
  if (existing > 0) return;

  const aggregate = params.presentationId
    ? await db.productPresentation.findFirst({
        where: { id: params.presentationId },
        select: { stock: true },
      })
    : await db.product.findFirst({
        where: { id: params.productId },
        select: { stock: true },
      });

  const stock = roundLot(Number(aggregate?.stock ?? 0));
  if (stock <= 0) return;

  await db.productLot.create({
    data: {
      organizationId: params.organizationId,
      productId: params.productId,
      presentationId: params.presentationId ?? null,
      code: "Apertura",
      initialQuantity: stock,
      remainingQuantity: stock,
      notes: "Stock previo al control por rollos",
    },
  });
}

/**
 * Plans which lots serve a sale line: the explicit one when the merchant picked
 * a roll, otherwise the oldest first (FIFO). Never mutates anything.
 */
export async function planLotAllocation(
  db: Db,
  params: {
    productId: string;
    presentationId?: string | null;
    quantity: number;
    lotId?: string | null;
    productName?: string;
  },
): Promise<LotAllocation[]> {
  const quantity = roundLot(params.quantity);

  if (params.lotId) {
    const lot = await db.productLot.findFirst({
      where: {
        id: params.lotId,
        ...lotScope(params.productId, params.presentationId),
        ...ACTIVE_LOT,
      },
      select: { id: true, code: true, remainingQuantity: true },
    });
    if (!lot) {
      throw new BadRequestException(
        "El rollo indicado no existe o no pertenece a este producto.",
      );
    }
    const available = roundLot(Number(lot.remainingQuantity));
    if (available < quantity) {
      throw new BadRequestException(
        `El rollo "${lot.code ?? lot.id}" tiene ${available} y se piden ${quantity}.`,
      );
    }
    return [{ lotId: lot.id, quantity }];
  }

  const lots = await db.productLot.findMany({
    where: { ...lotScope(params.productId, params.presentationId), ...ACTIVE_LOT },
    orderBy: [{ receivedAt: "asc" }, { createdAt: "asc" }],
    select: { id: true, remainingQuantity: true },
  });

  let pending = quantity;
  const plan: LotAllocation[] = [];
  for (const lot of lots) {
    if (pending <= 0) break;
    const available = roundLot(Number(lot.remainingQuantity));
    if (available <= 0) continue;
    const take = roundLot(Math.min(available, pending));
    plan.push({ lotId: lot.id, quantity: take });
    pending = roundLot(pending - take);
  }

  if (pending > 0) {
    const total = await sumLots(db, params.productId, params.presentationId);
    throw new BadRequestException(
      `Stock insuficiente para "${params.productName ?? params.productId}": hay ${total} y se piden ${quantity}.`,
    );
  }

  return plan;
}

/**
 * Applies a plan: decrements each lot, books one kardex row per roll touched
 * (with the lot attached) and finally resyncs the aggregate stock.
 */
export async function applyLotOutflow(
  db: Db,
  params: {
    organizationId: string | null;
    createdById?: string | null;
    productId: string;
    presentationId?: string | null;
    plan: LotAllocation[];
    reference: string;
    notes?: string | null;
    type?: "SALE" | "ADJUSTMENT";
  },
): Promise<string | null> {
  let firstLotId: string | null = null;

  for (const allocation of params.plan) {
    const lot = await db.productLot.findFirst({
      where: { id: allocation.lotId },
      select: { remainingQuantity: true },
    });
    if (!lot) continue;
    firstLotId = firstLotId ?? allocation.lotId;

    const previous = roundLot(Number(lot.remainingQuantity));
    const next = roundLot(previous - allocation.quantity);

    await db.productLot.update({
      where: { id: allocation.lotId },
      data: { remainingQuantity: next },
    });

    await db.stockMovement.create({
      data: {
        productId: params.productId,
        presentationId: params.presentationId ?? null,
        lotId: allocation.lotId,
        organizationId: params.organizationId,
        createdById: params.createdById ?? null,
        type: params.type ?? "SALE",
        quantity: allocation.quantity,
        previousStock: previous,
        newStock: next,
        reference: params.reference,
        notes: params.notes ?? null,
      },
    });
  }

  await syncAggregateStock(db, params.productId, params.presentationId);
  return firstLotId;
}

/**
 * Puts meters back. Only an ACTIVE lot can receive them: a return to a roll
 * that was already removed lands in a "Devolución" lot, so the meters never
 * disappear from the aggregate.
 */
export async function restoreLotQuantity(
  db: Db,
  params: {
    organizationId: string | null;
    createdById?: string | null;
    productId: string;
    presentationId?: string | null;
    lotId?: string | null;
    quantity: number;
    reference: string;
    notes?: string | null;
    type?: "RETURN" | "ADJUSTMENT";
  },
): Promise<string> {
  const quantity = roundLot(params.quantity);
  const target = params.lotId
    ? await db.productLot.findFirst({
        where: { id: params.lotId, ...ACTIVE_LOT },
        select: { id: true, remainingQuantity: true },
      })
    : await db.productLot.findFirst({
        where: { ...lotScope(params.productId, params.presentationId), ...ACTIVE_LOT },
        orderBy: [{ receivedAt: "desc" }, { createdAt: "desc" }],
        select: { id: true, remainingQuantity: true },
      });

  const movementType = params.type ?? "RETURN";

  if (target) {
    const previous = roundLot(Number(target.remainingQuantity));
    const next = roundLot(previous + quantity);
    await db.productLot.update({
      where: { id: target.id },
      data: { remainingQuantity: next },
    });
    await db.stockMovement.create({
      data: {
        productId: params.productId,
        presentationId: params.presentationId ?? null,
        lotId: target.id,
        organizationId: params.organizationId,
        createdById: params.createdById ?? null,
        type: movementType,
        quantity,
        previousStock: previous,
        newStock: next,
        reference: params.reference,
        notes: params.notes ?? null,
      },
    });
    await syncAggregateStock(db, params.productId, params.presentationId);
    return target.id;
  }

  const lot = await db.productLot.create({
    data: {
      organizationId: params.organizationId,
      productId: params.productId,
      presentationId: params.presentationId ?? null,
      code: `Devolución ${params.reference}`,
      initialQuantity: quantity,
      remainingQuantity: quantity,
      notes: params.notes ?? "Devuelto sin rollo identificado",
    },
  });
  await db.stockMovement.create({
    data: {
      productId: params.productId,
      presentationId: params.presentationId ?? null,
      lotId: lot.id,
      organizationId: params.organizationId,
      createdById: params.createdById ?? null,
      type: movementType,
      quantity,
      previousStock: 0,
      newStock: quantity,
      reference: params.reference,
      notes: params.notes ?? "Devolución en lote nuevo",
    },
  });
  await syncAggregateStock(db, params.productId, params.presentationId);
  return lot.id;
}

/**
 * Manual kardex adjustment on a lot-controlled product: an increase lands in
 * the newest roll (or a new "Ajuste" lot), a decrease consumes FIFO. Both end
 * by resyncing the aggregate, so a manual count never desyncs the stock.
 */
export async function adjustLots(
  db: Db,
  params: {
    organizationId: string | null;
    createdById?: string | null;
    productId: string;
    delta: number;
    reference: string;
    notes?: string | null;
    productName?: string;
  },
): Promise<string | null> {
  const delta = roundLot(params.delta);
  if (delta === 0) return null;

  if (delta > 0) {
    return restoreLotQuantity(db, {
      organizationId: params.organizationId,
      createdById: params.createdById,
      productId: params.productId,
      quantity: delta,
      reference: params.reference,
      notes: params.notes,
      type: "ADJUSTMENT",
    });
  }

  const plan = await planLotAllocation(db, {
    productId: params.productId,
    quantity: roundLot(-delta),
    productName: params.productName,
  });
  return applyLotOutflow(db, {
    organizationId: params.organizationId,
    createdById: params.createdById,
    productId: params.productId,
    plan,
    reference: params.reference,
    notes: params.notes,
    type: "ADJUSTMENT",
  });
}
