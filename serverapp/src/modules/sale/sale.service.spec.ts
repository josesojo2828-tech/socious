import { BadRequestException } from "@nestjs/common";
import { SaleService } from "./sale.service";

const ORG_A = "org-a";

const RATES = { rateBcv: 795, rateUsdt: 938 };

const makeTx = () => ({
  sale: {
    findFirst: jest.fn().mockResolvedValue(null),
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue({ id: "s-1" }),
    count: jest.fn().mockResolvedValue(0),
    aggregate: jest.fn().mockResolvedValue({
      _sum: { totalUSD: 0, totalVES: 0, totalUSDT: 0 },
      _count: { id: 0 },
    }),
    create: jest.fn((args: any) =>
      Promise.resolve({ id: "s-1", saleNumber: "VTA-00001", ...args.data }),
    ),
    update: jest.fn((args: any) =>
      Promise.resolve({ id: args.where.id, ...args.data }),
    ),
  },
  saleItem: {
    create: jest.fn((args: any) => Promise.resolve({ id: "i-1", ...args.data })),
  },
  salePayment: {
    create: jest.fn((args: any) => Promise.resolve({ id: "p-1", ...args.data })),
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
  client: { update: jest.fn() },
  order: { updateMany: jest.fn() },
});

const makeService = () => {
  const tx = makeTx();
  const prisma = {
    ...tx,
    $transaction: jest.fn(async (fn: any) => fn(tx)),
  };
  const exchangeService = {
    resolveRates: jest.fn().mockResolvedValue(RATES),
  };
  const sequenceService = {
    nextFormatted: jest.fn().mockResolvedValue("VTA-00001"),
  };
  const service = new SaleService(
    prisma as any,
    exchangeService as any,
    sequenceService as any,
  );
  return { service, prisma, tx, exchangeService, sequenceService };
};

const productOnShelf = (stock: number, overrides: any = {}) => ({
  id: "prod-1",
  name: "Arroz 1kg",
  isService: false,
  salePriceUSD: "2.00",
  stock: String(stock),
  status: "ACTIVE",
  ...overrides,
});

describe("SaleService", () => {
  describe("create", () => {
    it("freezes the BCV/USDT snapshot on the document", async () => {
      const { service, tx } = makeService();
      tx.product.findFirst.mockResolvedValue(productOnShelf(50));

      const sale = await service.create(
        { organizationId: ORG_A, createdById: "u-1" },
        {
          items: [
            {
              productId: "prod-1",
              productName: "Arroz 1kg",
              quantity: 2,
              unitPriceUSD: 2,
            },
          ],
          payments: [],
        },
      );

      expect(tx.sale.create.mock.calls[0][0].data).toMatchObject({
        rateBcv: 795,
        rateUsdt: 938,
      });
      expect(sale).toBeTruthy();
    });

    it("converts the totals into the three currencies", async () => {
      const { service, tx } = makeService();
      tx.product.findFirst.mockResolvedValue(productOnShelf(50));

      await service.create(
        { organizationId: ORG_A },
        {
          items: [
            {
              productId: "prod-1",
              productName: "Arroz 1kg",
              quantity: 10,
              unitPriceUSD: 2,
            },
          ],
        },
      );

      // 10 x 2 USD = 20 USD → 20 x 795 = 15900 VES → 15900 / 938 USDT
      expect(tx.sale.create.mock.calls[0][0].data).toMatchObject({
        subtotalUSD: 20,
        totalUSD: 20,
        totalVES: 15900,
        totalUSDT: 16.95,
      });
    });

    it("deducts stock and records the kardex row", async () => {
      const { service, tx } = makeService();
      tx.product.findFirst.mockResolvedValue(productOnShelf(50));

      await service.create(
        { organizationId: ORG_A, createdById: "u-1" },
        {
          items: [
            {
              productId: "prod-1",
              productName: "Arroz 1kg",
              quantity: 3,
              unitPriceUSD: 2,
            },
          ],
        },
      );

      expect(tx.stockMovement.create.mock.calls[0][0].data).toMatchObject({
        type: "SALE",
        quantity: 3,
        previousStock: 50,
        newStock: 47,
        reference: "VTA-00001",
      });
      expect(tx.product.update.mock.calls[0][0].data.stock).toBe(47);
    });

    it("refuses to sell more than the available stock", async () => {
      const { service, tx } = makeService();
      tx.product.findFirst.mockResolvedValue(productOnShelf(2));

      await expect(
        service.create(
          { organizationId: ORG_A },
          {
            items: [
              {
                productId: "prod-1",
                productName: "Arroz 1kg",
                quantity: 5,
                unitPriceUSD: 2,
              },
            ],
          },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("never checks stock for services", async () => {
      const { service, tx } = makeService();
      tx.product.findFirst.mockResolvedValue(
        productOnShelf(0, { isService: true, name: "Consulta" }),
      );

      await service.create(
        { organizationId: ORG_A },
        {
          items: [
            {
              productId: "prod-1",
              productName: "Consulta",
              quantity: 1,
              unitPriceUSD: 20,
            },
          ],
        },
      );

      expect(tx.stockMovement.create).not.toHaveBeenCalled();
    });

    it("marks the sale as PAID when the payment covers the total", async () => {
      const { service, tx } = makeService();
      tx.product.findFirst.mockResolvedValue(productOnShelf(50));

      await service.create(
        { organizationId: ORG_A, createdById: "u-1" },
        {
          items: [
            {
              productId: "prod-1",
              productName: "Arroz 1kg",
              quantity: 5,
              unitPriceUSD: 2,
            },
          ],
          payments: [{ amountOriginal: 10, currency: "USD", paymentMethod: "CASH_USD" }],
        },
      );

      expect(tx.salePayment.create.mock.calls[0][0].data).toMatchObject({
        amountUSD: 10,
        amountVES: 7950,
        amountOriginal: 10,
        currency: "USD",
        paymentMethod: "CASH_USD",
      });
      expect(tx.sale.update.mock.calls[0][0].data.paymentStatus).toBe("PAID");
    });

    it("leaves the sale UNPAID when nothing was collected", async () => {
      const { service, tx } = makeService();
      tx.product.findFirst.mockResolvedValue(productOnShelf(50));

      await service.create(
        { organizationId: ORG_A },
        {
          items: [
            {
              productId: "prod-1",
              productName: "Arroz 1kg",
              quantity: 5,
              unitPriceUSD: 2,
            },
          ],
        },
      );

      expect(tx.sale.update.mock.calls[0][0].data.paymentStatus).toBe("UNPAID");
    });

    it("numbers the sale per tenant", async () => {
      const { service, sequenceService, tx } = makeService();
      tx.product.findFirst.mockResolvedValue(productOnShelf(50));

      await service.create(
        { organizationId: ORG_A },
        {
          items: [
            {
              productId: "prod-1",
              productName: "Arroz 1kg",
              quantity: 1,
              unitPriceUSD: 2,
            },
          ],
        },
      );

      expect(sequenceService.nextFormatted).toHaveBeenCalledWith(
        "SALE",
        ORG_A,
        "VTA",
        5,
        expect.anything(),
      );
    });
  });

  describe("accrual report (S7)", () => {
    it("counts a January sale as January even when it was collected in May", async () => {
      const { service, prisma } = makeService();

      prisma.sale.findMany
        .mockResolvedValueOnce([
          { issueDate: new Date("2026-01-15T12:00:00Z"), totalUSD: "100.00", paymentStatus: "PAID" },
        ])
        .mockResolvedValueOnce([
          {
            id: "s-1",
            saleNumber: "VTA-00001",
            issueDate: new Date("2026-01-15T12:00:00Z"),
            dueDate: null,
            totalUSD: "100.00",
            client: null,
          },
        ]);
      prisma.salePayment.findMany.mockResolvedValue([
        {
          paidAt: new Date("2026-05-10T12:00:00Z"),
          amountUSD: "100.00",
          saleId: "s-1",
        },
      ]);
      prisma.sale.aggregate.mockResolvedValue({
        _sum: { totalUSD: "100.00", totalVES: "79500.00", totalUSDT: "106.61" },
        _count: { id: 1 },
      });

      const report = await service.getReport(
        { organizationId: ORG_A },
        { from: "2026-01-01", to: "2026-12-31" },
      );

      expect(report.accrualByMonth).toEqual([
        { month: "2026-01", totalUSD: 100, count: 1 },
      ]);
      expect(report.collectionsByMonth).toEqual([
        { month: "2026-05", totalUSD: 100, count: 1 },
      ]);
      expect(report.issued).toMatchObject({
        count: 1,
        totalUSD: 100,
        totalVES: 79500,
        totalUSDT: 106.61,
      });
    });

    it("buckets overdue invoices into the AR aging", async () => {
      const { service, prisma } = makeService();

      prisma.sale.findMany
        .mockResolvedValueOnce([]) // accrued
        .mockResolvedValueOnce([
          {
            id: "old",
            saleNumber: "VTA-00009",
            issueDate: new Date("2025-01-01T00:00:00Z"),
            dueDate: new Date("2025-02-01T00:00:00Z"),
            totalUSD: "80.00",
            client: { id: "c-1", name: "Acme" },
          },
        ]);

      const report = await service.getReport({ organizationId: ORG_A }, {});

      expect(report.aging.over60).toBe(80);
      expect(report.openItems[0]).toMatchObject({
        saleNumber: "VTA-00009",
        daysOverdue: expect.any(Number),
      });
    });
  });

  describe("addPayment", () => {
    it("recomputes the payment status when a balance is settled", async () => {
      const { service, tx } = makeService();
      tx.sale.findFirst.mockResolvedValue({
        id: "s-1",
        saleNumber: "VTA-00001",
        status: "COMPLETED",
        totalUSD: "100.00",
        rateBcv: "795.0000",
        rateUsdt: "938.0000",
        clientId: "c-1",
        organizationId: ORG_A,
      });
      tx.salePayment.findMany.mockResolvedValue([
        { amountUSD: "40.00" },
        { amountUSD: "60.00" },
      ]);

      const result = await service.addPayment(
        { organizationId: ORG_A, createdById: "u-1" },
        "s-1",
        { amountOriginal: 60, currency: "USD", paymentMethod: "PAGO_MOVIL" },
      );

      expect(result.paymentStatus).toBe("PAID");
      expect(tx.sale.update.mock.calls[0][0].data.paymentStatus).toBe("PAID");
    });

    it("reduces the client outstanding balance by what was collected", async () => {
      const { service, tx } = makeService();
      tx.sale.findFirst.mockResolvedValue({
        id: "s-1",
        saleNumber: "VTA-00001",
        status: "COMPLETED",
        totalUSD: "100.00",
        rateBcv: "795.0000",
        rateUsdt: "938.0000",
        clientId: "c-1",
        organizationId: ORG_A,
      });
      tx.salePayment.findMany.mockResolvedValue([{ amountUSD: "60.00" }]);
      tx.salePayment.create.mockResolvedValue({
        id: "p-1",
        amountUSD: "60.00",
        amountVES: "47700.00",
      });

      await service.addPayment({ organizationId: ORG_A }, "s-1", {
        amountOriginal: 60,
        currency: "USD",
        paymentMethod: "CASH_USD",
      });

      expect(tx.client.update.mock.calls[0][0].data).toEqual({
        currentBalanceUSD: { increment: -60 },
      });
    });
  });

  describe("cancel", () => {
    it("returns the stock and keeps the collections", async () => {
      const { service, tx } = makeService();
      tx.sale.findFirst.mockResolvedValue({
        id: "s-1",
        saleNumber: "VTA-00001",
        status: "COMPLETED",
        totalUSD: "20.00",
        clientId: null,
        organizationId: ORG_A,
        items: [
          {
            productId: "prod-1",
            productName: "Arroz 1kg",
            quantity: "3.00",
          },
        ],
      });
      tx.salePayment.aggregate.mockResolvedValue({ _sum: { amountUSD: "5.00" } });
      tx.product.findFirst.mockResolvedValue(productOnShelf(47));

      await service.cancel({ organizationId: ORG_A, createdById: "u-1" }, "s-1");

      expect(tx.stockMovement.create.mock.calls[0][0].data).toMatchObject({
        type: "RETURN",
        quantity: 3,
        previousStock: 47,
        newStock: 50,
        reference: "VTA-00001",
      });
      expect(tx.sale.update.mock.calls[0][0].data.status).toBe("CANCELLED");
    });
  });
});
