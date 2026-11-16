import { SaleReturnService } from "../sale/sale-return.service";

const ORG = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const line = (overrides: any = {}) => ({
  id: "li-1", saleId: "sale-1", productId: "p-1", productName: "Tela",
  quantity: "5.00", unitPriceUSD: "2.00", discountUSD: "0.00", taxRate: "0.00",
  totalUSD: "10.00", lotId: "lot-1", presentationId: null, ...overrides,
});

function make(tracked: boolean, lots: any[], productStock: string) {
  const state = { lots: lots.map((l) => ({ active: true, presentationId: null, productId: "p-1", ...l })), movements: [] as any[] };
  const tx: any = {
    sale: { findFirst: async () => ({ id: "sale-1", saleNumber: "VTA-1", status: "COMPLETED", clientId: null, organizationId: ORG, rateBcv: "1", rateUsdt: "1", items: [line()] }) },
    saleReturn: { create: async (a: any) => ({ id: "ret-1", ...a.data }), findFirst: async () => null, findUnique: async () => ({ id: "ret-1" }), count: async () => 0, findMany: async () => [], update: async () => ({}) },
    saleReturnItem: { create: async (a: any) => ({ id: "ri-1", ...a.data }), findMany: async () => [] },
    product: {
      findFirst: async () => ({ id: "p-1", stock: productStock, isService: false, status: "ACTIVE", tracksLots: tracked }),
      update: async (a: any) => a.data,
    },
    productPresentation: { findFirst: async () => null, update: async () => ({}) },
    productLot: {
      findFirst: async ({ where = {} }: any) =>
        state.lots.find(
          (l: any) =>
            (where.id === undefined || l.id === where.id) &&
            (where.productId === undefined || l.productId === where.productId) &&
            (where.active === undefined || l.active === where.active),
        ) ?? null,
      findMany: async ({ where = {} }: any) => state.lots.filter((l: any) => (where.productId === undefined || l.productId === where.productId) && (where.active === undefined || l.active === where.active)),
      count: async ({ where = {} }: any) => state.lots.filter((l: any) => (where.productId === undefined || l.productId === where.productId) && (where.active === undefined || l.active === where.active)).length,
      create: async ({ data }: any) => { const r = { id: `lot-${state.lots.length + 1}`, active: true, ...data }; state.lots.push(r); return r; },
      update: async ({ where, data }: any) => { const r = state.lots.find((l: any) => l.id === where.id)!; Object.assign(r, data); return r; },
    },
    stockMovement: { create: async (a: any) => { state.movements.push(a.data); return a.data; } },
    productComponent: { findMany: async () => [] },
    client: { findFirst: async () => ({ currentBalanceUSD: "0" }), update: async () => ({}) },
    cashShift: { findFirst: async () => ({ id: "shift-1" }) },
    cashMovement: { create: async (a: any) => a.data },
  };
  const prisma: any = { ...tx, $transaction: async (fn: any) => fn(tx) };
  const seq = { nextFormatted: async () => "DEV-1" };
  const settings = { get: async () => ({ cash: { shiftControl: true } }) };
  const emitter = { emit: () => {} };
  const service = new SaleReturnService(prisma, seq as any, settings as any, emitter as any);
  const sumActive = () => state.lots.filter((l: any) => l.active).reduce((s: number, l: any) => s + Number(l.remainingQuantity), 0);
  return { service, state, sumActive };
}

describe("devolucion de venta con rollos", () => {
  it("devolver 2 m al rollo original deja stock === suma de lotes activos", async () => {
    const { service, state, sumActive } = make(true, [{ id: "lot-1", remainingQuantity: 3 }], "3.00");
    await service.create({ organizationId: ORG } as any, "sale-1", { items: [{ saleItemId: "li-1", quantity: 2 }] } as any);
    expect(state.lots[0].remainingQuantity).toBe(5);
    expect(sumActive()).toBe(5);
  });

  it("devolver a un rollo eliminado crea un lote de devolución (los metros no se pierden)", async () => {
    const { service, state, sumActive } = make(true, [{ id: "lot-1", remainingQuantity: 0, active: false }], "0.00");
    await service.create({ organizationId: ORG } as any, "sale-1", { items: [{ saleItemId: "li-1", quantity: 2 }] } as any);
    // El rollo original sigue inactivo; los metros vuelven en un lote activo.
    expect(state.lots[0].active).toBe(false);
    expect(state.lots[0].remainingQuantity).toBe(0);
    expect(sumActive()).toBe(2);
    const devolucion = state.lots.find((lot: any) => lot.code === "Devolución DEV-1");
    expect(devolucion).toBeTruthy();
    expect(devolucion.remainingQuantity).toBe(2);
  });
});
