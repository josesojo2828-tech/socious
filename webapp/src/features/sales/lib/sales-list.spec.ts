import { describe, expect, it } from "vitest";
import {
  agingTotal,
  buildListParams,
  buildReturnPayload,
  monthLabel,
  paymentStatusLabel,
  returnableQuantity,
  type ReturnSelection,
} from "./sales-list";
import type { SaleItem } from "../types/sale.type";

const line = (overrides: Partial<SaleItem> = {}): SaleItem => ({
  id: "li-1",
  saleId: "s-1",
  productName: "Arroz 1kg",
  quantity: "10.00",
  unitPriceUSD: "2.00",
  discountUSD: "0.00",
  taxRate: "0.00",
  totalUSD: "20.00",
  ...overrides,
});

describe("sales-list (S6/S13)", () => {
  describe("buildListParams", () => {
    it("always paginates and only sends filled filters", () => {
      expect(buildListParams({})).toEqual({ page: 1, limit: 10 });
      expect(
        buildListParams({ q: "  VTA-1 ", paymentStatus: "UNPAID", from: "2026-01-01" }),
      ).toEqual({
        page: 1,
        limit: 10,
        q: "VTA-1",
        paymentStatus: "UNPAID",
        from: "2026-01-01",
      });
    });
  });

  describe("monthLabel", () => {
    it("renders a Spanish month with the year", () => {
      expect(monthLabel("2026-01")).toBe("enero de 2026");
      expect(monthLabel("2026-12")).toBe("diciembre de 2026");
    });

    it("returns the raw key when it is not a month", () => {
      expect(monthLabel("nada")).toBe("nada");
      expect(monthLabel("2026-13")).toBe("2026-13");
    });
  });

  describe("agingTotal", () => {
    it("sums the four buckets with two decimals", () => {
      expect(
        agingTotal({ current: 10, days1_30: 5.25, days31_60: 0, over60: 1 }),
      ).toBe(16.25);
    });
  });

  describe("returnableQuantity (S13)", () => {
    it("subtracts what previous returns already took", () => {
      expect(returnableQuantity(line(), {})).toBe(10);
      expect(returnableQuantity(line(), { "li-1": 3 })).toBe(7);
      expect(returnableQuantity(line(), { "li-1": 10 })).toBe(0);
    });

    it("never goes negative even if a return overshot", () => {
      expect(returnableQuantity(line(), { "li-1": 12 })).toBe(0);
    });

    it("treats missing quantities as zero", () => {
      expect(returnableQuantity(line({ quantity: undefined as never }), {})).toBe(0);
    });
  });

  describe("buildReturnPayload", () => {
    it("drops zero and negative quantities", () => {
      const selections: ReturnSelection[] = [
        { saleItemId: "li-1", quantity: 2 },
        { saleItemId: "li-2", quantity: 0 },
        { saleItemId: "li-3", quantity: -1 },
      ];

      expect(buildReturnPayload(selections, "  llegó dañado ")).toEqual({
        items: [{ saleItemId: "li-1", quantity: 2 }],
        reason: "llegó dañado",
      });
    });

    it("omits the reason when blank", () => {
      expect(buildReturnPayload([{ saleItemId: "li-1", quantity: 1 }], "  ")).toEqual(
        {
          items: [{ saleItemId: "li-1", quantity: 1 }],
        },
      );
    });
  });

  describe("paymentStatusLabel", () => {
    it("labels the three states", () => {
      expect(paymentStatusLabel("PAID").text).toBe("Pagada");
      expect(paymentStatusLabel("PARTIAL").text).toBe("Parcial");
      expect(paymentStatusLabel("UNPAID").text).toBe("Impaga");
    });
  });
});
