import { BadRequestException, ConflictException } from "@nestjs/common";
import { SaleReturnService } from "./sale-return.service";

const ORG_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const RATES = { rateBcv: 795, rateUsdt: 938 };

const LINE = {
  id: "li-1",
  saleId: "sale-1",
  productId: "p-1",
  productName: "Arroz 1kg",
  quantity: "10.00",
  unitPriceUSD: "2.00",
  discountUSD: "0.00",
  taxRate: "0.00",
  totalUSD: "20.00",
};

const makeSale = (overrides: Record<string, unknown> = {}) => ({
  id: "sale-1",
  saleNumber: "VTA-00001",
  status: "COMPLETED",
  clientId: "c-1",
  organizationId: ORG_A,
  rateBcv: "795.0000",
  rateUsdt: "938.0000",
  items: [LINE],
  ...overrides,
});

const makeTx = (opts: {
  sale?: any;
  previousReturns?: any[];
  product?: any;
  client?: any;
  shift?: any;
} = {}) => ({
  sale: {
    findFirst: jest.fn().mockResolvedValue(opts.sale ?? makeSale()),
  },
  saleReturn: {
    create: jest.fn((args: any) =>
      Promise.resolve({ id: "ret-1", ...args.data }),
    ),
    findFirst: jest.fn().mockResolvedValue(null),
    findUnique: jest.fn().mockResolvedValue({ id: "ret-1" }),
    count: jest.fn().mockResolvedValue(0),
    findMany: jest.fn().mockResolvedValue([]),
    update: jest.fn(),
  },
  saleReturnItem: {
    create: jest.fn((args: any) => Promise.resolve({ id: "ri-1", ...args.data })),
    findMany: jest.fn().mockResolvedValue(opts.previousReturns ?? []),
  },
  product: {
    findFirst: jest.fn().mockResolvedValue(
      opts.product ?? {
        id: "p-1",
        stock: "10.00",
        isService: false,
        status: "ACTIVE",
      },
    ),
    update: jest.fn(),
  },
  stockMovement: {
    create: jest.fn((args: any) => Promise.resolve({ id: "m-1", ...args.data })),
  },
  client: {
    findFirst: jest
      .fn()
      .mockResolvedValue(opts.client ?? { currentBalanceUSD: "4.00" }),
    update: jest.fn(),
  },
  cashShift: {
    findFirst: jest.fn().mockResolvedValue(
      opts.shift === null ? null : opts.shift ?? { id: "shift-1" },
    ),
  },
  cashMovement: {
    create: jest.fn((args: any) => Promise.resolve({ id: "cm-1", ...args.data })),
  },
});

const makeService = (
  txOpts: Parameters<typeof makeTx>[0] = {},
  settings: any = { cash: { shiftControl: true } },
) => {
  const tx = makeTx(txOpts);
  const prisma = { ...tx, $transaction: jest.fn(async (fn: any) => fn(tx)) };
  const sequence = { nextFormatted: jest.fn().mockResolvedValue("DEV-00001") };
  const tenantSettings = { get: jest.fn().mockResolvedValue(settings) };
  const emitter = { emit: jest.fn() };

  const service = new SaleReturnService(
    prisma as any,
    sequence as any,
    tenantSettings as any,
    emitter as any,
  );

  return { service, tx, sequence, tenantSettings, emitter };
};

const threeArroz = () => ({
  items: [{ productId: "p-1", quantity: 3 }],
});

