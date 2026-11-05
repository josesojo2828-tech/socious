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

const DEFAULT_SETTINGS = {
  cash: { shiftControl: true },
  currencies: { showUSD: true, showVES: true, showUSDT: true, showBCV: true, showEUR: false },
  fulfillment: { enabledTypes: ["PICKUP", "DELIVERY", "SHIPPING"], coordination: "WHATSAPP" },
  shipping: { enabledAgencies: ["ZOOM", "MRW"] },
  delivery: { enabled: true, feeUSD: 3.5 },
  routes: { enabled: false },
};

const makeTx = () => ({
  organization: { findUnique: jest.fn() },
  product: {
    findMany: jest.fn().mockResolvedValue([]),
    update: jest.fn(),
  },
  client: {
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn((args: any) => Promise.resolve({ id: "client-new", ...args.data })),
  },
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
  stockMovement: { create: jest.fn() },
  offerProduct: { findMany: jest.fn(async () => []) },
});

const makeService = (settings: any = DEFAULT_SETTINGS) => {
  const tx = makeTx();
  const prisma = { ...tx, $transaction: jest.fn(async (fn: any) => fn(tx)) };
  const saleService = { create: jest.fn().mockResolvedValue({ id: "s-1" }) };
  const tenantSettings = { get: jest.fn().mockResolvedValue(settings) };
  const shippingAgency = { assertUsable: jest.fn() };
  const emitter = { emit: jest.fn() };
  const service = new OrderService(
    prisma as any,
    { resolveRates: jest.fn().mockResolvedValue(RATES) } as any,
    { nextFormatted: jest.fn().mockResolvedValue("PED-00001") } as any,
    saleService as any,
    tenantSettings as any,
    shippingAgency as any,
    emitter as any,
  );
  return { service, prisma, tx, saleService, tenantSettings, shippingAgency, emitter };
};

