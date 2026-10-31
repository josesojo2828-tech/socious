import { describe, expect, it } from "vitest";
import { summarizeProducts } from "./product-summary";
import type { Product } from "../types/product.type";

const product = (overrides: Partial<Product> = {}): Product =>
  ({
    id: "p-1",
    sku: "SKU-1",
    name: "Producto",
    costPriceUSD: "1.00",
    salePriceUSD: "2.00",
    stock: "10.00",
    minStock: "2.00",
    unit: "UND",
    taxRate: "0.00",
    isService: false,
    isPublic: true,
    status: "ACTIVE",
    ...overrides,
  }) as Product;

describe("summarizeProducts", () => {
  it("counts the catalog, the active rows and the low-stock rows", () => {
    const summary = summarizeProducts([
      product(), // ACTIVE, stock 10 > min 2 → not low
      product({ id: "p-2", status: "INACTIVE" }),
      product({ id: "p-3", stock: "2.00" }), // ACTIVE at the minimum → low
      product({ id: "p-4", stock: "0.00", minStock: "0.00" }), // ACTIVE at zero → low
    ]);

    expect(summary).toEqual({ total: 4, active: 3, lowStock: 2 });
  });

  it("never flags a service as low stock", () => {
    const summary = summarizeProducts([
      product({ id: "p-5", isService: true, stock: "0.00", minStock: "0.00" }),
    ]);

    expect(summary).toEqual({ total: 1, active: 1, lowStock: 0 });
  });

  it("answers zeros for an empty catalog", () => {
    expect(summarizeProducts([])).toEqual({
      total: 0,
      active: 0,
      lowStock: 0,
    });
  });
});
