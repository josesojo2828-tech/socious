import { BadRequestException } from "@nestjs/common";
import {
  applyLotOutflow,
  ensureOpeningLot,
  planLotAllocation,
  sumLots,
  syncAggregateStock,
} from "./lot-stock";

/**
 * Rollos (S3/S4): el stock agregado es siempre la suma de los lotes activos y
 * la venta consume el rollo elegido o, sin él, el más viejo primero (FIFO).
 */
interface FakeLot {
  id: string;
  organizationId: string | null;
  productId: string;
  presentationId: string | null;
  code: string | null;
  initialQuantity: number;
  remainingQuantity: number;
  receivedAt: Date;
  createdAt: Date;
  active: boolean;
}

const makeDb = (seed: {
  products?: any[];
  presentations?: any[];
  lots?: Partial<FakeLot>[];
}) => {
  const state = {
    products: (seed.products ?? []).map((row) => ({ ...row })),
    presentations: (seed.presentations ?? []).map((row) => ({ ...row })),
    lots: (seed.lots ?? []).map((row, index) => ({
      id: row.id ?? `lot-${index + 1}`,
      organizationId: row.organizationId ?? "org-1",
      productId: row.productId ?? "p-1",
      presentationId: row.presentationId ?? null,
      code: row.code ?? null,
      initialQuantity: row.initialQuantity ?? 0,
      remainingQuantity: row.remainingQuantity ?? 0,
      receivedAt: row.receivedAt ?? new Date(2026, 0, index + 1),
      createdAt: row.createdAt ?? new Date(2026, 0, index + 1),
      active: row.active ?? true,
    })),
    movements: [] as any[],
  };

  const matchesLot = (row: FakeLot, where: any = {}) =>
    (where.id === undefined || row.id === where.id) &&
    (where.productId === undefined || row.productId === where.productId) &&
    (where.presentationId === undefined ||
      row.presentationId === where.presentationId) &&
    (where.active === undefined || row.active === where.active);

  const sortLots = (rows: FakeLot[], orderBy: any) => {
    const keys = Array.isArray(orderBy) ? orderBy : orderBy ? [orderBy] : [];
    return [...rows].sort((left, right) => {
      for (const key of keys) {
        const field = Object.keys(key)[0] as keyof FakeLot;
        const direction = key[field] === "desc" ? -1 : 1;
        const a = left[field] as any;
        const b = right[field] as any;
        if (a < b) return -1 * direction;
        if (a > b) return 1 * direction;
      }
      return 0;
    });
  };

  const db: any = {
    productLot: {
      findMany: jest.fn(async ({ where, orderBy }: any = {}) => {
        const rows = state.lots.filter((row) => matchesLot(row, where));
        return sortLots(rows, orderBy);
      }),
      findFirst: jest.fn(async ({ where }: any = {}) => {
        return state.lots.find((row) => matchesLot(row, where)) ?? null;
      }),
      count: jest.fn(
        async ({ where }: any = {}) =>
          state.lots.filter((row) => matchesLot(row, where)).length,
      ),
      create: jest.fn(async ({ data }: any) => {
        const row: FakeLot = {
          id: `lot-${state.lots.length + 1}`,
          active: true,
          presentationId: null,
          code: null,
          receivedAt: new Date(2026, 5, 1),
          createdAt: new Date(2026, 5, 1),
          ...data,
        };
        state.lots.push(row);
        return row;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const row = state.lots.find((item) => item.id === where.id)!;
        Object.assign(row, data);
        return row;
      }),
    },
    product: {
      findFirst: jest.fn(
        async ({ where }: any = {}) =>
          state.products.find((row) => row.id === where.id) ?? null,
      ),
      update: jest.fn(async ({ where, data }: any) => {
        const row = state.products.find((item) => item.id === where.id)!;
        Object.assign(row, data);
        return row;
      }),
    },
    productPresentation: {
      findFirst: jest.fn(
        async ({ where }: any = {}) =>
          state.presentations.find((row) => row.id === where.id) ?? null,
      ),
      update: jest.fn(async ({ where, data }: any) => {
        const row = state.presentations.find((item) => item.id === where.id)!;
        Object.assign(row, data);
        return row;
      }),
    },
    stockMovement: {
      create: jest.fn(async ({ data }: any) => {
        state.movements.push(data);
        return data;
      }),
    },
  };

  return { db, state };
};

