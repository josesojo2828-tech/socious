import { SaleService } from "../sale/sale.service";
import { ProductService } from "../product/product.service";
import { planLotAllocation, sumLots } from "../product-lot/lot-stock";

const ORG = "org-1";

/** Stateful in-memory Prisma double: updates really mutate `state`. */
function makeDb(state: any) {
  const lotSum = (productId: string, presentationId: string | null) =>
    Math.round(
      state.lots
        .filter(
          (l: any) =>
            l.productId === productId &&
            l.presentationId === (presentationId ?? null) &&
            l.active,
        )
        .reduce((s: number, l: any) => s + Number(l.remainingQuantity), 0) * 100,
    ) / 100;

  const db: any = {
    productLot: {
      findMany: async ({ where = {}, orderBy }: any = {}) =>
        state.lots
          .filter(
            (l: any) =>
              (where.id === undefined || l.id === where.id) &&
              (where.productId === undefined || l.productId === where.productId) &&
              (where.presentationId === undefined ||
                l.presentationId === where.presentationId) &&
              (where.active === undefined || l.active === where.active),
          )
          .sort((a: any, b: any) => {
            const keys = Array.isArray(orderBy) ? orderBy : orderBy ? [orderBy] : [];
            for (const k of keys) {
              const f = Object.keys(k)[0];
              const dir = k[f] === "desc" ? -1 : 1;
              if (a[f] < b[f]) return -1 * dir;
              if (a[f] > b[f]) return 1 * dir;
            }
            return 0;
          }),
      findFirst: async ({ where = {} }: any = {}) =>
        state.lots.find(
          (l: any) =>
            (where.id === undefined || l.id === where.id) &&
            (where.productId === undefined || l.productId === where.productId) &&
            (where.presentationId === undefined ||
              l.presentationId === where.presentationId) &&
            (where.active === undefined || l.active === where.active),
        ) ?? null,
      count: async ({ where = {} }: any = {}) =>
        state.lots.filter(
          (l: any) =>
            (where.id === undefined || l.id === where.id) &&
            (where.productId === undefined || l.productId === where.productId) &&
            (where.presentationId === undefined ||
              l.presentationId === where.presentationId) &&
            (where.active === undefined || l.active === where.active),
        ).length,
      create: async ({ data }: any) => {
        const row = { id: `lot-${state.lots.length + 1}`, active: true, presentationId: null, ...data };
        state.lots.push(row);
        return row;
      },
      update: async ({ where, data }: any) => {
        const row = state.lots.find((l: any) => l.id === where.id)!;
        Object.assign(row, data);
        return row;
      },
    },
    product: {
      findFirst: async ({ where = {} }: any = {}) =>
        state.products.find((p: any) => p.id === where.id) ?? null,
      update: async ({ where, data }: any) => {
        const row = state.products.find((p: any) => p.id === where.id)!;
        Object.assign(row, data);
        return row;
      },
    },
    productPresentation: {
      findFirst: async ({ where = {} }: any = {}) =>
        state.presentations.find((p: any) => p.id === where.id) ?? null,
      update: async ({ where, data }: any) => {
        const row = state.presentations.find((p: any) => p.id === where.id)!;
        Object.assign(row, data);
        return row;
      },
    },
    stockMovement: {
      create: async ({ data }: any) => {
        state.movements.push(data);
        return data;
      },
      findFirst: async ({ where = {} }: any = {}) =>
        [...state.movements]
          .reverse()
          .find(
            (m: any) =>
              (where.productId === undefined || m.productId === where.productId) &&
              (where.lotId === undefined || m.lotId === where.lotId),
          ) ?? null,
    },
    productComponent: { findMany: async () => [] },
    sale: {
      findFirst: async () => state.sale,
      update: async ({ data }: any) => ({ ...state.sale, ...data }),
    },
    salePayment: { aggregate: async () => ({ _sum: { amountUSD: 0 } }) },
    client: { update: async () => ({}) },
  };
  return db;
}

