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

const makeController = (
  links: unknown[] = [],
  template: jest.Mock = jest.fn(() => "\uFEFFsku,nombre\r\nA,Arroz\r\n"),
  validate: jest.Mock = jest.fn(),
  commit: jest.Mock = jest.fn(),
) => {
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
  const productImport = { template, validate, commit };
  const workspaceContext = { getWorkspaceId: () => undefined };
  const controller = new ProductController(
    {} as any,
    {} as any,
    workspaceContext as any,
    {} as any,
    prisma as any,
    productImport as any,
  );
  return { controller, prisma, template, validate, commit };
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

describe("ProductController.template", () => {
  it("serves the CSV with download headers", () => {
    const csv = "\uFEFFsku,nombre\r\nA,Arroz\r\n";
    const { controller, template } = makeController([], jest.fn(() => csv));
    const reply = { header: jest.fn() };

    const result = controller.template(reply as any);

    expect(template).toHaveBeenCalledTimes(1);
    expect(result).toBe(csv);
    expect(reply.header).toHaveBeenCalledWith(
      "Content-Type",
      "text/csv; charset=utf-8",
    );
    expect(reply.header).toHaveBeenCalledWith(
      "Content-Disposition",
      'attachment; filename="plantilla-productos.csv"',
    );
  });
});

describe("ProductController.validateImport", () => {
  it("resolves the scope and delegates to the import service", async () => {
    const preview = {
      rows: [],
      errors: [],
      summary: { total: 0, valid: 0, invalid: 0, warnings: 0 },
    };
    const validate = jest.fn().mockResolvedValue(preview);
    const { controller } = makeController([], undefined, validate);
    const request = { user: { id: "u-1", permits: { name: "ADMIN" } } };
    const body = { content: "sku,nombre,tipo\nA,Arroz,producto" };

    const result = await controller.validateImport(request as any, body as any);

    expect(validate).toHaveBeenCalledWith(
      { organizationId: null, createdById: "u-1" },
      body,
    );
    expect(result).toBe(preview);
  });
});

describe("ProductController.importProducts", () => {
  it("delegates body.rows with the resolved scope", async () => {
    const result = { created: 1, skipped: 0, excluded: 0, errors: [] };
    const commit = jest.fn().mockResolvedValue(result);
    const { controller } = makeController([], undefined, undefined, commit);
    const request = { user: { id: "u-1", permits: { name: "ADMIN" } } };
    const body = {
      rows: [{ line: 2, include: true, values: { sku: "A-1" } }],
    };

    const response = await controller.importProducts(
      request as any,
      body as any,
    );

    expect(commit).toHaveBeenCalledWith(
      { organizationId: null, createdById: "u-1" },
      body.rows,
    );
    expect(response).toBe(result);
  });
});
