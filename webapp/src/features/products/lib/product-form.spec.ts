import { describe, expect, it } from "vitest";
import {
  EMPTY_PRODUCT_FORM,
  buildProductPayload,
  buildStockPayload,
  flattenCategories,
  isLowStock,
  stockAfter,
  toForm,
  validateProductForm,
  type ProductForm,
} from "./product-form";
import type { Product } from "../types/product.type";

const form = (overrides: Partial<ProductForm> = {}): ProductForm => ({
  sku: "  ARROZ-1K  ",
  name: " Arroz 1kg ",
  barcode: "",
  description: "  largo  ",
  costPriceUSD: 1,
  salePriceUSD: 2,
  minStock: 5,
  unit: "KG",
  taxRate: 16,
  isService: false,
  isPublic: true,
  status: "ACTIVE",
  stock: 40,
  components: [],
  ...overrides,
});

const product = (overrides: Partial<Product> = {}): Product =>
  ({
    id: "p-1",
    sku: "ARROZ-1K",
    name: "Arroz 1kg",
    costPriceUSD: "1.00",
    salePriceUSD: "2.00",
    stock: "10.00",
    minStock: "2.00",
    unit: "KG",
    taxRate: "16.00",
    isService: false,
    isPublic: true,
    status: "ACTIVE",
    organizationId: null,
    ...overrides,
  }) as Product;

describe("product-form (S7)", () => {
  describe("buildProductPayload", () => {
    it("trims text and coerces numbers", () => {
      const payload = buildProductPayload(form(), "create");

      expect(payload.sku).toBe("ARROZ-1K");
      expect(payload.name).toBe("Arroz 1kg");
      expect(payload.description).toBe("largo");
      expect(payload.barcode).toBeNull();
      expect(payload.costPriceUSD).toBe(1);
      expect(payload.salePriceUSD).toBe(2);
      expect(payload.stock).toBe(40);
      expect(payload.supplierId).toBeNull();
    });

    it("never sends stock when updating (the backend rejects the field)", () => {
      const payload = buildProductPayload(form({ stock: 99 }), "update");
      expect(payload).not.toHaveProperty("stock");
      expect(payload.minStock).toBe(5);
    });

    it("forces zero stock for services", () => {
      const payload = buildProductPayload(
        form({ isService: true, stock: 12 }),
        "create",
      );
      expect(payload.stock).toBe(0);
      expect(payload.isService).toBe(true);
    });

    it("passes the color through trimmed (S6)", () => {
      expect(buildProductPayload(form({ color: "  #c87878 " }), "create").color)
        .toBe("#c87878");
    });

    it("sends color as null when the form leaves it empty (S6)", () => {
      expect(buildProductPayload(form({ color: "" }), "create").color).toBeNull();
      expect(buildProductPayload(form({ color: undefined }), "update").color).toBeNull();
    });
  });

  describe("isLowStock", () => {
    it("flags tracked products at or below the minimum", () => {
      expect(isLowStock(product())).toBe(false);
      expect(isLowStock(product({ stock: "2.00" }))).toBe(true);
      expect(isLowStock(product({ stock: "1.00" }))).toBe(true);
    });

    it("never flags a service", () => {
      expect(isLowStock(product({ isService: true, stock: "0.00" }))).toBe(
        false,
      );
    });
  });

  describe("stockAfter", () => {
    it("adds and subtracts", () => {
      expect(stockAfter(10, { type: "IN", quantity: 5 })).toBe(15);
      expect(stockAfter(10, { type: "OUT", quantity: 4 })).toBe(6);
    });

    it("uses the absolute target on an adjustment", () => {
      expect(
        stockAfter(10, { type: "ADJUSTMENT", quantity: 3, newStock: 7 }),
      ).toBe(7);
    });

    it("refuses an exit that would go negative", () => {
      expect(stockAfter(10, { type: "OUT", quantity: 50 })).toBeNull();
    });

    it("refuses nonsense quantities", () => {
      expect(stockAfter(10, { type: "OUT", quantity: 0 })).toBeNull();
      expect(stockAfter(10, { type: "OUT", quantity: Number.NaN })).toBeNull();
      expect(
        stockAfter(10, { type: "ADJUSTMENT", quantity: 3, newStock: -1 }),
      ).toBeNull();
    });
  });

  describe("buildStockPayload", () => {
    it("sends the target only for adjustments", () => {
      expect(
        buildStockPayload({
          type: "ADJUSTMENT",
          quantity: 3,
          newStock: 7,
          reference: " CONTEO-1 ",
          notes: "  cierre  ",
        }),
      ).toEqual({
        type: "ADJUSTMENT",
        quantity: 3,
        newStock: 7,
        reference: "CONTEO-1",
        notes: "cierre",
      });

      expect(
        buildStockPayload({ type: "IN", quantity: 5, newStock: 99 }),
      ).toEqual({ type: "IN", quantity: 5 });
    });
  });

  describe("toForm", () => {
    it("maps a stored product into the editable form", () => {
      const stored = product({
        barcode: "4006381333931",
        description: "largo",
        wholesalePriceUSD: "3.00",
        categoryId: "c-1",
        supplierId: "s-1",
      });

      expect(toForm(stored)).toEqual({
        sku: "ARROZ-1K",
        name: "Arroz 1kg",
        barcode: "4006381333931",
        color: "",
        description: "largo",
        costPriceUSD: 1,
        salePriceUSD: 2,
        wholesalePriceUSD: 3,
        minStock: 2,
        stock: 10,
        unit: "KG",
        taxRate: 16,
        isService: false,
        isPublic: true,
        status: "ACTIVE",
        categoryId: "c-1",
        supplierId: "s-1",
        components: [],
      });
    });

    it("leaves wholesale price, category and supplier empty when unset", () => {
      const form = toForm(product({ wholesalePriceUSD: null }));
      expect(form.wholesalePriceUSD).toBeUndefined();
      expect(form.categoryId).toBe("");
      expect(form.supplierId).toBe("");
      expect(form.description).toBe("");
      expect(form.barcode).toBe("");
    });

    it("maps the stored color, or empty when the product has none (S6)", () => {
      expect(toForm(product({ color: "#1a2a46" })).color).toBe("#1a2a46");
      expect(toForm(product()).color).toBe("");
    });
  });

  describe("validateProductForm", () => {
    it("accepts a form with sku and name", () => {
      expect(validateProductForm(form())).toBeNull();
    });

    it("requires a non-blank sku and name", () => {
      expect(validateProductForm(form({ sku: "   " }))).toBe(
        "SKU y nombre son obligatorios.",
      );
      expect(validateProductForm(form({ name: "" }))).toBe(
        "SKU y nombre son obligatorios.",
      );
    });
  });

  describe("flattenCategories", () => {
    it("lists children after their root with a visual prefix", () => {
      const flat = flattenCategories([
        {
          id: "root-1",
          name: "Bebidas",
          slug: "bebidas",
          isSystem: false,
          subCategories: [{ id: "child-1", name: "Aguas", slug: "aguas", isSystem: false }],
        },
        { id: "root-2", name: "Granos", slug: "granos", isSystem: false },
      ]);

      expect(flat.map((category) => category.id)).toEqual([
        "root-1",
        "child-1",
        "root-2",
      ]);
      expect(flat[1].name).toBe("↳ Aguas");
    });
  });
});


