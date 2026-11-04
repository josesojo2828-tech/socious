import { BadRequestException, ConflictException } from "@nestjs/common";
import { ProductStatus } from "@prisma/client";
import { ProductService, deriveProductStatus } from "./product.service";

const ORG_A = "org-a";

const PRODUCT = {
  id: "p-1",
  sku: "SKU-1",
  name: "Arroz",
  stock: "10.00",
  minStock: "2.00",
  isService: false,
  status: ProductStatus.ACTIVE,
  organizationId: ORG_A,
  deletedAt: null,
};

const makeTx = () => ({
  product: {
    findFirst: jest.fn().mockResolvedValue(PRODUCT),
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn((args: any) => Promise.resolve({ id: "p-new", ...args.data })),
    update: jest.fn((args: any) =>
      Promise.resolve({ id: args.where.id, stock: args.data.stock, ...args.data }),
    ),
  },
  stockMovement: {
    create: jest.fn((args: any) => Promise.resolve({ id: "m-1", ...args.data })),
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
  },
  productComponent: {
    create: jest.fn((args: any) =>
      Promise.resolve({ id: "pc-1", ...args.data }),
    ),
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    findMany: jest.fn().mockResolvedValue([]),
  },
});

const makeService = () => {
  const tx = makeTx();
  const prisma = {
    ...tx,
    $transaction: jest.fn(async (fn: any) => fn(tx)),
    $queryRaw: jest.fn().mockResolvedValue([]),
  };
  return { service: new ProductService(prisma as any), prisma, tx };
};

describe("deriveProductStatus", () => {
  it("keeps an explicit merchant choice", () => {
    expect(deriveProductStatus(ProductStatus.INACTIVE, false, 50)).toBe(
      ProductStatus.INACTIVE,
    );
    expect(deriveProductStatus(ProductStatus.ON_SALE, false, 0)).toBe(
      ProductStatus.ON_SALE,
    );
  });

  it("flips between ACTIVE and OUT_OF_STOCK with the stock", () => {
    expect(deriveProductStatus(ProductStatus.ACTIVE, false, 3)).toBe(
      ProductStatus.ACTIVE,
    );
    expect(deriveProductStatus(ProductStatus.OUT_OF_STOCK, false, 3)).toBe(
      ProductStatus.ACTIVE,
    );
    expect(deriveProductStatus(ProductStatus.ACTIVE, false, 0)).toBe(
      ProductStatus.OUT_OF_STOCK,
    );
    expect(deriveProductStatus(ProductStatus.ACTIVE, false, -2)).toBe(
      ProductStatus.OUT_OF_STOCK,
    );
  });

  it("ignores stock for services", () => {
    expect(deriveProductStatus(ProductStatus.OUT_OF_STOCK, true, 0)).toBe(
      ProductStatus.ACTIVE,
    );
  });
});

