import { describe, expect, it } from "vitest";
import {
  EMPTY_PRESENTATION_DRAFT,
  presentationPrefillFromProduct,
} from "./presentation-prefill";
import type { Product } from "../types/product.type";

const product = (overrides: Partial<Product> = {}): Product =>
  ({
    id: "p-1",
    sku: "ARROZ-1K",
    barcode: "4006381333931",
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
    ...overrides,
  }) as Product;

describe("presentationPrefillFromProduct", () => {
  it("copies name, unit and sku, leaving the varying fields empty", () => {
    expect(presentationPrefillFromProduct(product())).toEqual({
      name: "Arroz 1kg",
      sku: "ARROZ-1K",
      unit: "KG",
      // The merchant decides the presentation barcode, so it starts empty.
      barcode: "",
      // Color is the field they change, so it starts empty too.
      color: "",
      measures: "",
      stock: "0",
      // Inheriting the product price is the default for a new presentation.
      salePrice: "",
    });
  });

  it("never inherits the product barcode", () => {
    const draft = presentationPrefillFromProduct(
      product({ barcode: "4006381333931" }),
    );
    expect(draft.barcode).toBe("");
  });

  it("degrades to empty strings when optional product fields are missing", () => {
    const draft = presentationPrefillFromProduct(
      product({ barcode: null, description: null }),
    );
    expect(draft.name).toBe("Arroz 1kg");
    expect(draft.sku).toBe("ARROZ-1K");
    expect(draft.unit).toBe("KG");
  });
});

describe("EMPTY_PRESENTATION_DRAFT", () => {
  it("opens blank with zero stock", () => {
    expect(EMPTY_PRESENTATION_DRAFT).toEqual({
      name: "",
      sku: "",
      barcode: "",
      unit: "",
      color: "",
      measures: "",
      stock: "0",
      // No own price: the presentation inherits the product price.
      salePrice: "",
    });
  });
});