describe("SaleReturnService", () => {
  it("refuses to return more than was sold", async () => {
    const { service } = makeService();

    await expect(
      service.create({ organizationId: ORG_A }, "sale-1", {
        items: [{ saleItemId: "li-1", quantity: 11 }],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("counts what was already returned in a previous devolution", async () => {
    const { service } = makeService({
      previousReturns: [{ saleItemId: "li-1", quantity: "9.00" }],
    });

    await expect(
      service.create({ organizationId: ORG_A }, "sale-1", {
        items: [{ saleItemId: "li-1", quantity: 2 }],
      }),
    ).rejects.toThrow(/Se pueden devolver hasta 1/);
  });

  it("rejects an article that does not belong to the sale", async () => {
    const { service } = makeService();

    await expect(
      service.create({ organizationId: ORG_A }, "sale-1", {
        items: [{ productId: "otro-producto", quantity: 1 }],
      }),
    ).rejects.toThrow(/no pertenece a esta venta/);
  });

  it("refuses a return against a cancelled sale", async () => {
    const { service } = makeService({ sale: makeSale({ status: "CANCELLED" }) });

    await expect(
      service.create({ organizationId: ORG_A }, "sale-1", threeArroz()),
    ).rejects.toThrow(ConflictException);
  });

  it("restores the stock through the kardex with the DEV reference", async () => {
    const { service, tx } = makeService();

    await service.create({ organizationId: ORG_A, createdById: "u-1" }, "sale-1", threeArroz());

    expect(tx.stockMovement.create.mock.calls[0][0].data).toMatchObject({
      type: "RETURN",
      quantity: 3,
      previousStock: 10,
      newStock: 13,
      reference: "DEV-00001",
    });
    expect(tx.product.update.mock.calls[0][0].data.stock).toBe(13);
  });

  it("prices the return from the sale line, never from the client", async () => {
    const { service, tx } = makeService();

    const created = await service.create({ organizationId: ORG_A }, "sale-1", threeArroz());

    // 3 units at the sale's 2.00 → 6.00, converted with the sale's frozen rates
    expect(tx.saleReturn.create.mock.calls[0][0].data).toMatchObject({
      returnNumber: "DEV-00001",
      subtotalUSD: 6,
      taxUSD: 0,
      totalUSD: 6,
      totalVES: 4770,
      totalUSDT: 5.09,
      rateBcv: 795,
      rateUsdt: 938,
    });
    expect(created).toBeTruthy();
  });

  it("prorates the line discount instead of refunding the full price", async () => {
    const { service, tx } = makeService({
      sale: makeSale({
        items: [
          { ...LINE, discountUSD: "5.00", totalUSD: "15.00" },
        ],
      }),
    });

    await service.create({ organizationId: ORG_A }, "sale-1", {
      items: [{ saleItemId: "li-1", quantity: 5 }],
    });

    // line discount 5.00 over 10 units → 2.50 off for 5 units
    // subtotal 10.00 - 2.50 = 7.50
    expect(tx.saleReturn.create.mock.calls[0][0].data).toMatchObject({
      subtotalUSD: 7.5,
      totalUSD: 7.5,
    });
  });

  it("reduces the client balance without going below zero", async () => {
    const { service, tx } = makeService({
      client: { currentBalanceUSD: "4.00" },
    });

    await service.create({ organizationId: ORG_A }, "sale-1", threeArroz());

    // 4.00 owed - 6.00 returned → 0, never -2
    expect(tx.client.update.mock.calls[0][0].data).toEqual({
      currentBalanceUSD: 0,
    });
  });

  it("leaves the balance alone when the sale has no client", async () => {
    const { service, tx } = makeService({
      sale: makeSale({ clientId: null }),
    });

    await service.create({ organizationId: ORG_A }, "sale-1", threeArroz());

    expect(tx.client.update).not.toHaveBeenCalled();
  });

  it("books the refund as a drawer expense when an open turn is sent", async () => {
    const { service, tx } = makeService();

    await service.create({ organizationId: ORG_A, createdById: "u-1" }, "sale-1", {
      ...threeArroz(),
      cashShiftId: "shift-1",
      refundMethod: "CASH_USD",
      currency: "USD",
    });

    expect(tx.cashMovement.create.mock.calls[0][0].data).toMatchObject({
      cashShiftId: "shift-1",
      type: "EXPENSE",
      amount: 6,
      currency: "USD",
      paymentMethod: "CASH_USD",
      reason: "Devolución DEV-00001",
    });
  });

  it("converts the refund when the money went back in another currency", async () => {
    const { service, tx } = makeService();

    await service.create({ organizationId: ORG_A, createdById: "u-1" }, "sale-1", {
      ...threeArroz(),
      cashShiftId: "shift-1",
      refundMethod: "CASH_VES",
      currency: "VES",
    });

    expect(tx.cashMovement.create.mock.calls[0][0].data.amount).toBe(4770);
  });

  it("refuses a drawer refund while shift control is off (S2)", async () => {
    const { service, tx } = makeService(
      {},
      { cash: { shiftControl: false } },
    );

    await expect(
      service.create({ organizationId: ORG_A }, "sale-1", {
        ...threeArroz(),
        cashShiftId: "shift-1",
      }),
    ).rejects.toThrow(/control de caja está desactivado/);
    expect(tx.cashMovement.create).not.toHaveBeenCalled();
  });

  it("refuses a turn that is not open in this tenant", async () => {
    const { service } = makeService({ shift: null });

    await expect(
      service.create({ organizationId: ORG_A }, "sale-1", {
        ...threeArroz(),
        cashShiftId: "shift-otro",
      }),
    ).rejects.toThrow(/no está abierto en este negocio/);
  });

  it("emits erp.sale.returned for the admin history", async () => {
    const { service, emitter } = makeService();

    await service.create(
      { organizationId: ORG_A, createdById: "22222222-2222-4222-8222-222222222222" },
      "sale-1",
      threeArroz(),
    );

    expect(emitter.emit).toHaveBeenCalledWith(
      "erp.sale.returned",
      expect.objectContaining({
        eventName: "erp.sale.returned",
        payload: expect.objectContaining({
          returnNumber: "DEV-00001",
          totalUSD: 6,
        }),
      }),
    );
  });
});

describe("SaleReturnService — refundMethod vs métodos deshabilitados", () => {
  it("rejects a refund method the tenant disabled", async () => {
    const { service } = makeService({}, {
      cash: { shiftControl: true },
      payments: { disabledCodes: ["CASH_USD"] },
    });

    await expect(
      service.create({ organizationId: ORG_A }, "sale-1", {
        items: [{ saleItemId: "li-1", quantity: 1 }],
        refundMethod: "CASH_USD",
      }),
    ).rejects.toThrow(/deshabilitado/);
  });

  it("accepts a builtin refund method that is still enabled", async () => {
    const { service } = makeService();

    await expect(
      service.create({ organizationId: ORG_A }, "sale-1", {
        items: [{ saleItemId: "li-1", quantity: 1 }],
        refundMethod: "CASH_USD",
      }),
    ).resolves.toBeDefined();
  });
});