describe("ProductService", () => {
  describe("create", () => {
    it("rejects a SKU already used in the same tenant", async () => {
      const { service, prisma } = makeService();
      prisma.product.findFirst.mockResolvedValue({ id: "existing" });

      await expect(
        service.create({ organizationId: ORG_A }, { sku: "SKU-1", name: "Arroz" }),
      ).rejects.toThrow(ConflictException);
    });

    it("records an initial stock movement when the product opens with stock", async () => {
      const { service, tx, prisma } = makeService();
      prisma.product.findFirst.mockResolvedValue(null);

      await service.create(
        { organizationId: ORG_A, createdById: "u-1" },
        { sku: "SKU-2", name: "Arroz", stock: 25, costPriceUSD: 1.5 },
      );

      expect(tx.stockMovement.create.mock.calls[0][0].data).toMatchObject({
        type: "ADJUSTMENT",
        quantity: 25,
        previousStock: 0,
        newStock: 25,
        reference: "STOCK_INICIAL",
      });
    });

    it("opens services with zero stock and ACTIVE status", async () => {
      const { service, tx, prisma } = makeService();
      prisma.product.findFirst.mockResolvedValue(null);

      const created = await service.create(
        { organizationId: ORG_A },
        { sku: "SRV-1", name: "Consulta", isService: true },
      );

      expect(created.status).toBe(ProductStatus.ACTIVE);
      expect(tx.stockMovement.create).not.toHaveBeenCalled();
    });

    it("persists isRawMaterial from the Materiales form", async () => {
      const { service, tx, prisma } = makeService();
      prisma.product.findFirst.mockResolvedValue(null);

      await service.create(
        { organizationId: ORG_A },
        { sku: "HOJA-A4", name: "Hoja A4", isRawMaterial: true, stock: 100 },
      );

      expect(tx.product.create.mock.calls[0][0].data).toMatchObject({
        isRawMaterial: true,
      });
    });
  });

  describe("adjustStock", () => {
    it("adds an entry movement and updates the product", async () => {
      const { service, tx } = makeService();

      const result = await service.adjustStock(
        { organizationId: ORG_A, createdById: "u-1" },
        "p-1",
        { type: "IN", quantity: 5, reference: "COM-1" },
      );

      expect(tx.stockMovement.create.mock.calls[0][0].data).toMatchObject({
        type: "IN",
        quantity: 5,
        previousStock: 10,
        newStock: 15,
      });
      expect(tx.product.update.mock.calls[0][0].data.stock).toBe(15);
      expect(result.product.stock).toBe(15);
    });

    it("subtracts an exit movement", async () => {
      const { service, tx } = makeService();

      await service.adjustStock({ organizationId: ORG_A }, "p-1", {
        type: "OUT",
        quantity: 4,
      });

      expect(tx.stockMovement.create.mock.calls[0][0].data).toMatchObject({
        type: "OUT",
        previousStock: 10,
        newStock: 6,
      });
    });

    it("sets an absolute stock on an ADJUSTMENT", async () => {
      const { service, tx } = makeService();

      await service.adjustStock({ organizationId: ORG_A }, "p-1", {
        type: "ADJUSTMENT",
        quantity: 1,
        newStock: 7,
      });

      expect(tx.product.update.mock.calls[0][0].data.stock).toBe(7);
      expect(tx.stockMovement.create.mock.calls[0][0].data).toMatchObject({
        previousStock: 10,
        newStock: 7,
        quantity: 3,
      });
    });

    it("rejects an exit that would leave a negative stock", async () => {
      const { service } = makeService();

      await expect(
        service.adjustStock({ organizationId: ORG_A }, "p-1", {
          type: "OUT",
          quantity: 50,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("refuses stock movements on services", async () => {
      const { service, prisma } = makeService();
      prisma.product.findFirst.mockResolvedValue({
        ...PRODUCT,
        id: "p-svc",
        isService: true,
      });

      await expect(
        service.adjustStock({ organizationId: ORG_A }, "p-svc", {
          type: "IN",
          quantity: 1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("moves the product to OUT_OF_STOCK when it runs out", async () => {
      const { service, tx } = makeService();

      await service.adjustStock({ organizationId: ORG_A }, "p-1", {
        type: "OUT",
        quantity: 10,
      });

      expect(tx.product.update.mock.calls[0][0].data.status).toBe(
        ProductStatus.OUT_OF_STOCK,
      );
    });
  });


  describe("components (BOM, S1)", () => {
    it("persists components and flags the product composite on create", async () => {
      const { service, tx, prisma } = makeService();
      prisma.product.findFirst.mockResolvedValue(null);
      // First call: SKU assert (null = free). Component lookup must hit.
      prisma.product.findFirst
        .mockResolvedValueOnce(null) // sku check
        .mockResolvedValue({ id: "component-1" }); // component exists

      await service.create(
        { organizationId: ORG_A },
        {
          sku: "IMP-A4",
          name: "Impresión A4",
          isService: true,
          components: [{ componentId: "component-1", quantity: 1 }],
        },
      );

      expect(tx.productComponent.create.mock.calls[0][0].data).toMatchObject({
        productId: "p-new",
        componentId: "component-1",
        quantity: 1,
      });
      expect(tx.product.update.mock.calls[0][0].data).toMatchObject({
        isComposite: true,
      });
    });

    it("does not touch components when the payload omits them on create", async () => {
      const { service, prisma, tx } = makeService();
      prisma.product.findFirst.mockResolvedValue(null);

      await service.create({ organizationId: ORG_A }, { sku: "S-1", name: "Arroz" });

      expect(tx.productComponent.create).not.toHaveBeenCalled();
      expect(tx.product.update).not.toHaveBeenCalled();
    });

    it("rejects a component that is the product itself", async () => {
      const { service, prisma } = makeService();
      prisma.product.findFirst
        .mockResolvedValueOnce(null) // sku check
        .mockResolvedValue({ id: "p-new" }); // component lookup → same id as created product

      await expect(
        service.create(
          { organizationId: ORG_A },
          {
            sku: "SELF",
            name: "Auto",
            components: [{ componentId: "p-new", quantity: 1 }],
          },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("rejects repeated components in the same payload", async () => {
      const { service, prisma } = makeService();
      prisma.product.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValue({ id: "c-1" });

      await expect(
        service.create(
          { organizationId: ORG_A },
          {
            sku: "DUP",
            name: "Dup",
            components: [
              { componentId: "c-1", quantity: 1 },
              { componentId: "c-1", quantity: 2 },
            ],
          },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("replaces the whole list when update sends components", async () => {
      const { service, tx, prisma } = makeService();
      prisma.product.findFirst
        .mockResolvedValueOnce(PRODUCT) // getOne parent
        .mockResolvedValue({ id: "c-1" }); // component exists

      await service.update({ organizationId: ORG_A }, "p-1", {
        components: [{ componentId: "c-1", quantity: 0.5 }],
      });

      expect(tx.productComponent.deleteMany.mock.calls[0][0].where).toEqual({
        productId: "p-1",
      });
      expect(tx.productComponent.create.mock.calls[0][0].data).toMatchObject({
        productId: "p-1",
        componentId: "c-1",
        quantity: 0.5,
      });
      expect(tx.product.update.mock.calls[0][0].data).toMatchObject({
        isComposite: true,
      });
    });

    it("clears isComposite when update sends an empty list", async () => {
      const { service, tx, prisma } = makeService();
      prisma.product.findFirst.mockResolvedValueOnce(PRODUCT);

      await service.update({ organizationId: ORG_A }, "p-1", {
        components: [],
      });

      expect(tx.productComponent.deleteMany).toHaveBeenCalled();
      expect(tx.productComponent.create).not.toHaveBeenCalled();
      expect(tx.product.update.mock.calls[0][0].data).toMatchObject({
        isComposite: false,
      });
    });

    it("leaves components untouched when update omits them", async () => {
      const { service, tx, prisma } = makeService();
      prisma.product.findFirst.mockResolvedValueOnce(PRODUCT);

      await service.update({ organizationId: ORG_A }, "p-1", {
        name: "Renombrado",
      });

      expect(tx.productComponent.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe("listRawMaterials (S6)", () => {
    const MATERIAL = {
      id: "m-1",
      sku: "HOJA-A4",
      name: "Hoja A4",
      stock: "50.00",
      unit: "UND",
      isService: false,
      isRawMaterial: true,
      images: [],
    };

    it("includes flagged materials even when no composite uses them yet", async () => {
      const { service, prisma } = makeService();
      prisma.product.findMany.mockResolvedValue([MATERIAL]);
      prisma.productComponent.findMany.mockResolvedValue([]);

      const result = await service.listRawMaterials({ organizationId: ORG_A });

      expect(result.total).toBe(1);
      expect(result.list[0]).toMatchObject({
        id: "m-1",
        usedIn: 0,
        usedInNames: [],
      });
    });

    it("merges usage from composites into a flagged material", async () => {
      const { service, prisma } = makeService();
      prisma.product.findMany.mockResolvedValue([MATERIAL]);
      prisma.productComponent.findMany.mockResolvedValue([
        {
          componentId: "m-1",
          component: MATERIAL,
          product: { id: "p-1", name: "Impresión A4" },
        },
        {
          componentId: "m-1",
          component: MATERIAL,
          product: { id: "p-2", name: "Impresión A3" },
        },
      ]);

      const result = await service.listRawMaterials({ organizationId: ORG_A });

      expect(result.total).toBe(1);
      expect(result.list[0]).toMatchObject({
        id: "m-1",
        usedIn: 2,
        usedInNames: ["Impresión A4", "Impresión A3"],
      });
    });

    it("still lists a component that was never flagged as raw material", async () => {
      const { service, prisma } = makeService();
      prisma.product.findMany.mockResolvedValue([]);
      prisma.productComponent.findMany.mockResolvedValue([
        {
          componentId: "legacy-1",
          component: { ...MATERIAL, id: "legacy-1", isRawMaterial: false },
          product: { id: "p-1", name: "Impresión A4" },
        },
      ]);

      const result = await service.listRawMaterials({ organizationId: ORG_A });

      expect(result.total).toBe(1);
      expect(result.list[0]).toMatchObject({
        id: "legacy-1",
        usedIn: 1,
        usedInNames: ["Impresión A4"],
      });
    });

    it("scopes both queries to the organization", async () => {
      const { service, prisma } = makeService();
      prisma.product.findMany.mockResolvedValue([]);
      prisma.productComponent.findMany.mockResolvedValue([]);

      await service.listRawMaterials({ organizationId: ORG_A });

      expect(prisma.product.findMany.mock.calls[0][0].where).toMatchObject({
        organizationId: ORG_A,
        isRawMaterial: true,
      });
      expect(prisma.productComponent.findMany.mock.calls[0][0].where).toEqual({
        component: { organizationId: ORG_A, deletedAt: null },
      });
    });
  });

  describe("tenant isolation", () => {
    it("scopes every read to the organization", async () => {
      const { service, prisma } = makeService();

      await service.list({ organizationId: ORG_A }, { page: 1, limit: 10 });

      expect(prisma.product.findMany.mock.calls[0][0].where.AND[0]).toEqual({
        organizationId: ORG_A,
        deletedAt: null,
      });
    });
  });

  describe("list filters (S7)", () => {
    it("hides raw materials when the catalog asks to exclude them", async () => {
      const { service, prisma } = makeService();

      await service.list(
        { organizationId: ORG_A },
        { page: 1, limit: 10, excludeRawMaterials: true },
      );

      expect(prisma.product.findMany.mock.calls[0][0].where.AND).toContainEqual({
        isRawMaterial: false,
      });
    });

    it("keeps materials when the flag is absent (POS / compras)", async () => {
      const { service, prisma } = makeService();

      await service.list({ organizationId: ORG_A }, { page: 1, limit: 10 });

      const and = prisma.product.findMany.mock.calls[0][0].where.AND;
      expect(and).not.toContainEqual({ isRawMaterial: false });
    });

    it("filters services only when isService is set", async () => {
      const { service, prisma } = makeService();

      await service.list(
        { organizationId: ORG_A },
        { page: 1, limit: 10, isService: true },
      );

      expect(prisma.product.findMany.mock.calls[0][0].where.AND).toContainEqual({
        isService: true,
      });
    });
  });
});
