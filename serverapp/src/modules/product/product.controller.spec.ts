import { ProductController } from "./product.controller";

const CATALOG_ROW = {
  id: "p-1",
  sku: "ARROZ-1KG",
  barcode: null,
  name: "Arroz 1kg",
  description: null,
  salePriceUSD: "100",
  wholesalePriceUSD: null,
  unit: "UND",
  taxRate: "0",
  imageUrl: null,
  stock: "38",
  categoryId: null,
};

const makeController = (links: unknown[] = []) => {
  const prisma = {
    organization: {
      findUnique: jest.fn().mockResolvedValue({ id: "org-1", status: "ACTIVE" }),
    },
    product: {
      findMany: jest.fn().mockResolvedValue([CATALOG_ROW]),
      count: jest.fn().mockResolvedValue(1),
    },
    offerProduct: { findMany: jest.fn().mockResolvedValue(links) },
  };
  const controller = new ProductController(
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    prisma as any,
  );
  return { controller, prisma };
};

describe("ProductController.listPublicCatalog", () => {
  it("answers with an empty catalog when the shop slug is unknown", async () => {
    const { controller, prisma } = makeController();
    prisma.organization.findUnique.mockResolvedValue(null);

    await expect(controller.listPublicCatalog("no-existe")).resolves.toEqual({
      list: [],
      total: 0,
    });
    expect(prisma.product.findMany).not.toHaveBeenCalled();
  });

  it("exposes the original price next to the discounted one when an offer applies", async () => {
    const { controller } = makeController([
      { productId: "p-1", offer: { discountPercent: 10 } },
    ]);

    const result = await controller.listPublicCatalog("socius-demo");

    expect(result.list).toEqual([
      {
        ...CATALOG_ROW,
        salePriceUSD: 90,
        offerPercent: 10,
        listPriceUSD: 100,
      },
    ]);
  });

  it("keeps the catalog untouched when no offer applies", async () => {
    const { controller } = makeController([]);

    const result = await controller.listPublicCatalog("socius-demo");

    expect(result.list).toEqual([{ ...CATALOG_ROW, offerPercent: 0 }]);
    expect(result.list[0]).not.toHaveProperty("listPriceUSD");
    expect(result.total).toBe(1);
  });
});
