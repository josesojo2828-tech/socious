import { ProductLotService } from "../product-lot/product-lot.service";

const ORG = "org-1";
function make(seedLots: any[] = [], stock = 0) {
  const state: any = {
    products: [{ id: "p-1", organizationId: ORG, name: "Tela", isService: false, tracksLots: true, stock, status: "ACTIVE", deletedAt: null }],
    presentations: [], lots: seedLots.map((l, i) => ({ id: l.id ?? `lot-${i + 1}`, organizationId: ORG, productId: "p-1", presentationId: null, active: true, remainingQuantity: 0, ...l })), movements: [],
  };
  const matches = (r: any, w: any = {}) => (w.id === undefined || r.id === w.id) && (w.productId === undefined || r.productId === w.productId) && (w.organizationId === undefined || r.organizationId === w.organizationId) && (w.active === undefined || r.active === w.active) && (w.presentationId === undefined || r.presentationId === w.presentationId);
  const db: any = {
    productLot: {
      findMany: async ({ where = {} }: any = {}) => state.lots.filter((r: any) => matches(r, where)),
      findFirst: async ({ where = {} }: any = {}) => state.lots.find((r: any) => matches(r, where)) ?? null,
      count: async ({ where = {} }: any = {}) => state.lots.filter((r: any) => matches(r, where)).length,
      create: async ({ data }: any) => { const r = { id: `lot-${state.lots.length + 1}`, active: true, presentationId: null, ...data }; state.lots.push(r); return r; },
      update: async ({ where, data }: any) => { const r = state.lots.find((l: any) => l.id === where.id)!; Object.assign(r, data); return r; },
    },
    product: { findFirst: async ({ where = {} }: any = {}) => state.products.find((p: any) => p.id === where.id) ?? null, update: async ({ where, data }: any) => { const r = state.products.find((p: any) => p.id === where.id)!; Object.assign(r, data); return r; } },
    productPresentation: { findFirst: async ({ where = {} }: any = {}) => state.presentations.find((p: any) => p.id === where.id) ?? null, update: async () => ({}) },
    stockMovement: { create: async ({ data }: any) => { state.movements.push(data); return data; } },
  };
  const prisma: any = { ...db, $transaction: async (fn: any) => fn(db) };
  const service = new ProductLotService(prisma);
  const sum = () => Math.round(state.lots.filter((l: any) => l.active).reduce((s: number, l: any) => s + Number(l.remainingQuantity), 0) * 100) / 100;
  return { service, state, sum };
}
const s = (st: any) => Number(st.products[0].stock);

describe("CRUD de rollos: invariante de stock", () => {
  it("create: opening + new roll keeps stock === sum", async () => {
    const { service, state, sum } = make([], 10);
    await service.create({ organizationId: ORG } as any, { productId: "p-1", quantity: 3 } as any);
    expect(s(state)).toBe(13); expect(sum()).toBe(13); expect(s(state)).toBe(sum());
  });
  it("adjust: stock === sum after a shrinkage", async () => {
    const { service, state, sum } = make([{ id: "lot-1", remainingQuantity: 8 }], 8);
    await service.adjust({ organizationId: ORG } as any, "lot-1", { remainingQuantity: 6.5 } as any);
    expect(s(state)).toBe(sum()); expect(sum()).toBe(6.5);
  });
  it("remove after zeroing: stock === sum", async () => {
    const { service, state, sum } = make([{ id: "lot-1", remainingQuantity: 4 }], 4);
    await service.adjust({ organizationId: ORG } as any, "lot-1", { remainingQuantity: 0 } as any);
    await service.remove({ organizationId: ORG } as any, "lot-1");
    expect(state.lots[0].active).toBe(false);
    expect(s(state)).toBe(sum()); expect(sum()).toBe(0);
  });
  it("remove refuses a roll that still has meters", async () => {
    const { service } = make([{ id: "lot-1", remainingQuantity: 4 }], 4);
    await expect(service.remove({ organizationId: ORG } as any, "lot-1")).rejects.toThrow();
  });
});