const baseOrder = (
  status: OrderStatus = OrderStatus.PENDING,
  fulfillmentType: "PICKUP" | "DELIVERY" | "SHIPPING" = "PICKUP",
) => ({
  id: "o-1",
  orderNumber: "PED-00001",
  status,
  saleId: null,
  clientId: null,
  notes: null,
  organizationId: ORG_A,
  fulfillmentType,
  agencyId: null,
  coordination: "WHATSAPP",
  deliveryFeeUSD: null,
  trackingNumber: null,
  shippedAt: null,
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
          customerEmail: "ana@cliente.test",
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
          customerEmail: "ana@cliente.test",
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
        customerEmail: "ana@cliente.test",
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
        customerEmail: "ana@cliente.test",
        items: [{ productId: "prod-1", quantity: 99 }],
      });

      expect(tx.product.findMany).toHaveBeenCalledTimes(1); // read only
      // The fixture declares the write mocks, so the assertion is "never
      // called" instead of "does not exist".
      expect(tx.product.update).not.toHaveBeenCalled();
      expect(tx.stockMovement.create).not.toHaveBeenCalled();
    });
  });

  describe("contact + client linking (S5)", () => {
    const publishShop = (tx: any) => {
      tx.organization.findUnique.mockResolvedValue({
        id: ORG_A,
        name: "Tienda",
        slug: "tienda",
        status: "ACTIVE",
      });
      tx.product.findMany.mockResolvedValue([PUBLISHED_PRODUCT]);
    };

    it("rejects an order with no contact channel at all", async () => {
      const { service, tx } = makeService();
      publishShop(tx);

      await expect(
        service.createPublicOrder({
          organizationSlug: "tienda",
          customerName: "Ana",
          items: [{ productId: "prod-1", quantity: 1 }],
        } as any),
      ).rejects.toThrow(/WhatsApp o un correo/);
    });

    it("accepts an order with only a WhatsApp number", async () => {
      const { service, tx } = makeService();
      publishShop(tx);

      await expect(
        service.createPublicOrder({
          organizationSlug: "tienda",
          customerName: "Ana",
          customerPhone: "584241234567",
          items: [{ productId: "prod-1", quantity: 1 }],
        } as any),
      ).resolves.toBeDefined();
    });

    it("links the order to the client that already matches by email", async () => {
      const { service, tx } = makeService();
      publishShop(tx);
      tx.client.findFirst.mockResolvedValue({ id: "client-existente" });

      await service.createPublicOrder({
        organizationSlug: "tienda",
        customerName: "Ana",
        customerEmail: "ANA@cliente.test",
        items: [{ productId: "prod-1", quantity: 1 }],
      });

      expect(tx.client.findFirst.mock.calls[0][0].where).toMatchObject({
        organizationId: ORG_A,
        email: { equals: "ANA@cliente.test", mode: "insensitive" },
      });
      expect(tx.order.create.mock.calls[0][0].data.clientId).toBe(
        "client-existente",
      );
      expect(tx.client.create).not.toHaveBeenCalled();
    });

    it("creates the client when nobody matches, with the web-order note", async () => {
      const { service, tx } = makeService();
      publishShop(tx);
      tx.client.findFirst.mockResolvedValue(null);

      await service.createPublicOrder({
        organizationSlug: "tienda",
        customerName: "Ana Pérez",
        customerEmail: "ana@cliente.test",
        customerPhone: "+58 412-0001111",
        items: [{ productId: "prod-1", quantity: 1 }],
      });

      expect(tx.client.create.mock.calls[0][0].data).toMatchObject({
        name: "Ana Pérez",
        email: "ana@cliente.test",
        phone: "+58 412-0001111",
        organizationId: ORG_A,
        notes: "Creado desde pedido web",
      });
      expect(tx.order.create.mock.calls[0][0].data.clientId).toBe("client-new");
    });

    it("rejects a client id that belongs to another shop", async () => {
      const { service, tx } = makeService();
      publishShop(tx);
      tx.client.findFirst.mockResolvedValue(null);

      await expect(
        service.createPublicOrder({
          organizationSlug: "tienda",
          customerName: "Ana",
          customerEmail: "ana@cliente.test",
          clientId: "cliente-ajeno",
          items: [{ productId: "prod-1", quantity: 1 }],
        }),
      ).rejects.toThrow(/no existe en esta tienda/);
    });
  });

  describe("fulfillment rules (S4/S6)", () => {
    const publishShop = (tx: any) => {
      tx.organization.findUnique.mockResolvedValue({
        id: ORG_A,
        name: "Tienda",
        slug: "tienda",
        status: "ACTIVE",
      });
      tx.product.findMany.mockResolvedValue([PUBLISHED_PRODUCT]);
    };

    const basePayload = (extra: Record<string, unknown> = {}) => ({
      organizationSlug: "tienda",
      customerName: "Ana",
      customerEmail: "ana@cliente.test",
      items: [{ productId: "prod-1", quantity: 1 }],
      ...extra,
    });

    it("rejects a fulfillment type the tenant did not enable", async () => {
      const { service, tx } = makeService({
        ...DEFAULT_SETTINGS,
        fulfillment: { enabledTypes: ["PICKUP"], coordination: "WHATSAPP" },
      });
      publishShop(tx);

      await expect(
        service.createPublicOrder(basePayload({ fulfillmentType: "SHIPPING" }) as any),
      ).rejects.toThrow(/no está habilitado en esta tienda/);
      expect(tx.order.create).not.toHaveBeenCalled();
    });

    it("charges the configured delivery fee as its own line", async () => {
      const { service, tx } = makeService();
      publishShop(tx);

      await service.createPublicOrder(
        basePayload({
          fulfillmentType: "DELIVERY",
          customerAddress: "Calle 5 con Av. 1",
        }) as any,
      );

      const createdItems = tx.orderItem.create.mock.calls.map(
        (call: any) => call[0].data,
      );
      const feeLine = createdItems.find(
        (item: any) => item.productName === "Envío a domicilio",
      );
      expect(feeLine).toMatchObject({ quantity: 1, priceUSD: 3.5, totalUSD: 3.5 });
      // 2.00 de producto + 3.50 de delivery
      expect(tx.order.create.mock.calls[0][0].data).toMatchObject({
        fulfillmentType: "DELIVERY",
        deliveryFeeUSD: 3.5,
        totalUSD: 5.5,
      });
    });

    it("requires an address for delivery", async () => {
      const { service, tx } = makeService();
      publishShop(tx);

      await expect(
        service.createPublicOrder(basePayload({ fulfillmentType: "DELIVERY" }) as any),
      ).rejects.toThrow(/necesita una dirección/);
    });

    it("requires and validates an agency for shipping", async () => {
      const { service, tx, shippingAgency } = makeService();
      publishShop(tx);

      await expect(
        service.createPublicOrder(
          basePayload({
            fulfillmentType: "SHIPPING",
            customerAddress: "Calle 5",
          }) as any,
        ),
      ).rejects.toThrow(/Selecciona una agencia/);

      await service.createPublicOrder(
        basePayload({
          fulfillmentType: "SHIPPING",
          customerAddress: "Calle 5",
          agencyId: "agency-1",
        }) as any,
      );

      expect(shippingAgency.assertUsable).toHaveBeenCalledWith("agency-1", [
        "ZOOM",
        "MRW",
      ]);
      expect(tx.order.create.mock.calls[0][0].data).toMatchObject({
        fulfillmentType: "SHIPPING",
        agencyId: "agency-1",
        coordination: "WHATSAPP",
      });
    });

    it("refuses delivery while the tenant has it disabled", async () => {
      const { service, tx } = makeService({
        ...DEFAULT_SETTINGS,
        delivery: { enabled: false, feeUSD: 0 },
      });
      publishShop(tx);

      await expect(
        service.createPublicOrder(
          basePayload({
            fulfillmentType: "DELIVERY",
            customerAddress: "Calle 5",
          }) as any,
        ),
      ).rejects.toThrow(/entrega a domicilio no está habilitada/);
    });
  });

  describe("dispatch (S7)", () => {
    it("refuses to dispatch a pickup order", async () => {
      const { service, tx } = makeService();
      tx.order.findFirst.mockResolvedValue(baseOrder(OrderStatus.CONFIRMED));

      await expect(
        service.shipOrder({ organizationId: ORG_A }, "o-1", {}),
      ).rejects.toThrow(/retiro en tienda no se despacha/);
    });

    it("refuses before the merchant confirms the order", async () => {
      const { service, tx } = makeService();
      tx.order.findFirst.mockResolvedValue(
        baseOrder(OrderStatus.PENDING, "DELIVERY"),
      );

      await expect(
        service.shipOrder({ organizationId: ORG_A }, "o-1", {}),
      ).rejects.toThrow(/Confirma el pedido antes de despacharlo/);
    });

    it("refuses to dispatch twice", async () => {
      const { service, tx } = makeService();
      tx.order.findFirst.mockResolvedValue({
        ...baseOrder(OrderStatus.CONFIRMED, "SHIPPING"),
        shippedAt: new Date(),
      });

      await expect(
        service.shipOrder({ organizationId: ORG_A }, "o-1", {}),
      ).rejects.toThrow(/ya fue despachado/);
    });

    it("stamps the dispatch with the agency tracking code", async () => {
      const { service, tx } = makeService();
      tx.order.findFirst.mockResolvedValue(
        baseOrder(OrderStatus.CONFIRMED, "SHIPPING"),
      );
      tx.order.update.mockResolvedValue({
        id: "o-1",
        shippedAt: new Date(),
        trackingNumber: "ZOOM-777",
      });

      const updated = await service.shipOrder(
        { organizationId: ORG_A },
        "o-1",
        { trackingNumber: "ZOOM-777" },
      );

      const data = tx.order.update.mock.calls[0][0].data;
      expect(data.shippedAt).toBeInstanceOf(Date);
      expect(data.trackingNumber).toBe("ZOOM-777");
      expect(updated.trackingNumber).toBe("ZOOM-777");
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
