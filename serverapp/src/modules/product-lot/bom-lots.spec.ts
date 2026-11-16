import { applyBomStock } from "../../shared/utils/bom-stock";

describe("BOM sobre un insumo con rollos", () => {
  it("vender un compuesto consume el rollo del insumo y deja stock === suma", async () => {
    const state: any = {
      products: [{ id: "fabric", name: "Tela", stock: 10, status: "ACTIVE", isService: false, tracksLots: true }],
      lots: [{ id: "lot-1", productId: "fabric", presentationId: null, remainingQuantity: 10, active: true, receivedAt: new Date(2026, 0, 1), createdAt: new Date(2026, 0, 1) }],
      movements: [],
    };
    const tx: any = {
      productComponent: {
        findMany: async () => [{ componentId: "fabric", quantity: 2, component: state.products[0] }],
      },
      stockMovement: { create: async ({ data }: any) => { state.movements.push(data); return data; } },
      product: {
        findFirst: async ({ where = {} }: any = {}) => state.products.find((x: any) => x.id === where.id) ?? null,
        update: async ({ where, data }: any) => { const p = state.products.find((x: any) => x.id === where.id)!; Object.assign(p, data); return p; },
      },
      productLot: {
        count: async ({ where = {} }: any = {}) => state.lots.filter((l: any) => (where.productId === undefined || l.productId === where.productId) && (where.active === undefined || l.active === where.active)).length,
        findMany: async ({ where = {} }: any = {}) => state.lots.filter((l: any) => (where.productId === undefined || l.productId === where.productId) && (where.active === undefined || l.active === where.active)),
        findFirst: async ({ where = {} }: any = {}) => state.lots.find((l: any) => (where.id === undefined || l.id === where.id) && (where.productId === undefined || l.productId === where.productId) && (where.active === undefined || l.active === where.active)) ?? null,
        create: async ({ data }: any) => { const r = { id: `lot-${state.lots.length + 1}`, active: true, presentationId: null, ...data }; state.lots.push(r); return r; },
        update: async ({ where, data }: any) => { const r = state.lots.find((l: any) => l.id === where.id)!; Object.assign(r, data); return r; },
      },
    };
    await applyBomStock(tx, { organizationId: "org-1" }, "parent", 1, "VTA-1", "SALE", "venta");
    const lotsSum = state.lots.reduce((s: number, l: any) => s + Number(l.remainingQuantity), 0);
    expect(state.products[0].stock).toBe(8);
    expect(state.products[0].stock).toBe(lotsSum);
    expect(state.movements[0].lotId).toBe("lot-1");
  });
});
