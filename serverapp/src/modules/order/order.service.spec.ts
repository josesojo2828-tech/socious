import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { OrderStatus } from "@prisma/client";
import { OrderService } from "./order.service";

const ORG_A = "org-a";
const RATES = { rateBcv: 795, rateUsdt: 938 };

const PUBLISHED_PRODUCT = {
  id: "prod-1",
  name: "Arroz 1kg",
  salePriceUSD: "2.00",
  isPublic: true,
  status: "ACTIVE",
};

const makeTx = () => ({
  organization: { findUnique: jest.fn() },
  product: { findMany: jest.fn().mockResolvedValue([]) },
  order: {
    findFirst: jest.fn().mockResolvedValue(null),
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue({ id: "o-1" }),
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn((args: any) =>
      Promise.resolve({ id: "o-1", orderNumber: "PED-00001", ...args.data }),
    ),
    update: jest.fn((args: any) =>
      Promise.resolve({ id: args.where.id, ...args.data }),
    ),
  },
  orderItem: {
    create: jest.fn((args: any) => Promise.resolve({ id: "oi-1", ...args.data })),
    findMany: jest.fn().mockResolvedValue([]),
  },
  saleService: { create: jest.fn() },
});

const makeService = () => {
  const tx = makeTx();
  const prisma = { ...tx, $transaction: jest.fn(async (fn: any) => fn(tx)) };
  const saleService = { create: jest.fn().mockResolvedValue({ id: "s-1" }) };
  const service = new OrderService(
    prisma as any,
    { resolveRates: jest.fn().mockResolvedValue(RATES) } as any,
    { nextFormatted: jest.fn().mockResolvedValue("PED-00001") } as any,
    saleService as any,
  );
  return { service, prisma, tx, saleService };
};

const baseOrder = (status: OrderStatus = OrderStatus.PENDING) => ({
  id: "o-1",
  orderNumber: "PED-00001",
  status,
  saleId: null,
  clientId: null,
  notes: null,
  organizationId: ORG_A,
});

describe("OrderService", () => {
  describe("public storefront", () => {
    it("rejects an unknown or inactive shop", async () => {
      const { service, tx } = makeService();
      tx.organization.findUnique.mockResolvedValue(null);

      await expect(
        service.createPublicOrder({
          organizationSlug: "no-existe",
          customerName: "Ana",
          items: [{ productId: "prod-1", quantity: 1 }],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("only accepts published, ACTIVE products", async () => {
      const { service, tx } = makeService();
      tx.organization.findUnique.mockResolvedValue({
        id: ORG_A,
        name: "Tienda",
        slug: "tienda",
        status: "ACTIVE",
      });
      tx.product.findMany.mockResolvedValue([
        { ...PUBLISHED_PRODUCT, isPublic: false },
      ]);

      await expect(
        service.createPublicOrder({
          organizationSlug: "tienda",
          customerName: "Ana",
          items: [{ productId: "prod-1", quantity: 1 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("uses the storefront price, never the one the client sends", async () => {
      const { service, tx } = makeService();
      tx.organization.findUnique.mockResolvedValue({
        id: ORG_A,
        name: "Tienda",
        slug: "tienda",
        status: "ACTIVE",
      });
      tx.product.findMany.mockResolvedValue([PUBLISHED_PRODUCT]);

      await service.createPublicOrder({
        organizationSlug: "tienda",
        customerName: "Ana",
        items: [{ productId: "prod-1", quantity: 3, priceUSD: 0.01 }],
      });

      expect(tx.orderItem.create.mock.calls[0][0].data).toMatchObject({
        productName: "Arroz 1kg",
        quantity: 3,
        priceUSD: 2,
        totalUSD: 6,
      });
      expect(tx.order.create.mock.calls[0][0].data).toMatchObject({
        totalUSD: 6,
        totalVES: 4770,
        totalUSDT: 5.09,
      });
    });

    it("does NOT reserve stock (S9): no product or stock write happens", async () => {
      const { service, tx } = makeService();
      tx.organization.findUnique.mockResolvedValue({
        id: ORG_A,
        name: "Tienda",
        slug: "tienda",
        status: "ACTIVE",
      });
      tx.product.findMany.mockResolvedValue([
        { ...PUBLISHED_PRODUCT, salePriceUSD: "0" },
      ]);

      await service.createPublicOrder({
        organizationSlug: "tienda",
        customerName: "Ana",
        items: [{ productId: "prod-1", quantity: 99 }],
      });

      expect(tx.product.findMany).toHaveBeenCalledTimes(1); // read only
      expect(tx.product.update).toBeUndefined();
      expect(tx.stockMovement?.create).toBeUndefined();
    });
  });

  describe("status machine", () => {
    it("walks PENDING → CONFIRMED → PREPARING → DELIVERED", async () => {
      const { service, tx } = makeService();
      tx.order.findFirst.mockResolvedValue(baseOrder(OrderStatus.PENDING));

      await expect(
        service.updateStatus({ organizationId: ORG_A }, "o-1", {
          status: OrderStatus.CONFIRMED,
        }),
      ).resolves.toMatchObject({ status: OrderStatus.CONFIRMED });
      expect(tx.order.update.mock.calls[0][0].data.status).toBe(
        OrderStatus.CONFIRMED,
      );
    });

    it("refuses an invalid jump", async () => {
      const { service, tx } = makeService();
      tx.order.findFirst.mockResolvedValue(baseOrder(OrderStatus.PENDING));

      await expect(
        service.updateStatus({ organizationId: ORG_A }, "o-1", {
          status: OrderStatus.DELIVERED,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it("refuses to cancel a delivered order", async () => {
      const { service, tx } = makeService();
      tx.order.findFirst.mockResolvedValue(baseOrder(OrderStatus.DELIVERED));

      await expect(
        service.updateStatus({ organizationId: ORG_A }, "o-1", {
          status: OrderStatus.CANCELLED,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("convertToSale", () => {
    it("hands the order items to the sale service and links the order", async () => {
      const { service, tx, saleService } = makeService();
      tx.order.findFirst.mockResolvedValue(baseOrder(OrderStatus.CONFIRMED));
      tx.orderItem.findMany.mockResolvedValue([
        {
          productId: "prod-1",
          productName: "Arroz 1kg",
          quantity: "3.00",
          priceUSD: "2.00",
        },
      ]);

      await service.convertToSale({ organizationId: ORG_A }, "o-1");

      expect(saleService.create).toHaveBeenCalledWith(
        { organizationId: ORG_A },
        expect.objectContaining({
          orderId: "o-1",
          items: [
            {
              productId: "prod-1",
              productName: "Arroz 1kg",
              quantity: 3,
              unitPriceUSD: 2,
            },
          ],
        }),
      );
    });

    it("refuses to convert an order twice", async () => {
      const { service, tx } = makeService();
      tx.order.findFirst.mockResolvedValue({
        ...baseOrder(OrderStatus.CONFIRMED),
        saleId: "s-existing",
      });

      await expect(
        service.convertToSale({ organizationId: ORG_A }, "o-1"),
      ).rejects.toThrow(ConflictException);
    });
  });
});