describe("components (BOM, S1)", () => {
  it("starts with an empty component list", () => {
    expect(EMPTY_PRODUCT_FORM.components).toEqual([]);
  });

  it("rejects a component with a non-positive quantity", () => {
    const form = { ...EMPTY_PRODUCT_FORM, sku: "S", name: "N" };
    form.components = [{ componentId: "c-1", quantity: "0" }];
    expect(validateProductForm(form)).toMatch(/cantidad/i);
  });

  it("rejects repeated components", () => {
    const form = { ...EMPTY_PRODUCT_FORM, sku: "S", name: "N" };
    form.components = [
      { componentId: "c-1", quantity: "1" },
      { componentId: "c-1", quantity: "2" },
    ];
    expect(validateProductForm(form)).toMatch(/repetidos/i);
  });

  it("accepts a valid component list", () => {
    const form = { ...EMPTY_PRODUCT_FORM, sku: "S", name: "N" };
    form.components = [
      { componentId: "c-1", quantity: "1" },
      { componentId: "c-2", quantity: "0.5" },
    ];
    expect(validateProductForm(form)).toBeNull();
  });

  it("serializes components to numbers in the payload (always sent)", () => {
    const form = { ...EMPTY_PRODUCT_FORM, sku: "S", name: "N" };
    form.components = [{ componentId: "c-1", quantity: "2.5" }];
    const payload = buildProductPayload(form, "create");
    expect(payload.components).toEqual([
      { componentId: "c-1", quantity: 2.5 },
    ]);
  });

  it("sends an empty components array to clear the server list", () => {
    const payload = buildProductPayload(EMPTY_PRODUCT_FORM, "update");
    expect(payload.components).toEqual([]);
  });
});