describe("lot-stock", () => {
  it("planifica FIFO: agota el rollo más viejo antes de tocar el siguiente", async () => {
    const { db } = makeDb({
      lots: [
        { id: "viejo", remainingQuantity: 3 },
        { id: "nuevo", remainingQuantity: 5, receivedAt: new Date(2026, 2, 1) },
      ],
    });

    const plan = await planLotAllocation(db, {
      productId: "p-1",
      quantity: 4,
    });

    expect(plan).toEqual([
      { lotId: "viejo", quantity: 3 },
      { lotId: "nuevo", quantity: 1 },
    ]);
  });

  it("con lote explícito consume solo ese rollo", async () => {
    const { db } = makeDb({
      lots: [
        { id: "viejo", remainingQuantity: 10 },
        { id: "nuevo", remainingQuantity: 10 },
      ],
    });

    const plan = await planLotAllocation(db, {
      productId: "p-1",
      quantity: 2,
      lotId: "nuevo",
    });

    expect(plan).toEqual([{ lotId: "nuevo", quantity: 2 }]);
  });

  it("falla cuando los lotes no alcanzan y no mueve nada", async () => {
    const { db, state } = makeDb({
      lots: [{ id: "unico", remainingQuantity: 1.5 }],
    });

    await expect(
      planLotAllocation(db, { productId: "p-1", quantity: 2 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(state.lots[0].remainingQuantity).toBe(1.5);
    expect(state.movements).toHaveLength(0);
  });

  it("falla si el rollo elegido no pertenece al producto", async () => {
    const { db } = makeDb({
      lots: [{ id: "ajeno", productId: "p-2", remainingQuantity: 10 }],
    });

    await expect(
      planLotAllocation(db, { productId: "p-1", quantity: 1, lotId: "ajeno" }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("descuenta cada rollo, deja un movimiento por lote y resincroniza el agregado", async () => {
    const { db, state } = makeDb({
      products: [{ id: "p-1", stock: 8, status: "ACTIVE" }],
      lots: [
        { id: "viejo", remainingQuantity: 3 },
        { id: "nuevo", remainingQuantity: 5, receivedAt: new Date(2026, 2, 1) },
      ],
    });

    await applyLotOutflow(db, {
      organizationId: "org-1",
      productId: "p-1",
      plan: [
        { lotId: "viejo", quantity: 3 },
        { lotId: "nuevo", quantity: 1 },
      ],
      reference: "VTA-00001",
    });

    expect(state.movements).toHaveLength(2);
    expect(state.movements[0]).toMatchObject({
      lotId: "viejo",
      quantity: 3,
      previousStock: 3,
      newStock: 0,
      reference: "VTA-00001",
    });
    expect(state.movements[1]).toMatchObject({
      lotId: "nuevo",
      previousStock: 5,
      newStock: 4,
    });
    expect(state.products[0].stock).toBe(4);
  });

  it("marca el producto sin stock cuando el último rollo queda en cero", async () => {
    const { db, state } = makeDb({
      products: [{ id: "p-1", stock: 2, status: "ACTIVE" }],
      lots: [{ id: "unico", remainingQuantity: 2 }],
    });

    await applyLotOutflow(db, {
      organizationId: "org-1",
      productId: "p-1",
      plan: [{ lotId: "unico", quantity: 2 }],
      reference: "VTA-00002",
    });

    expect(state.products[0].stock).toBe(0);
    expect(state.products[0].status).toBe("OUT_OF_STOCK");
  });

  it("suma solo los lotes activos del producto o de su presentación", async () => {
    const { db } = makeDb({
      lots: [
        { id: "a", remainingQuantity: 2 },
        { id: "b", remainingQuantity: 3, active: false },
        { id: "c", remainingQuantity: 4, presentationId: "pres-1" },
      ],
    });

    expect(await sumLots(db, "p-1", null)).toBe(2);
    expect(await sumLots(db, "p-1", "pres-1")).toBe(4);
  });

  it("captura como lote de apertura el stock que ya existía", async () => {
    const { db, state } = makeDb({
      products: [{ id: "p-1", stock: 12, status: "ACTIVE" }],
      lots: [],
    });

    await ensureOpeningLot(db, { organizationId: "org-1", productId: "p-1" });

    expect(state.lots).toHaveLength(1);
    expect(state.lots[0]).toMatchObject({
      code: "Apertura",
      initialQuantity: 12,
      remainingQuantity: 12,
    });
  });

  it("no crea apertura cuando ya hay lotes o no hay stock", async () => {
    const withLots = makeDb({
      products: [{ id: "p-1", stock: 5 }],
      lots: [{ id: "existente", remainingQuantity: 5 }],
    });
    await ensureOpeningLot(withLots.db, {
      organizationId: "org-1",
      productId: "p-1",
    });
    expect(withLots.state.lots).toHaveLength(1);

    const empty = makeDb({ products: [{ id: "p-1", stock: 0 }], lots: [] });
    await ensureOpeningLot(empty.db, {
      organizationId: "org-1",
      productId: "p-1",
    });
    expect(empty.state.lots).toHaveLength(0);
  });

  it("sincroniza el stock de la presentación desde sus lotes", async () => {
    const { db, state } = makeDb({
      presentations: [{ id: "pres-1", stock: 0 }],
      lots: [
        { id: "a", remainingQuantity: 1.5, presentationId: "pres-1" },
        { id: "b", remainingQuantity: 2.25, presentationId: "pres-1" },
      ],
    });

    const total = await syncAggregateStock(db, "p-1", "pres-1");

    expect(total).toBe(3.75);
    expect(state.presentations[0].stock).toBe(3.75);
  });
});
