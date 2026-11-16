import { SaleService } from "../sale/sale.service";

const ORG = "org-1";
function make(lots: any[], stock: number) {
  const state: any = {
    products: [{ id: "p-1", organizationId: ORG, name: "Tela", isService: false, stock, status: "ACTIVE", tracksLots: true, salePriceUSD: "4.00", deletedAt: null }],
    lots: lots.map((l, i) => ({ id: l.id ?? `lot-${i + 1}`, organizationId: ORG, productId: "p-1", presentationId: null, active: true, remainingQuantity: 0, receivedAt: new Date(2026, 0, i + 1), createdAt: new Date(2026, 0, i + 1), ...l })),
    movements: [], items: [],
  };
  const match = (r: any, w: any = {}) => (w.id === undefined || r.id === w.id) && (w.productId === undefined || r.productId === w.productId) && (w.active === undefined || r.active === w.active) && (w.presentationId === undefined || r.presentationId === w.presentationId);
  const tx: any = {
    product: {
      findFirst: async ({ where = {}, select }: any = {}) => { const p = state.products.find((x: any) => x.id === where.id) ?? null; return select ? p : p; },
      update: async ({ where, data }: any) => { const p = state.products.find((x: any) => x.id === where.id)!; Object.assign(p, data); return p; },
    },
    productLot: {
      count: async ({ where = {} }: any = {}) => state.lots.filter((r: any) => match(r, where)).length,
      findMany: async ({ where = {}, orderBy }: any = {}) => [...state.lots.filter((r: any) => match(r, where))].sort((a, b) => (a.receivedAt - b.receivedAt) || (a.createdAt - b.createdAt)),
      findFirst: async ({ where = {} }: any = {}) => state.lots.find((r: any) => match(r, where)) ?? null,
      create: async ({ data }: any) => { const r = { id: `lot-${state.lots.length + 1}`, active: true, presentationId: null, ...data }; state.lots.push(r); return r; },
      update: async ({ where, data }: any) => { const r = state.lots.find((l: any) => l.id === where.id)!; Object.assign(r, data); return r; },
    },
    productPresentation: { findFirst: async () => null, update: async () => ({}) },
    stockMovement: { create: async ({ data }: any) => { state.movements.push(data); return data; } },
    sale: { create: async ({ data }: any) => ({ id: "s-1", ...data }), findFirst: async () => null, findUnique: async () => ({ id: "s-1", saleNumber: "VTA-1", items: state.items, payments: [], client: null }), update: async (a: any) => ({ id: "s-1", ...a.data }) },
    saleItem: { create: async ({ data }: any) => { state.items.push(data); return { id: `i-${state.items.length}`, ...data }; } },
    salePayment: { create: async (a: any) => a.data, aggregate: async () => ({ _sum: { amountUSD: 0 } }), findMany: async () => [], groupBy: async () => [] },
    productComponent: { findMany: async () => [] },
    client: { update: async () => ({}) },
    order: { updateMany: async () => ({}) },
  };
  const prisma: any = { ...tx, $transaction: async (fn: any) => fn(tx) };
  const ex = { resolveRates: async () => ({ rateBcv: 1, rateUsdt: 1 }) };
  const seq = { nextFormatted: async () => "VTA-1" };
  const service = new SaleService(prisma, ex as any, seq as any, { get: async () => ({ cash: { shiftControl: false } }) } as any, { emit: () => {} } as any);
  const sum = () => Math.round(state.lots.filter((l: any) => l.active).reduce((s: number, l: any) => s + Number(l.remainingQuantity), 0) * 100) / 100;
  return { service, state, sum };
}

describe("venta con rollos (tracksLots)", () => {
  it("FIFO sale across two rolls keeps stock === sum and one movement per roll", async () => {
    const { service, state, sum } = make([{ id: "old", remainingQuantity: 3 }, { id: "new", remainingQuantity: 5 }], 8);
    await service.create({ organizationId: ORG } as any, { items: [{ productId: "p-1", productName: "Tela", quantity: 4, unitPriceUSD: 4 }] } as any);
    expect(sum()).toBe(4);
    expect(state.products[0].stock).toBe(sum());
    expect(state.movements.map((m: any) => m.lotId).sort()).toEqual(["new", "old"]);
    // Multi-lot line cannot name a single lot
    expect(state.items[0].lotId).toBeNull();
  });
  it("insufficient sale throws and changes nothing (plan phase)", async () => {
    const { service, state, sum } = make([{ id: "old", remainingQuantity: 1 }], 1);
    await expect(service.create({ organizationId: ORG } as any, { items: [{ productId: "p-1", productName: "Tela", quantity: 2, unitPriceUSD: 4 }] } as any)).rejects.toThrow();
    expect(sum()).toBe(1);
    expect(state.products[0].stock).toBe(1);
    expect(state.movements).toHaveLength(0);
    expect(state.items).toHaveLength(0);
  });
});
