import { PurchaseService } from "../purchase/purchase.service";

const ORG = "org-1";
function make(stock: number, existingLots: any[] = []) {
  const state: any = {
    products: [{ id: "prod-1", organizationId: ORG, name: "Tela", isService: false, stock, status: "ACTIVE", tracksLots: true, deletedAt: null }],
    lots: existingLots.map((l, i) => ({ id: l.id ?? `lot-${i + 1}`, organizationId: ORG, productId: "prod-1", presentationId: null, active: true, remainingQuantity: 0, ...l })),
    movements: [],
  };
  const match = (r: any, w: any = {}) => (w.id === undefined || r.id === w.id) && (w.productId === undefined || r.productId === w.productId) && (w.active === undefined || r.active === w.active) && (w.presentationId === undefined || r.presentationId === w.presentationId) && (w.organizationId === undefined || r.organizationId === w.organizationId);
  const tx: any = {
    purchase: {
      findFirst: async () => ({ id: "pu-1", purchaseNumber: "COM-1", status: "PENDING", deliveryDate: null, items: [{ productId: "prod-1", productName: "Tela", quantity: "4.00", unitCostUSD: "2.00" }] }),
      update: async (a: any) => ({ id: "pu-1", ...a.data }),
    },
    product: {
      findFirst: async ({ where = {}, select }: any = {}) => {
        const p = state.products.find((x: any) => x.id === where.id) ?? null;
        return select ? p : (p ? { ...p } : null);
      },
      update: async ({ where, data }: any) => { const p = state.products.find((x: any) => x.id === where.id)!; Object.assign(p, data); return p; },
    },
    productLot: {
      count: async ({ where = {} }: any = {}) => state.lots.filter((r: any) => match(r, where)).length,
      findMany: async ({ where = {} }: any = {}) => state.lots.filter((r: any) => match(r, where)),
      findFirst: async ({ where = {} }: any = {}) => state.lots.find((r: any) => match(r, where)) ?? null,
      create: async ({ data }: any) => { const r = { id: `lot-${state.lots.length + 1}`, active: true, presentationId: null, ...data }; state.lots.push(r); return r; },
      update: async ({ where, data }: any) => { const r = state.lots.find((l: any) => l.id === where.id)!; Object.assign(r, data); return r; },
    },
    stockMovement: { create: async ({ data }: any) => { state.movements.push(data); return data; } },
  };
  const prisma: any = { ...tx, $transaction: async (fn: any) => fn(tx) };
  const service = new PurchaseService(prisma, { resolveRates: async () => ({ rateBcv: 1, rateUsdt: 1 }) } as any, { nextFormatted: async () => "COM-1" } as any, { get: async () => ({ payments: { disabledCodes: [] } }) } as any);
  const sum = () => Math.round(state.lots.filter((l: any) => l.active).reduce((s: number, l: any) => s + Number(l.remainingQuantity), 0) * 100) / 100;
  return { service, state, sum };
}

describe("recepción de compra con rollos", () => {
  it("receiving a purchase of a lot product keeps stock === sum(active lots)", async () => {
    const { service, state, sum } = make(5, [{ id: "opening", remainingQuantity: 5 }]);
    await service.receive({ organizationId: ORG } as any, "pu-1");
    expect(state.products[0].stock).toBe(9);
    expect(sum()).toBe(9);
    expect(state.lots.filter((l: any) => l.code === "COM-1")).toHaveLength(1);
  });
  it("receiving with legacy stock and no lots captures an opening lot first", async () => {
    const { service, state, sum } = make(5, []);
    await service.receive({ organizationId: ORG } as any, "pu-1");
    expect(state.products[0].stock).toBe(sum());
    expect(sum()).toBe(9);
  });
});
