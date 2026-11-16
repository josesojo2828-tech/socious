import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ProductLotService } from "./product-lot.service";

/**
 * Rollos (S3): solo productos con `tracksLots`, el stock se recalcula desde los
 * lotes y un rollo con metros no se puede desactivar.
 */
const ORG = "org-1";

const makeService = (seed: {
  products?: any[];
  presentations?: any[];
  lots?: any[];
} = {}) => {
  const state = {
    products: (seed.products ?? []).map((row) => ({ ...row })),
    presentations: (seed.presentations ?? []).map((row) => ({ ...row })),
    lots: (seed.lots ?? []).map((row, index) => ({
      id: row.id ?? `lot-${index + 1}`,
      organizationId: row.organizationId ?? ORG,
      productId: row.productId ?? "p-1",
      presentationId: row.presentationId ?? null,
      code: row.code ?? null,
      widthCm: row.widthCm ?? null,
      initialQuantity: row.initialQuantity ?? 0,
      remainingQuantity: row.remainingQuantity ?? 0,
      unitCostUSD: row.unitCostUSD ?? null,
      notes: row.notes ?? null,
      active: row.active ?? true,
      receivedAt: row.receivedAt ?? new Date(2026, 0, index + 1),
      createdAt: new Date(2026, 0, index + 1),
    })),
    movements: [] as any[],
  };

  const matchesLot = (row: any, where: any = {}) =>
    (where.id === undefined || row.id === where.id) &&
    (where.organizationId === undefined ||
      row.organizationId === where.organizationId) &&
    (where.productId === undefined || row.productId === where.productId) &&
    (where.presentationId === undefined ||
      row.presentationId === where.presentationId) &&
    (where.active === undefined || row.active === where.active);

  const print: any = {
    productLot: {
      findMany: async ({ where }: any = {}) =>
        state.lots
          .filter((row) => matchesLot(row, where))
          .map((lot) => ({
            ...lot,
            presentation: state.presentations.find(
              (row) => row.id === lot.presentationId,
            )
              ? {
                  id: lot.presentationId,
                  name: state.presentations.find(
                    (row) => row.id === lot.presentationId,
                  ).name,
                }
              : null,
          })),
      findFirst: async ({ where }: any = {}) =>
        state.lots.find((row) => matchesLot(row, where)) ?? null,
      count: async ({ where }: any = {}) =>
        state.lots.filter((row) => matchesLot(row, where)).length,
      create: async ({ data }: any) => {
        const row = {
          id: `lot-${state.lots.length + 1}`,
          active: true,
          presentationId: null,
          code: null,
          widthCm: null,
          unitCostUSD: null,
          notes: null,
          receivedAt: new Date(2026, 5, 1),
          createdAt: new Date(2026, 5, 1),
          ...data,
        };
        state.lots.push(row);
        return row;
      },
      update: async ({ where, data }: any) => {
        const row = state.lots.find((item) => item.id === where.id)!;
        Object.assign(row, data);
        return row;
      },
    },
    product: {
      findFirst: async ({ where }: any = {}) =>
        state.products.find(
          (row) =>
            row.id === where.id &&
            (where.organizationId === undefined ||
              row.organizationId === where.organizationId) &&
            (where.deletedAt === undefined || row.deletedAt === where.deletedAt),
        ) ?? null,
      update: async ({ where, data }: any) => {
        const row = state.products.find((item) => item.id === where.id)!;
        Object.assign(row, data);
        return row;
      },
    },
    productPresentation: {
      findFirst: async ({ where }: any = {}) =>
        state.presentations.find((row) => row.id === where.id) ?? null,
      update: async ({ where, data }: any) => {
        const row = state.presentations.find((item) => item.id === where.id)!;
        Object.assign(row, data);
        return row;
      },
    },
    stockMovement: {
      create: async ({ data }: any) => {
        state.movements.push(data);
        return data;
      },
    },
  };
  const prisma: any = {
    ...print,
    $transaction: async (fn: any) => fn(print),
  };

  return { service: new ProductLotService(prisma), prisma, state };
};

const trackedProduct = {
  id: "p-1",
  organizationId: ORG,
  name: "Tela lino",
  isService: false,
  tracksLots: true,
  stock: 0,
  status: "ACTIVE",
  deletedAt: null,
};

describe("ProductLotService", () => {
  it("rechaza cargar un rollo en un producto sin control por lotes", async () => {
    const { service } = makeService({
      products: [{ ...trackedProduct, tracksLots: false }],
    });

    await expect(
      service.create(
        { organizationId: ORG },
        { productId: "p-1", quantity: 3 },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("captura el stock previo como apertura y suma el rollo nuevo", async () => {
    const { service, state } = makeService({
      products: [{ ...trackedProduct, stock: 10 }],
      lots: [],
    });

    const result = await service.create(
      { organizationId: ORG },
      { productId: "p-1", quantity: 3, code: "Rollo 1", widthCm: 140 },
    );

    expect(state.lots).toHaveLength(2);
    expect(state.lots[0]).toMatchObject({
      code: "Apertura",
      remainingQuantity: 10,
    });
    expect(state.lots[1]).toMatchObject({
      code: "Rollo 1",
      widthCm: 140,
      remainingQuantity: 3,
    });
    expect(result.stock).toBe(13);
    expect(state.products[0].stock).toBe(13);
    expect(state.movements).toHaveLength(1);
    expect(state.movements[0]).toMatchObject({ lotId: "lot-2", type: "IN" });
  });

  it("ajusta los metros del rollo y deja el movimiento en el kardex", async () => {
    const { service, state } = makeService({
      products: [{ ...trackedProduct, stock: 8 }],
      lots: [{ id: "lot-1", remainingQuantity: 8 }],
    });

    const result = await service.adjust({ organizationId: ORG }, "lot-1", {
      remainingQuantity: 6.5,
      notes: "merma por corte",
    });

    expect(result.lot.remainingQuantity).toBe(6.5);
    expect(result.stock).toBe(6.5);
    expect(state.movements[0]).toMatchObject({
      lotId: "lot-1",
      type: "ADJUSTMENT",
      quantity: 1.5,
      previousStock: 8,
      newStock: 6.5,
      notes: "merma por corte",
    });
  });

  it("no deja desactivar un rollo que todavía tiene metros", async () => {
    const { service } = makeService({
      products: [trackedProduct],
      lots: [{ id: "lot-1", remainingQuantity: 2 }],
    });

    await expect(
      service.update({ organizationId: ORG }, "lot-1", { active: false }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("no expone rollos de otra cuenta", async () => {
    const { service } = makeService({
      products: [trackedProduct],
      lots: [
        { id: "ajeno", organizationId: "org-2", remainingQuantity: 5 },
      ],
    });

    await expect(
      service.adjust({ organizationId: ORG }, "ajeno", {
        remainingQuantity: 1,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("lista los rollos activos con su total de metros", async () => {
    const { service } = makeService({
      products: [trackedProduct],
      lots: [
        { id: "a", remainingQuantity: 3 },
        { id: "b", remainingQuantity: 4.5 },
        { id: "c", remainingQuantity: 9, active: false },
      ],
    });

    const result = await service.list(
      { organizationId: ORG },
      { productId: "p-1" },
    );

    expect(result.lots).toHaveLength(2);
    expect(result.totalRemaining).toBe(7.5);
  });
});
