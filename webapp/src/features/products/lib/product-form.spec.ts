import { describe, expect, it } from "vitest";
import {
  buildProductPayload,
  buildStockPayload,
  isLowStock,
  stockAfter,
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
});