function saleService(state: any) {
  const db = makeDb(state);
  const prisma = {
    ...db,
    $transaction: async (fn: any) => fn(db),
    $queryRaw: async () => [],
  };
  const deps = {
    resolveRates: async () => ({ rateBcv: 1, rateUsdt: 1 }),
    nextFormatted: async () => "VTA-1",
    get: async () => ({}),
    emit: () => {},
  };
  return new SaleService(prisma as any, deps as any, deps as any, deps as any, deps as any);
}

describe("invariante: Product.stock === suma de lotes activos", () => {
  it("anular una venta devuelve los metros al rollo, no solo al agregado", async () => {
    const state: any = {
      products: [{ id: "p-1", stock: "8.50", status: "ACTIVE", tracksLots: true, isService: false }],
      presentations: [],
      lots: [{ id: "lot-1", productId: "p-1", presentationId: null, remainingQuantity: 8.5, active: true }],
      movements: [],
      sale: {
        id: "s-1", saleNumber: "VTA-1", status: "COMPLETED", totalUSD: "4.00",
        clientId: null, organizationId: ORG,
        items: [{ productId: "p-1", productName: "Tela", quantity: "1.50", lotId: "lot-1" }],
      },
    };
    const service = saleService(state);
    await service.cancel({ organizationId: ORG } as any, "s-1");
    const lotsSum = Math.round(state.lots.reduce((s: number, l: any) => s + Number(l.remainingQuantity), 0) * 100) / 100;
    // The invariant the spec promises:
    expect(Number(state.products[0].stock)).toBe(lotsSum);
  });

  it("el ajuste manual mueve los lotes del producto controlado por rollos", async () => {
    const state: any = {
      products: [{ id: "p-1", stock: "8.50", status: "ACTIVE", tracksLots: true, isService: false }],
      presentations: [],
      lots: [{ id: "lot-1", productId: "p-1", presentationId: null, remainingQuantity: 8.5, active: true }],
      movements: [],
    };
    const db = makeDb(state);
    const prisma: any = { ...db, $transaction: async (fn: any) => fn(db), $queryRaw: async () => [] };
    const service = new ProductService(prisma);
    await service.adjustStock({ organizationId: ORG } as any, "p-1", { type: "IN", quantity: 2 } as any);
    const lotsSum = Math.round(state.lots.reduce((s: number, l: any) => s + Number(l.remainingQuantity), 0) * 100) / 100;
    expect(Number(state.products[0].stock)).toBe(lotsSum);
  });
});

describe("FIFO y rechazo", () => {
  it("desempata por createdAt cuando receivedAt coincide", async () => {
    const db = makeDb({
      products: [],
      presentations: [],
      lots: [
        { id: "b", productId: "p-1", presentationId: null, remainingQuantity: 5, active: true, receivedAt: new Date("2026-01-01"), createdAt: new Date("2026-02-01") },
        { id: "a", productId: "p-1", presentationId: null, remainingQuantity: 5, active: true, receivedAt: new Date("2026-01-01"), createdAt: new Date("2026-01-01") },
      ],
      movements: [],
    });
    const plan = await planLotAllocation(db, { productId: "p-1", quantity: 2 });
    expect(plan).toEqual([{ lotId: "a", quantity: 2 }]);
  });

  it("un plan rechazado no escribe nada", async () => {
    const state: any = {
      products: [],
      presentations: [],
      lots: [{ id: "a", productId: "p-1", presentationId: null, remainingQuantity: 1, active: true }],
      movements: [],
    };
    const db = makeDb(state);
    await expect(planLotAllocation(db, { productId: "p-1", quantity: 2 })).rejects.toThrow();
    expect(state.lots[0].remainingQuantity).toBe(1);
    expect(state.movements).toHaveLength(0);
  });
});
