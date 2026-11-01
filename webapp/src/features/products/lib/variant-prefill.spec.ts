import { describe, expect, it } from "vitest";
import {
  suggestFreeSku,
  variantPrefillFromProduct,
} from "./variant-prefill";
import { validateProductForm } from "./product-form";
import type { Product } from "../types/product.type";

const source = (overrides: Partial<Product> = {}): Product =>
  ({
    id: "p-1",
    sku: "ARROZ-1K",
    name: "Arroz 1kg",
    barcode: "4006381333931",
    color: "#c87878",
    description: "Arroz premium",
    costPriceUSD: "1.00",
    salePriceUSD: "2.00",
    wholesalePriceUSD: "1.50",
    stock: "40.00",
    minStock: "5.00",
    unit: "KG",
    taxRate: "16.00",
    isService: false,
    isPublic: true,
    status: "ACTIVE",
    categoryId: "c-1",
    supplierId: "s-1",
    organizationId: "org-1",
    ...overrides,
  }) as Product;

describe("variantPrefillFromProduct (S7)", () => {
  it("suffixes the name and the sku, and clears the barcode", () => {
    const form = variantPrefillFromProduct(source());

    expect(form.name).toBe("Arroz 1kg (variante)");
    expect(form.sku).toBe("ARROZ-1K-V");
    // The barcode must be regenerated: the variant needs its own EAN-13.
    expect(form.barcode).toBe("");
  });

  it("copies description, prices, unit, tax, category, supplier and color", () => {
    const form = variantPrefillFromProduct(source());

    expect(form.description).toBe("Arroz premium");
    expect(form.costPriceUSD).toBe(1);
    expect(form.salePriceUSD).toBe(2);
    expect(form.wholesalePriceUSD).toBe(1.5);
    expect(form.unit).toBe("KG");
    expect(form.taxRate).toBe(16);
    expect(form.categoryId).toBe("c-1");
    expect(form.supplierId).toBe("s-1");
    expect(form.color).toBe("#c87878");
  });

  it("starts with zero opening stock and never inherits store visibility", () => {
    const form = variantPrefillFromProduct(source());

    expect(form.stock).toBe(0);
    // A new variant is published from the list toggle, never copied blind:
    // isPublic=true would 403 on a plan without CATALOG_ONLINE.
    expect(form.isPublic).toBe(false);
    expect(form.minStock).toBe(5);
    expect(form.isService).toBe(false);
    expect(form.status).toBe("ACTIVE");
  });

  it("passes the create validation with the derived identity", () => {
    expect(validateProductForm(variantPrefillFromProduct(source()))).toBeNull();
  });

  it("handles a product without barcode, color, category or supplier", () => {
    const form = variantPrefillFromProduct(
      source({
        barcode: null,
        color: null,
        description: null,
        categoryId: null,
        supplierId: null,
        wholesalePriceUSD: null,
      }),
    );

    expect(form.barcode).toBe("");
    expect(form.color).toBe("");
    expect(form.description).toBe("");
    expect(form.categoryId).toBe("");
    expect(form.supplierId).toBe("");
    expect(form.wholesalePriceUSD).toBeUndefined();
    expect(form.sku).toBe("ARROZ-1K-V");
  });
});

describe("suggestFreeSku", () => {
  it("returns <base>-V when it is free", () => {
    expect(suggestFreeSku("CAM-001", ["CAM-001", "CAM-002"])).toBe("CAM-001-V");
  });

  it("walks -V2, -V3… until it finds a free candidate (case-insensitive)", () => {
    expect(
      suggestFreeSku("CAM-001", ["CAM-001", "cam-001-v", "CAM-001-V2"]),
    ).toBe("CAM-001-V3");
  });

  it("never returns a taken sku", () => {
    const taken = Array.from({ length: 999 }, (_, i) =>
      i === 0 ? "X-1" : `X-1-V${i - 1}`,
    );
    const sku = suggestFreeSku("X-1", taken);
    expect(taken.map((t) => t.toUpperCase())).not.toContain(sku.toUpperCase());
  });
});
