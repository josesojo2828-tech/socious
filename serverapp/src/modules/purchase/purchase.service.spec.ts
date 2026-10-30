import { ConflictException, NotFoundException } from "@nestjs/common";
import { PurchaseStatus } from "@prisma/client";
import { PurchaseService } from "./purchase.service";

const ORG_A = "org-a";
const RATES = { rateBcv: 795, rateUsdt: 938 };

const makeTx = () => ({
  purchase: {
    findFirst: jest.fn().mockResolvedValue(null),
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue({ id: "pu-1" }),
    count: jest.fn().mockResolvedValue(0),
    aggregate: jest.fn().mockResolvedValue({
      _sum: { totalUSD: 0, totalVES: 0, totalUSDT: 0 },
      _count: { id: 0 },
    }),
    create: jest.fn((args: any) =>
      Promise.resolve({
        id: "pu-1",
        purchaseNumber: "COM-00001",
        ...args.data,
      }),
    ),
    update: jest.fn((args: any) =>
      Promise.resolve({ id: args.where.id, ...args.data }),
    ),
  },
  purchaseItem: {
    create: jest.fn((args: any) => Promise.resolve({ id: "pi-1", ...args.data })),
  },
  purchasePayment: {
    create: jest.fn((args: any) =>
      Promise.resolve({ id: "pp-1", ...args.data }),
    ),
    findMany: jest.fn().mockResolvedValue([]),
    aggregate: jest.fn().mockResolvedValue({ _sum: { amountUSD: 0 } }),
  },
  product: {
    findFirst: jest.fn().mockResolvedValue(null),
    update: jest.fn(),
  },
  stockMovement: {
    create: jest.fn((args: any) => Promise.resolve({ id: "m-1", ...args.data })),
  },
  supplier: { update: jest.fn() },
});

const makeService = () => {
  const tx = makeTx();
  const prisma = { ...tx, $transaction: jest.fn(async (fn: any) => fn(tx)) };
  const service = new PurchaseService(
    prisma as any,
    { resolveRates: jest.fn().mockResolvedValue(RATES) } as any,
    { nextFormatted: jest.fn().mockResolvedValue("COM-00001") } as any,
  );
  return { service, prisma, tx };
};

const PURCHASE = {
  id: "pu-1",
  purchaseNumber: "COM-00001",
  status: PurchaseStatus.PENDING,
  totalUSD: "100.00",
  rateBcv: "795.0000",
  rateUsdt: "938.0000",
  supplierId: "sup-1",
  organizationId: ORG_A,
  items: [
    { productId: "prod-1", productName: "Arroz", quantity: "10.00", unitCostUSD: "1.00" },
  ],
};

describe("PurchaseService", () => {
  it("freezes the rates and numbers the purchase per tenant", async () => {
    const { service, tx, prisma } = makeService();

    await service.create({ organizationId: ORG_A }, {
      items: [{ productName: "Arroz", quantity: 10, unitCostUSD: 1 }],
    });

    expect(tx.purchase.create.mock.calls[0][0].data).toMatchObject({
      purchaseNumber: "COM-00001",
      rateBcv: 795,
      rateUsdt: 938,
      subtotalUSD: 10,
      totalUSD: 10,
      totalVES: 7950,
    });
    void prisma;
  });

  it("books stock only when the purchase is received", async () => {
    const { service, tx } = makeService();
    tx.purchase.findFirst.mockResolvedValue(PURCHASE);
    tx.product.findFirst.mockResolvedValue({
      id: "prod-1",
      stock: "5.00",
      isService: false,
    });

    await service.receive({ organizationId: ORG_A, createdById: "u-1" }, "pu-1");

    expect(tx.stockMovement.create.mock.calls[0][0].data).toMatchObject({
      type: "PURCHASE",
      quantity: 10,
      previousStock: 5,
      newStock: 15,
      reference: "COM-00001",
    });
    expect(tx.product.update.mock.calls[0][0].data).toMatchObject({
      stock: 15,
      costPriceUSD: 1,
    });
    expect(tx.purchase.update.mock.calls[0][0].data.status).toBe(
      PurchaseStatus.RECEIVED,
    );
  });

  it("refuses to receive the same purchase twice", async () => {
    const { service, tx } = makeService();
    tx.purchase.findFirst.mockResolvedValue({
      ...PURCHASE,
      status: PurchaseStatus.RECEIVED,
    });

    await expect(
      service.receive({ organizationId: ORG_A }, "pu-1"),
    ).rejects.toThrow(ConflictException);
  });

  it("keeps a supplier payment dated independently of the purchase", async () => {
    const { service, tx } = makeService();
    tx.purchase.findFirst.mockResolvedValue(PURCHASE);
    tx.purchasePayment.findMany.mockResolvedValue([{ amountUSD: "100.00" }]);

    const result = await service.addPayment({ organizationId: ORG_A }, "pu-1", {
      amountOriginal: 100,
      currency: "USD",
      paymentMethod: "TRANSFER",
      paidAt: "2026-05-10T12:00:00.000Z",
    });

    expect(tx.purchasePayment.create.mock.calls[0][0].data).toMatchObject({
      amountUSD: 100,
      paidAt: new Date("2026-05-10T12:00:00.000Z"),
      paymentMethod: "TRANSFER",
    });
    expect(result.paymentStatus).toBe("PAID");
    expect(tx.supplier.update.mock.calls[0][0].data).toEqual({
      currentBalanceUSD: { increment: -100 },
    });
  });

  it("refuses to cancel a purchase whose stock already moved", async () => {
    const { service, tx } = makeService();
    tx.purchase.findFirst.mockResolvedValue({
      ...PURCHASE,
      status: PurchaseStatus.RECEIVED,
    });

    await expect(
      service.cancel({ organizationId: ORG_A }, "pu-1"),
    ).rejects.toThrow(ConflictException);
  });

  it("raises NotFound for another tenant's purchase", async () => {
    const { service } = makeService();

    await expect(service.getOne({ organizationId: ORG_A }, "x")).rejects.toThrow(
      NotFoundException,
    );
  });

  it("separates purchases issued from payments made in the report", async () => {
    const { service, prisma } = makeService();

    prisma.purchase.findMany
      .mockResolvedValueOnce([
        { issueDate: new Date("2026-01-05T00:00:00Z"), totalUSD: "200.00" },
      ])
      .mockResolvedValueOnce([]);
    prisma.purchasePayment.findMany.mockResolvedValue([
      { paidAt: new Date("2026-04-20T00:00:00Z"), amountUSD: "200.00" },
    ]);
    prisma.purchase.aggregate.mockResolvedValue({
      _sum: { totalUSD: "200.00", totalVES: "159000.00", totalUSDT: "213.22" },
      _count: { id: 1 },
    });

    const report = await service.getReport({ organizationId: ORG_A }, {});

    expect(report.accrualByMonth).toEqual([
      { month: "2026-01", totalUSD: 200, count: 1 },
    ]);
    expect(report.paymentsByMonth).toEqual([
      { month: "2026-04", totalUSD: 200, count: 1 },
    ]);
  });
});
