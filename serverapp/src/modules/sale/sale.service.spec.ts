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
    groupBy: jest.fn().mockResolvedValue([]),
  },
  product: {
    findFirst: jest.fn().mockResolvedValue(null),
    update: jest.fn(),
  },
  productPresentation: {
    findFirst: jest.fn().mockResolvedValue(null),
    update: jest.fn(),
  },
  organization: {
    findFirst: jest.fn().mockResolvedValue(null),
  },
  productLot: {
    findMany: jest.fn().mockResolvedValue([]),
    findFirst: jest.fn().mockResolvedValue(null),
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn((args: any) => Promise.resolve({ id: "lot-1", ...args.data })),
    update: jest.fn((args: any) =>
      Promise.resolve({ id: args.where.id, ...args.data }),
    ),
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

    it("acepta una cantidad fraccionaria aunque el producto no controle rollos", async () => {
      const { service, tx } = makeService();
      tx.product.findFirst.mockResolvedValue(productOnShelf(10));

      await service.create(
        { organizationId: ORG_A },
        {
          items: [
            {
              productId: "prod-1",
              productName: "Cable 2x14",
              quantity: 1.5,
              unitPriceUSD: 4,
            },
          ],
        },
      );

      expect(tx.stockMovement.create.mock.calls[0][0].data).toMatchObject({
        quantity: 1.5,
        previousStock: 10,
        newStock: 8.5,
      });
      expect(tx.saleItem.create.mock.calls[0][0].data).toMatchObject({
        quantity: 1.5,
        lotId: null,
      });
    });

    it("aplica el precio de mayoreo cuando la cantidad llega al mínimo", async () => {
      const { service, tx } = makeService();
      tx.organization.findFirst.mockResolvedValue({ isWholesaler: true });
      tx.product.findFirst.mockResolvedValue(
        productOnShelf(100, {
          name: "Arroz 1kg",
          wholesalePriceUSD: "3.00",
          wholesaleMinQuantity: "12.00",
        }),
      );

      await service.create(
        { organizationId: ORG_A },
        {
          items: [
            {
              productId: "prod-1",
              productName: "Arroz 1kg",
              quantity: 12,
              unitPriceUSD: 2,
            },
          ],
        },
      );

      // 12 × 3.00 (mayoreo), no 12 × 2.00 (el precio que mandó el cliente).
      expect(tx.sale.create.mock.calls[0][0].data).toMatchObject({
        subtotalUSD: 36,
        totalUSD: 36,
      });
    });

    it("cobra al detal por debajo del mínimo de mayoreo", async () => {
      const { service, tx } = makeService();
      tx.organization.findFirst.mockResolvedValue({ isWholesaler: true });
      tx.product.findFirst.mockResolvedValue(
        productOnShelf(100, {
          name: "Arroz 1kg",
          wholesalePriceUSD: "3.00",
          wholesaleMinQuantity: "12.00",
        }),
      );

      await service.create(
        { organizationId: ORG_A },
        {
          items: [
            {
              productId: "prod-1",
              productName: "Arroz 1kg",
              quantity: 11,
              unitPriceUSD: 2,
            },
          ],
        },
      );

      expect(tx.sale.create.mock.calls[0][0].data).toMatchObject({
        subtotalUSD: 22,
      });
    });

    it("ignora el mayoreo si el cliente no está marcado como mayorista", async () => {
      const { service, tx } = makeService();
      tx.organization.findFirst.mockResolvedValue({ isWholesaler: false });
      tx.product.findFirst.mockResolvedValue(
        productOnShelf(100, {
          name: "Arroz 1kg",
          wholesalePriceUSD: "3.00",
          wholesaleMinQuantity: "12.00",
        }),
      );

      await service.create(
        { organizationId: ORG_A },
        {
          items: [
            {
              productId: "prod-1",
              productName: "Arroz 1kg",
              quantity: 12,
              unitPriceUSD: 2,
            },
          ],
        },
      );

      expect(tx.sale.create.mock.calls[0][0].data).toMatchObject({
        subtotalUSD: 24,
      });
    });

    it("no repricea la importación histórica aunque el cliente sea mayorista", async () => {
      const { service, tx } = makeService();
      tx.organization.findFirst.mockResolvedValue({ isWholesaler: true });
      tx.product.findFirst.mockResolvedValue(
        productOnShelf(100, {
          name: "Arroz 1kg",
          wholesalePriceUSD: "3.00",
          wholesaleMinQuantity: "12.00",
        }),
      );

      await service.create(
        { organizationId: ORG_A },
        {
          items: [
            {
              productId: "prod-1",
              productName: "Arroz 1kg",
              quantity: 12,
              unitPriceUSD: 2,
            },
          ],
        },
        { skipStock: true },
      );

      expect(tx.sale.create.mock.calls[0][0].data).toMatchObject({
        subtotalUSD: 24,
      });
    });

    it("no repricea una venta que llega con el precio cerrado (pedido online)", async () => {
      const { service, tx } = makeService();
      tx.organization.findFirst.mockResolvedValue({ isWholesaler: true });
      tx.product.findFirst.mockResolvedValue(
        productOnShelf(100, {
          name: "Arroz 1kg",
          wholesalePriceUSD: "3.00",
          wholesaleMinQuantity: "12.00",
        }),
      );

      await service.create(
        { organizationId: ORG_A },
        {
          items: [
            {
              productId: "prod-1",
              productName: "Arroz 1kg",
              quantity: 12,
              unitPriceUSD: 2,
            },
          ],
        },
        { skipWholesale: true },
      );

      expect(tx.sale.create.mock.calls[0][0].data).toMatchObject({
        subtotalUSD: 24,
      });
    });

    it("un precio de mayoreo en cero no deja la venta en cero", async () => {
      const { service, tx } = makeService();
      tx.organization.findFirst.mockResolvedValue({ isWholesaler: true });
      tx.product.findFirst.mockResolvedValue(
        productOnShelf(100, {
          name: "Arroz 1kg",
          wholesalePriceUSD: "0.00",
          wholesaleMinQuantity: "12.00",
        }),
      );

      await service.create(
        { organizationId: ORG_A },
        {
          items: [
            {
              productId: "prod-1",
              productName: "Arroz 1kg",
              quantity: 12,
              unitPriceUSD: 2,
            },
          ],
        },
      );

      expect(tx.sale.create.mock.calls[0][0].data).toMatchObject({
        subtotalUSD: 24,
      });
    });

    it("vende 1.5 m de tela y descuenta el rollo elegido", async () => {
      const { service, tx } = makeService();
      tx.product.findFirst.mockResolvedValue(
        productOnShelf(10, { name: "Tela lino", tracksLots: true }),
      );

      let remaining = 10;
      tx.productLot.count.mockResolvedValue(1);
      tx.productLot.findMany.mockImplementation(async () => [
        { id: "lot-1", remainingQuantity: String(remaining) },
      ]);
      tx.productLot.findFirst.mockImplementation(async () => ({
        id: "lot-1",
        remainingQuantity: String(remaining),
      }));
      tx.productLot.update.mockImplementation(async ({ where, data }: any) => {
        remaining = Number(data.remainingQuantity);
        return { id: where.id, ...data };
      });

      await service.create(
        { organizationId: ORG_A, createdById: "u-1" },
        {
          items: [
            {
              productId: "prod-1",
              productName: "Tela lino",
              quantity: 1.5,
              unitPriceUSD: 4,
              lotId: "lot-1",
            },
          ],
        },
      );

      expect(tx.saleItem.create.mock.calls[0][0].data).toMatchObject({
        quantity: 1.5,
        lotId: "lot-1",
      });
      expect(tx.productLot.update.mock.calls[0][0]).toMatchObject({
        where: { id: "lot-1" },
        data: { remainingQuantity: 8.5 },
      });
      expect(tx.stockMovement.create.mock.calls[0][0].data).toMatchObject({
        lotId: "lot-1",
        quantity: 1.5,
        previousStock: 10,
        newStock: 8.5,
      });
      expect(tx.product.update.mock.calls[0][0].data.stock).toBe(8.5);
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

    it("stores an explicit saleNumber verbatim and skips the sequence", async () => {
      const { service, sequenceService, tx } = makeService();
      tx.product.findFirst.mockResolvedValue(productOnShelf(50));

      await service.create(
        { organizationId: ORG_A },
        {
          saleNumber: "V-2024-001",
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

      expect(tx.sale.create.mock.calls[0][0].data.saleNumber).toBe(
        "V-2024-001",
      );
      expect(sequenceService.nextFormatted).not.toHaveBeenCalled();
    });

    it("keeps the generated VTA number when saleNumber is omitted", async () => {
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
      expect(tx.sale.create.mock.calls[0][0].data.saleNumber).toBe("VTA-00001");
    });
  });

  describe("credit due date (S3)", () => {
    const item = [
      {
        productId: "prod-1",
        productName: "Arroz 1kg",
        quantity: 1,
        unitPriceUSD: 2,
      },
    ];

    it("computes a QUINCENAL due date from the sale's issueDate, not from today", async () => {
      const { service, tx } = makeService();
      tx.product.findFirst.mockResolvedValue(productOnShelf(50));
      // Local noon so the round-trip through ISO keeps the same local date.
      const issueDate = new Date(2026, 0, 10, 12, 0, 0); // 10 ene 2026

      await service.create(
        { organizationId: ORG_A, createdById: "u-1" },
        {
          issueDate: issueDate.toISOString(),
          creditCadence: "QUINCENAL",
          items: item,
        },
      );

      expect(tx.sale.create.mock.calls[0][0].data.dueDate).toEqual(
        new Date(2026, 0, 25, 12, 0, 0), // issueDate + 15 días
      );
    });

    it("computes an EVERY_N_DAYS due date from the issueDate", async () => {
      const { service, tx } = makeService();
      tx.product.findFirst.mockResolvedValue(productOnShelf(50));
      const issueDate = new Date(2026, 0, 10, 12, 0, 0); // 10 ene 2026

      await service.create(
        { organizationId: ORG_A, createdById: "u-1" },
        {
          issueDate: issueDate.toISOString(),
          creditCadence: "EVERY_N_DAYS",
          creditEveryNDays: 30,
          items: item,
        },
      );

      expect(tx.sale.create.mock.calls[0][0].data.dueDate).toEqual(
        new Date(2026, 1, 9, 12, 0, 0), // issueDate + 30 días
      );
    });

    it("keeps an explicit dueDate even when a cadence is present", async () => {
      const { service, tx } = makeService();
      tx.product.findFirst.mockResolvedValue(productOnShelf(50));
      const explicit = new Date(2026, 4, 1, 9, 0, 0); // 1 may 2026

      await service.create(
        { organizationId: ORG_A, createdById: "u-1" },
        {
          issueDate: new Date(2026, 0, 10, 12, 0, 0).toISOString(),
          dueDate: explicit.toISOString(),
          creditCadence: "QUINCENAL",
          items: item,
        },
      );

      const data = tx.sale.create.mock.calls[0][0].data;
      expect(data.dueDate).toEqual(explicit);
      expect(data.creditTerms).toContain('"cadence":"QUINCENAL"');
    });

    it("leaves FREE sales without a due date", async () => {
      const { service, tx } = makeService();
      tx.product.findFirst.mockResolvedValue(productOnShelf(50));

      await service.create(
        { organizationId: ORG_A, createdById: "u-1" },
        {
          issueDate: new Date(2026, 0, 10, 12, 0, 0).toISOString(),
          creditCadence: "FREE",
          items: item,
        },
      );

      expect(tx.sale.create.mock.calls[0][0].data.dueDate).toBeNull();
    });

    it("falls back to today when the issueDate cannot be parsed", async () => {
      const { service, tx } = makeService();
      tx.product.findFirst.mockResolvedValue(productOnShelf(50));

      await service.create(
        { organizationId: ORG_A, createdById: "u-1" },
        {
          issueDate: "not-a-date",
          creditCadence: "QUINCENAL",
          items: item,
        },
      );

      const dueDate = tx.sale.create.mock.calls[0][0].data.dueDate as Date;
      expect(Number.isNaN(dueDate.getTime())).toBe(false);
      const daysAhead =
        (dueDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
      expect(daysAhead).toBeGreaterThan(14);
      expect(daysAhead).toBeLessThan(16);
    });
  });

  describe("credit due date (S3)", () => {
    const item = [
      {
        productId: "prod-1",
        productName: "Arroz 1kg",
        quantity: 1,
        unitPriceUSD: 2,
      },
    ];

    it("computes a QUINCENAL due date from the sale's issueDate, not from today", async () => {
      const { service, tx } = makeService();
      tx.product.findFirst.mockResolvedValue(productOnShelf(50));
      // Local noon so the round-trip through ISO keeps the same local date.
      const issueDate = new Date(2026, 0, 10, 12, 0, 0); // 10 ene 2026

      await service.create(
        { organizationId: ORG_A, createdById: "u-1" },
        {
          issueDate: issueDate.toISOString(),
          creditCadence: "QUINCENAL",
          items: item,
        },
      );

      expect(tx.sale.create.mock.calls[0][0].data.dueDate).toEqual(
        new Date(2026, 0, 25, 12, 0, 0), // issueDate + 15 días
      );
    });

    it("computes an EVERY_N_DAYS due date from the issueDate", async () => {
      const { service, tx } = makeService();
      tx.product.findFirst.mockResolvedValue(productOnShelf(50));
      const issueDate = new Date(2026, 0, 10, 12, 0, 0); // 10 ene 2026

      await service.create(
        { organizationId: ORG_A, createdById: "u-1" },
        {
          issueDate: issueDate.toISOString(),
          creditCadence: "EVERY_N_DAYS",
          creditEveryNDays: 30,
          items: item,
        },
      );

      expect(tx.sale.create.mock.calls[0][0].data.dueDate).toEqual(
        new Date(2026, 1, 9, 12, 0, 0), // issueDate + 30 días
      );
    });

    it("keeps an explicit dueDate even when a cadence is present", async () => {
      const { service, tx } = makeService();
      tx.product.findFirst.mockResolvedValue(productOnShelf(50));
      const explicit = new Date(2026, 4, 1, 9, 0, 0); // 1 may 2026

      await service.create(
        { organizationId: ORG_A, createdById: "u-1" },
        {
          issueDate: new Date(2026, 0, 10, 12, 0, 0).toISOString(),
          dueDate: explicit.toISOString(),
          creditCadence: "QUINCENAL",
          items: item,
        },
      );

      const data = tx.sale.create.mock.calls[0][0].data;
      expect(data.dueDate).toEqual(explicit);
      expect(data.creditTerms).toContain('"cadence":"QUINCENAL"');
    });

    it("leaves FREE sales without a due date", async () => {
      const { service, tx } = makeService();
      tx.product.findFirst.mockResolvedValue(productOnShelf(50));

      await service.create(
        { organizationId: ORG_A, createdById: "u-1" },
        {
          issueDate: new Date(2026, 0, 10, 12, 0, 0).toISOString(),
          creditCadence: "FREE",
          items: item,
        },
      );

      expect(tx.sale.create.mock.calls[0][0].data.dueDate).toBeNull();
    });

    it("falls back to today when the issueDate cannot be parsed", async () => {
      const { service, tx } = makeService();
      tx.product.findFirst.mockResolvedValue(productOnShelf(50));

      await service.create(
        { organizationId: ORG_A, createdById: "u-1" },
        {
          issueDate: "not-a-date",
          creditCadence: "QUINCENAL",
          items: item,
        },
      );

      const dueDate = tx.sale.create.mock.calls[0][0].data.dueDate as Date;
      expect(Number.isNaN(dueDate.getTime())).toBe(false);
      const daysAhead =
        (dueDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
      expect(daysAhead).toBeGreaterThan(14);
      expect(daysAhead).toBeLessThan(16);
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

    it("contributes only the remaining balance of a partially paid sale", async () => {
      const { service, prisma } = makeService();

      prisma.sale.findMany
        .mockResolvedValueOnce([]) // accrued
        .mockResolvedValueOnce([
          {
            id: "partial",
            saleNumber: "VTA-00010",
            issueDate: new Date("2025-01-01T00:00:00Z"),
            dueDate: new Date("2020-01-01T00:00:00Z"),
            totalUSD: "100.00",
            client: { id: "c-1", name: "Acme" },
          },
        ]);
      prisma.sale.count.mockResolvedValue(1);
      prisma.salePayment.groupBy.mockResolvedValue([
        { saleId: "partial", _sum: { amountUSD: "30.00" } },
      ]);

      const report = await service.getReport({ organizationId: ORG_A }, {});

      // $100 invoiced − $30 collected = $70 still owed.
      expect(report.aging.over60).toBe(70);
      expect(report.openItems[0]).toMatchObject({
        totalUSD: 100,
        balanceUSD: 70,
        isOpen: false,
      });
    });

    it("books a sale without a due date as an open account, never overdue", async () => {
      const { service, prisma } = makeService();

      prisma.sale.findMany
        .mockResolvedValueOnce([]) // accrued
        .mockResolvedValueOnce([
          {
            id: "no-due",
            saleNumber: "VTA-00011",
            issueDate: new Date("2020-01-01T00:00:00Z"),
            dueDate: null,
            totalUSD: "50.00",
            client: null,
          },
        ]);
      prisma.sale.count.mockResolvedValue(1);

      const report = await service.getReport({ organizationId: ORG_A }, {});

      expect(report.aging.open).toBe(50);
      expect(report.aging.current).toBe(0);
      expect(report.aging.days1_30).toBe(0);
      expect(report.aging.days31_60).toBe(0);
      expect(report.aging.over60).toBe(0);
      expect(report.openItems[0]).toMatchObject({
        balanceUSD: 50,
        daysOverdue: 0,
        isOpen: true,
      });
    });

    it("reports truncated=true only when the open count exceeds the cap", async () => {
      const { service, prisma } = makeService();

      prisma.sale.findMany
        .mockResolvedValueOnce([]) // accrued
        .mockResolvedValueOnce([
          {
            id: "only-one-returned",
            saleNumber: "VTA-00012",
            issueDate: new Date("2025-01-01T00:00:00Z"),
            dueDate: new Date("2020-01-01T00:00:00Z"),
            totalUSD: "10.00",
            client: null,
          },
        ]);
      prisma.sale.count.mockResolvedValue(1001);

      const report = await service.getReport({ organizationId: ORG_A }, {});

      // The list query is capped at the documented constant.
      expect(prisma.sale.findMany.mock.calls[1][0].take).toBe(1000);
      expect(report.openItemsTotal).toBe(1001);
      expect(report.truncated).toBe(true);
    });

    it("reports truncated=false when every open sale fits under the cap", async () => {
      const { service, prisma } = makeService();

      prisma.sale.findMany
        .mockResolvedValueOnce([]) // accrued
        .mockResolvedValueOnce([
          {
            id: "fits",
            saleNumber: "VTA-00013",
            issueDate: new Date("2025-01-01T00:00:00Z"),
            dueDate: new Date("2020-01-01T00:00:00Z"),
            totalUSD: "10.00",
            client: null,
          },
        ]);
      prisma.sale.count.mockResolvedValue(1);

      const report = await service.getReport({ organizationId: ORG_A }, {});

      expect(report.openItemsTotal).toBe(1);
      expect(report.truncated).toBe(false);
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

  describe("cashea plan", () => {
    const bigItem = [
      {
        productId: "prod-1",
        productName: "Arroz 1kg",
        quantity: 1,
        unitPriceUSD: 100,
      },
    ];
    const plan = {
      initialUSD: 40,
      installmentCount: 3,
      installmentUSD: 20,
      firstDueDate: new Date(2026, 0, 20, 12, 0, 0).toISOString(),
    };

    const priceyProduct = () => productOnShelf(50, { salePriceUSD: "100.00" });

    it("freezes the plan and finances what the initial does not cover", async () => {
      const { service, tx } = makeService();
      tx.product.findFirst.mockResolvedValue(priceyProduct());

      await service.create(
        { organizationId: ORG_A, createdById: "u-1" },
        { items: bigItem, cashea: plan },
      );

      const data = tx.sale.create.mock.calls[0][0].data;
      expect(data.casheaInitialUSD).toBe(40);
      expect(data.casheaFinancedUSD).toBe(60);
      expect(data.casheaInstallmentCount).toBe(3);
      expect(data.casheaInstallmentUSD).toBe(20);
      expect(data.casheaFirstDueDate).toEqual(new Date(2026, 0, 20, 12, 0, 0));
    });

    it("never turns the financed part into client debt when the initial was paid", async () => {
      const { service, tx } = makeService();
      tx.product.findFirst.mockResolvedValue(priceyProduct());

      await service.create(
        { organizationId: ORG_A, createdById: "u-1" },
        {
          items: bigItem,
          clientId: "c-1",
          cashea: plan,
          payments: [
            { amountOriginal: 40, currency: "USD", paymentMethod: "CASH_USD" },
          ],
        },
      );

      expect(tx.client.update).not.toHaveBeenCalled();
    });

    it("charges the client only for the part of the initial not collected", async () => {
      const { service, tx } = makeService();
      tx.product.findFirst.mockResolvedValue(priceyProduct());

      await service.create(
        { organizationId: ORG_A, createdById: "u-1" },
        {
          items: bigItem,
          clientId: "c-1",
          cashea: plan,
          payments: [
            { amountOriginal: 10, currency: "USD", paymentMethod: "CASH_USD" },
          ],
        },
      );

      expect(tx.client.update.mock.calls[0][0].data).toEqual({
        currentBalanceUSD: { increment: 30 },
      });
    });

    it("rejects a plan whose initial plus installments do not match the total", async () => {
      const { service, tx } = makeService();
      tx.product.findFirst.mockResolvedValue(priceyProduct());

      await expect(
        service.create(
          { organizationId: ORG_A, createdById: "u-1" },
          {
            items: bigItem,
            cashea: { ...plan, installmentUSD: 10 },
          },
        ),
      ).rejects.toThrow(
        "Las cuotas de Cashea no cuadran: inicial + cuotas debe dar el total de la venta.",
      );
    });

    it("keeps a CASHEA settlement out of the client balance", async () => {
      const { service, tx } = makeService();
      tx.sale.findFirst.mockResolvedValue({
        id: "s-1",
        saleNumber: "VTA-00001",
        totalUSD: "100.00",
        status: "COMPLETED",
        clientId: "c-1",
        casheaInitialUSD: "40.00",
        casheaFinancedUSD: "60.00",
      });
      tx.salePayment.findMany.mockResolvedValue([
        { amountUSD: "40.00", paymentMethod: "CASH_USD" },
      ]);

      await service.addPayment({ organizationId: ORG_A }, "s-1", {
        amountOriginal: 20,
        currency: "USD",
        paymentMethod: "CASHEA",
      });

      expect(tx.client.update).not.toHaveBeenCalled();
    });

    it("caps a client abono at the initial it still owes", async () => {
      const { service, tx } = makeService();
      tx.sale.findFirst.mockResolvedValue({
        id: "s-1",
        saleNumber: "VTA-00001",
        totalUSD: "100.00",
        status: "COMPLETED",
        clientId: "c-1",
        casheaInitialUSD: "40.00",
        casheaFinancedUSD: "60.00",
      });
      // The initial was already collected in full.
      tx.salePayment.findMany.mockResolvedValue([
        { amountUSD: "40.00", paymentMethod: "CASH_USD" },
      ]);

      await service.addPayment({ organizationId: ORG_A }, "s-1", {
        amountOriginal: 20,
        currency: "USD",
        paymentMethod: "CASH_USD",
      });

      expect(tx.client.update).not.toHaveBeenCalled();
    });

    it("derives the 14-day schedule and what Cashea already settled", async () => {
      const { service, prisma } = makeService();
      prisma.sale.findFirst.mockResolvedValue({
        id: "s-1",
        saleNumber: "VTA-00001",
        totalUSD: "100.00",
        casheaInitialUSD: "40.00",
        casheaFinancedUSD: "60.00",
        casheaInstallmentCount: 3,
        casheaInstallmentUSD: "20.00",
        casheaFirstDueDate: new Date(2026, 0, 20, 12, 0, 0),
        payments: [{ amountUSD: "20.00" }],
      });

      const result = await service.getCasheaPlan(
        { organizationId: ORG_A },
        "s-1",
      );

      expect(result.cadenceDays).toBe(14);
      expect(result.schedule).toHaveLength(3);
      expect(result.schedule[1].dueDate).toEqual(
        new Date(2026, 1, 3, 12, 0, 0),
      );
      expect(result.receivedUSD).toBe(20);
      expect(result.pendingUSD).toBe(40);
    });

    it("keeps a Cashea sale out of the client receivables report", async () => {
      const { service, prisma } = makeService();
      prisma.sale.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      prisma.salePayment.findMany.mockResolvedValue([]);
      prisma.sale.aggregate.mockResolvedValue({
        _sum: { totalUSD: 0, totalVES: 0, totalUSDT: 0 },
        _count: { id: 0 },
      });
      prisma.sale.count.mockResolvedValue(0);

      await service.getReport({ organizationId: ORG_A }, {});

      const openItemsCall = prisma.sale.findMany.mock.calls[1][0];
      expect(openItemsCall.where.casheaFinancedUSD).toBeNull();
    });

    it("keeps a CASHEA abono out of the client balance on a non-Cashea sale", async () => {
      const { service, tx } = makeService();
      tx.sale.findFirst.mockResolvedValue({
        id: "s-1",
        saleNumber: "VTA-00001",
        totalUSD: "100.00",
        status: "COMPLETED",
        clientId: "c-1",
        casheaFinancedUSD: null,
      });
      tx.salePayment.findMany.mockResolvedValue([]);

      await service.addPayment({ organizationId: ORG_A }, "s-1", {
        amountOriginal: 30,
        currency: "USD",
        paymentMethod: "CASHEA",
      });

      expect(tx.client.update).not.toHaveBeenCalled();
    });

    it("does not let a CASHEA payment at creation reduce the client debt", async () => {
      const { service, tx } = makeService();
      tx.product.findFirst.mockResolvedValue(priceyProduct());

      await service.create(
        { organizationId: ORG_A, createdById: "u-1" },
        {
          items: bigItem,
          clientId: "c-1",
          payments: [
            { amountOriginal: 30, currency: "USD", paymentMethod: "CASHEA" },
          ],
        },
      );

      expect(tx.client.update.mock.calls[0][0].data).toEqual({
        currentBalanceUSD: { increment: 100 },
      });
    });

    it("does not turn the financed part into client debt when a Cashea sale is cancelled", async () => {
      const { service, tx } = makeService();
      tx.sale.findFirst.mockResolvedValue({
        id: "s-1",
        saleNumber: "VTA-00001",
        status: "COMPLETED",
        clientId: "c-1",
        totalUSD: "100.00",
        casheaInitialUSD: "40.00",
        casheaFinancedUSD: "60.00",
        items: [],
      });
      tx.salePayment.aggregate.mockResolvedValue({
        _sum: { amountUSD: "40.00" },
      });

      await service.cancel({ organizationId: ORG_A }, "s-1");

      expect(tx.client.update).not.toHaveBeenCalled();
    });

    it("rejects a Cashea first due date that cannot be parsed", async () => {
      const { service, tx } = makeService();
      tx.product.findFirst.mockResolvedValue(priceyProduct());

      await expect(
        service.create(
          { organizationId: ORG_A, createdById: "u-1" },
          {
            items: bigItem,
            cashea: { ...plan, firstDueDate: "not-a-date" },
          },
        ),
      ).rejects.toThrow("La fecha de la primera cuota de Cashea no es válida.");
    });

    it("still reduces a non-Cashea client debt with a CASH abono", async () => {
      const { service, tx } = makeService();
      tx.sale.findFirst.mockResolvedValue({
        id: "s-1",
        saleNumber: "VTA-00001",
        totalUSD: "100.00",
        status: "COMPLETED",
        clientId: "c-1",
        casheaFinancedUSD: null,
      });
      tx.salePayment.findMany.mockResolvedValue([]);

      await service.addPayment({ organizationId: ORG_A }, "s-1", {
        amountOriginal: 30,
        currency: "USD",
        paymentMethod: "CASH_USD",
      });

      expect(tx.client.update.mock.calls[0][0].data).toEqual({
        currentBalanceUSD: { increment: -30 },
      });
    });

    it("cancelling a Cashea sale only restores the unpaid initial", async () => {
      const { service, tx } = makeService();
      tx.sale.findFirst.mockResolvedValue({
        id: "s-1",
        saleNumber: "VTA-00001",
        status: "COMPLETED",
        clientId: "c-1",
        totalUSD: "100.00",
        casheaInitialUSD: "40.00",
        casheaFinancedUSD: "60.00",
        items: [],
      });
      tx.salePayment.aggregate.mockResolvedValue({
        _sum: { amountUSD: "10.00" },
      });

      await service.cancel({ organizationId: ORG_A }, "s-1");

      expect(tx.salePayment.aggregate.mock.calls[0][0].where).toMatchObject({
        paymentMethod: { not: "CASHEA" },
      });
      expect(tx.client.update.mock.calls[0][0].data).toEqual({
        currentBalanceUSD: { increment: 30 },
      });
    });

    it("cancelling a normal sale restores what the client still owed", async () => {
      const { service, tx } = makeService();
      tx.sale.findFirst.mockResolvedValue({
        id: "s-1",
        saleNumber: "VTA-00001",
        status: "COMPLETED",
        clientId: "c-1",
        totalUSD: "100.00",
        casheaInitialUSD: null,
        casheaFinancedUSD: null,
        items: [],
      });
      tx.salePayment.aggregate.mockResolvedValue({
        _sum: { amountUSD: "40.00" },
      });

      await service.cancel({ organizationId: ORG_A }, "s-1");

      expect(tx.client.update.mock.calls[0][0].data).toEqual({
        currentBalanceUSD: { increment: 60 },
      });
    });
  });
});
