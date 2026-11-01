import { BadRequestException, NotFoundException } from "@nestjs/common";
import { PresentationService } from "./presentation.service";

/**
 * Presentations contract (S4): variants own their stock; decomposition moves
 * bulk quantity into a presentation and never goes negative.
 */
const makeService = () => {
  const state = {
    product: {
      id: "prod-1",
      stock: { value: 10, lessThan: (q: any) => 10 < Number(q) },
    } as any,
    presentations: [
      {
        id: "pres-1",
        productId: "prod-1",
        name: "Bolsa 100 g",
        stock: { value: 0 },
        // `ownPresentation` walks the relation to check the tenant.
        product: { organizationId: "org-1", deletedAt: null },
      },
    ] as any[],
  };

  const prisma = {
    product: {
      findFirst: jest.fn(async ({ where }: any) =>
        where.id === "prod-1" && where.organizationId === "org-1"
          ? state.product
          : null,
      ),
      update: jest.fn(async ({ data }: any) => {
        if (data.stock?.decrement !== undefined) {
          state.product.stock.value -= Number(data.stock.decrement);
        }
        return state.product;
      }),
    },
    productPresentation: {
      findMany: jest.fn(async () => state.presentations),
      findFirst: jest.fn(async ({ where }: any) => {
        if (where.productId && where.id) {
          return (
            state.presentations.find(
              (row) => row.id === where.id && row.productId === where.productId,
            ) ?? null
          );
        }
        return (
          state.presentations.find(
            (row) =>
              row.id === where.id &&
              (!where.productId || row.productId === where.productId),
          ) ?? null
        );
      }),
      create: jest.fn(async ({ data }: any) => {
        const row = { id: `pres-${state.presentations.length + 1}`, stock: { value: data.stock ?? 0 }, ...data };
        state.presentations.push(row);
        return row;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const row = state.presentations.find((r) => r.id === where.id)!;
        const { stock, ...rest } = data;
        Object.assign(row, rest);
        if (stock?.increment !== undefined) {
          row.stock.value += Number(stock.increment);
        }
        return row;
      }),
      delete: jest.fn(async ({ where }: any) => {
        state.presentations = state.presentations.filter(
          (r) => r.id !== where.id,
        );
        return { id: where.id };
      }),
    },
    $transaction: jest.fn(async (ops: Promise<unknown>[]) =>
      Promise.all(ops),
    ),
  };

  return { service: new PresentationService(prisma as any), state, prisma };
};

describe("PresentationService", () => {
  it("lists presentations only after asserting product ownership", async () => {
    const { service } = makeService();
    const rows = await service.list("org-1", "prod-1");
    expect(rows).toHaveLength(1);
    await expect(service.list("org-2", "prod-1")).rejects.toThrow(
      NotFoundException,
    );
  });

  it("creates a presentation scoped to the organization", async () => {
    const { service, state } = makeService();
    const created = await service.create("org-1", "prod-1", {
      name: "Bolsa 250 g",
      stock: 4,
    });
    expect(created.organizationId).toBe("org-1");
    expect(state.presentations).toHaveLength(2);
  });

  it("stores an own sale price when provided and inherits when omitted", async () => {
    const { service, state } = makeService();
    const priced = await service.create("org-1", "prod-1", {
      name: "Bolsa 250 g",
      salePriceUSD: 3.5,
    });
    expect(priced.salePriceUSD).toBe(3.5);

    const inheriting = await service.create("org-1", "prod-1", {
      name: "Bolsa 500 g",
    });
    expect(inheriting.salePriceUSD).toBeNull();
  });

  it("updates the own sale price and clears it back to inherit with null", async () => {
    const { service, state } = makeService();
    const priced = await service.update("org-1", "pres-1", {
      salePriceUSD: 2.75,
    });
    expect(priced.salePriceUSD).toBe(2.75);

    const cleared = await service.update("org-1", "pres-1", {
      salePriceUSD: null,
    });
    expect(cleared.salePriceUSD).toBeNull();
  });

  it("leaves the sale price untouched when the patch omits it", async () => {
    const { service } = makeService();
    await service.update("org-1", "pres-1", { salePriceUSD: 4 });
    const renamed = await service.update("org-1", "pres-1", {
      name: "Bolsa 100 g Roja",
    });
    expect(renamed.salePriceUSD).toBe(4);
  });

  it("decomposes bulk stock into the presentation", async () => {
    const { service, state } = makeService();
    await service.decompose("org-1", "prod-1", {
      quantity: 3,
      presentationId: "pres-1",
    });
    expect(state.product.stock.value).toBe(7);
    expect(state.presentations[0].stock.value).toBe(3);
  });

  it("refuses to decompose more than the bulk stock", async () => {
    const { service } = makeService();
    await expect(
      service.decompose("org-1", "prod-1", {
        quantity: 50,
        presentationId: "pres-1",
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("rejects a presentation from another product", async () => {
    const { service } = makeService();
    await expect(
      service.decompose("org-1", "prod-1", {
        quantity: 1,
        presentationId: "nope",
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
