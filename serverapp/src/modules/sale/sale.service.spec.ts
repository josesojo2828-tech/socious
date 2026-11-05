import { BadRequestException } from "@nestjs/common";
import { SaleService } from "./sale.service";

const ORG_A = "org-a";
const ORG_UUID = "11111111-1111-4111-8111-111111111111";
const ACTOR_UUID = "22222222-2222-4222-8222-222222222222";

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
  productPresentation: {
    findFirst: jest.fn().mockResolvedValue(null),
    update: jest.fn(),
  },
  stockMovement: {
    create: jest.fn((args: any) => Promise.resolve({ id: "m-1", ...args.data })),
  },
  productComponent: {
    findMany: jest.fn().mockResolvedValue([]),
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
    // Collections use the rate of the day the abono happened.
    resolveRatesAt: jest.fn().mockResolvedValue(RATES),
  };
  const sequenceService = {
    nextFormatted: jest.fn().mockResolvedValue("VTA-00001"),
  };
  const emitter = { emit: jest.fn() };
  const tenantSettings = {
    get: jest.fn().mockResolvedValue({ cash: { shiftControl: true } }),
  };
  const service = new SaleService(
    prisma as any,
    exchangeService as any,
    sequenceService as any,
    tenantSettings as any,
    emitter as any,
  );
  return {
    service,
    prisma,
    tx,
    exchangeService,
    sequenceService,
    emitter,
    tenantSettings,
  };
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

    it("books the presentation stock in the kardex with its own row", async () => {
      const { service, tx } = makeService();
      tx.productPresentation.findFirst.mockResolvedValue({
        id: "pres-1",
        productId: "prod-1",
        name: "Bolsa 100 g",
        stock: "10.00",
        salePriceUSD: null,
      });

      await service.create(
        { organizationId: ORG_A, createdById: "u-1" },
        {
          items: [
            {
              productId: "prod-1",
              presentationId: "pres-1",
              productName: "Bolsa 100 g",
              quantity: 2,
              unitPriceUSD: 2,
            },
          ],
        },
      );

      expect(tx.stockMovement.create).toHaveBeenCalledTimes(1);
      expect(tx.stockMovement.create.mock.calls[0][0].data).toMatchObject({
        productId: "prod-1",
        presentationId: "pres-1",
        type: "SALE",
        quantity: 2,
        previousStock: 10,
        newStock: 8,
        reference: "VTA-00001",
        notes: "Venta de presentación Bolsa 100 g",
      });
      expect(tx.productPresentation.update.mock.calls[0][0].data.stock).toBe(8);
      // The product bulk never moves on a presentation sale.
      expect(tx.product.update).not.toHaveBeenCalled();
    });

    it("forces the presentation price when it has its own", async () => {
      const { service, tx } = makeService();
      tx.productPresentation.findFirst.mockResolvedValue({
        id: "pres-1",
        productId: "prod-1",
        name: "Bolsa 100 g",
        stock: "10.00",
        salePriceUSD: "3.50",
      });

      await service.create(
        { organizationId: ORG_A },
        {
          items: [
            {
              productId: "prod-1",
              presentationId: "pres-1",
              productName: "Bolsa 100 g",
              quantity: 2,
              // The client lies: the backend authority overrides it.
              unitPriceUSD: 99,
            },
          ],
        },
      );

      expect(tx.saleItem.create.mock.calls[0][0].data.unitPriceUSD).toBe(3.5);
      expect(tx.sale.create.mock.calls[0][0].data.subtotalUSD).toBe(7);
    });

    it("keeps the client price when the presentation inherits it", async () => {
      const { service, tx } = makeService();
      tx.productPresentation.findFirst.mockResolvedValue({
        id: "pres-1",
        productId: "prod-1",
        name: "Bolsa 100 g",
        stock: "10.00",
        salePriceUSD: null,
      });

      await service.create(
        { organizationId: ORG_A },
        {
          items: [
            {
              productId: "prod-1",
              presentationId: "pres-1",
              productName: "Bolsa 100 g",
              quantity: 1,
              unitPriceUSD: 2.25,
            },
          ],
        },
      );

      expect(tx.saleItem.create.mock.calls[0][0].data.unitPriceUSD).toBe(2.25);
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

  describe("cash shift gate (S2)", () => {
    const item = [
      {
        productId: "prod-1",
        productName: "Arroz 1kg",
        quantity: 1,
        unitPriceUSD: 2,
      },
    ];

    it("refuses a sale tied to a shift when the tenant disabled shift control", async () => {
      const { service, tenantSettings } = makeService();
      tenantSettings.get.mockResolvedValue({ cash: { shiftControl: false } });

      await expect(
        service.create(
          { organizationId: ORG_A },
          { cashShiftId: "shift-1", items: item },
        ),
      ).rejects.toThrow(/control de caja está desactivado/);
    });

    it("accepts the same sale when shift control is on", async () => {
      const { service, tx } = makeService();
      tx.product.findFirst.mockResolvedValue(productOnShelf(50));

      const sale = await service.create(
        { organizationId: ORG_A, createdById: "u-1" },
        {
          cashShiftId: "shift-1",
          items: item,
          payments: [
            { amountOriginal: 2, currency: "USD", paymentMethod: "CASH_USD" },
          ],
        },
      );

      expect(sale).toBeTruthy();
      // The shift association lives on the collection, not on the document
      // (Sale has no cashShiftId column).
      expect(tx.salePayment.create.mock.calls[0][0].data.cashShiftId).toBe(
        "shift-1",
      );
    });

    it("does not consult the setting at all when no shift is sent", async () => {
      const { service, tx, tenantSettings } = makeService();
      tx.product.findFirst.mockResolvedValue(productOnShelf(50));

      await service.create({ organizationId: ORG_A }, { items: item });

      expect(tenantSettings.get).not.toHaveBeenCalled();
    });
  });

  describe("activity telemetry (S11)", () => {
    it("emits erp.sale.created for the admin history", async () => {
      const { service, tx, emitter } = makeService();
      tx.product.findFirst.mockResolvedValue(productOnShelf(50));

      // The telemetry envelope validates UUID-shaped ids, so the fixture uses
      // real ones: `actorId` and `orgId` are stored as foreign keys.
      await service.create(
        {
          organizationId: ORG_UUID,
          createdById: ACTOR_UUID,
        },
        {
          items: [
            {
              productId: "prod-1",
              productName: "Arroz 1kg",
              quantity: 2,
              unitPriceUSD: 2,
            },
          ],
        },
      );

      expect(emitter.emit).toHaveBeenCalledWith(
        "erp.sale.created",
        expect.objectContaining({
          eventName: "erp.sale.created",
          actorId: ACTOR_UUID,
          orgId: ORG_UUID,
          source: "api",
          payload: expect.objectContaining({
            saleNumber: "VTA-00001",
            totalUSD: 4,
          }),
        }),
      );
    });

    it("stays silent when the caller has no actor (public submission)", async () => {
      const { service, tx, emitter } = makeService();
      tx.product.findFirst.mockResolvedValue(productOnShelf(50));

      await service.create(
        { organizationId: ORG_UUID },
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

      expect(emitter.emit).not.toHaveBeenCalled();
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
      // Pre-check reads the existing payments; the post-insert read includes
      // the one just created.
      tx.salePayment.findMany
        .mockResolvedValueOnce([{ amountUSD: "40.00" }])
        .mockResolvedValueOnce([
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
      tx.salePayment.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ amountUSD: "60.00" }]);
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

    it("uses the method's currency, not the client-sent field", async () => {
      const { service, tx } = makeService();
      tx.sale.findFirst.mockResolvedValue({
        id: "s-1",
        saleNumber: "VTA-00001",
        status: "COMPLETED",
        totalUSD: "1000.00",
        rateBcv: "800.0000",
        rateUsdt: "1000.0000",
        clientId: null,
        organizationId: ORG_A,
      });
      tx.salePayment.findMany.mockResolvedValue([]);
      tx.salePayment.create.mockResolvedValue({ id: "p-1" });

      await service.addPayment({ organizationId: ORG_A }, "s-1", {
        amountOriginal: 795,
        currency: "USD",
        paymentMethod: "PAGO_MOVIL",
      });

      const data = tx.salePayment.create.mock.calls[0][0].data;
      // Pago Móvil is VES: 795 Bs / 795 (rate on the collection day) = $1,
      // regardless of the "USD" the client sent.
      expect(data.currency).toBe("VES");
      expect(data.amountUSD).toBe(1);
    });

    it("rejects an abono larger than what the sale still owes", async () => {
      const { service, tx } = makeService();
      tx.sale.findFirst.mockResolvedValue({
        id: "s-1",
        saleNumber: "VTA-00001",
        status: "COMPLETED",
        totalUSD: "80.00",
        rateBcv: "894.8900",
        rateUsdt: "1016.9700",
        clientId: null,
        organizationId: ORG_A,
      });
      tx.salePayment.findMany.mockResolvedValue([{ amountUSD: "70.00" }]);

      await expect(
        service.addPayment({ organizationId: ORG_A }, "s-1", {
          amountOriginal: 20,
          currency: "USD",
          paymentMethod: "CASH_USD",
        }),
      ).rejects.toThrow(/supera lo que resta/);

      expect(tx.salePayment.create).not.toHaveBeenCalled();
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

    it("restores the presentation stock through the kardex", async () => {
      const { service, tx } = makeService();
      tx.sale.findFirst.mockResolvedValue({
        id: "s-1",
        saleNumber: "VTA-00001",
        status: "COMPLETED",
        totalUSD: "7.00",
        clientId: null,
        organizationId: ORG_A,
        items: [
          {
            productId: "prod-1",
            presentationId: "pres-1",
            productName: "Bolsa 100 g",
            quantity: "2.00",
          },
        ],
      });
      tx.salePayment.aggregate.mockResolvedValue({ _sum: { amountUSD: "0" } });
      tx.productPresentation.findFirst.mockResolvedValue({
        id: "pres-1",
        name: "Bolsa 100 g",
        stock: "8.00",
      });

      await service.cancel({ organizationId: ORG_A, createdById: "u-1" }, "s-1");

      expect(tx.stockMovement.create).toHaveBeenCalledTimes(1);
      expect(tx.stockMovement.create.mock.calls[0][0].data).toMatchObject({
        productId: "prod-1",
        presentationId: "pres-1",
        type: "RETURN",
        quantity: 2,
        previousStock: 8,
        newStock: 10,
        reference: "VTA-00001",
        notes: "Anulación de venta (presentación Bolsa 100 g)",
      });
      expect(tx.productPresentation.update.mock.calls[0][0].data.stock).toBe(10);
      expect(tx.product.update).not.toHaveBeenCalled();
    });
  });
});
