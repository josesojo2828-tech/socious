import { describe, expect, it } from "vitest";
import type { Supplier } from "../types/supplier.type";
import { buildListParams, filterSuppliers, sumPendingBalance } from "./supplier-list";

const row = (overrides: Partial<Supplier> = {}): Supplier => ({
  id: "s-1",
  name: "Distribuidora Norte",
  taxId: "J-3000000-1",
  contactName: "María López",
  isActive: true,
  currentBalanceUSD: "0",
  ...overrides,
});

describe("supplier-list (makeover T3)", () => {
  it("returns every row when the query is empty or whitespace", () => {
    const rows = [row(), row({ id: "s-2", name: "Sur" })];

    expect(filterSuppliers(rows, "")).toHaveLength(2);
    expect(filterSuppliers(rows, "   ")).toHaveLength(2);
  });

  it("matches name, taxId and contactName case-insensitively", () => {
    const rows = [
      row({ id: "s-1", name: "Distribuidora Norte", taxId: "J-3000000-1" }),
      row({ id: "s-2", name: "Sur", taxId: "J-1", contactName: "Ana Pérez" }),
    ];

    expect(filterSuppliers(rows, "norte").map((r) => r.id)).toEqual(["s-1"]);
    expect(filterSuppliers(rows, "j-300").map((r) => r.id)).toEqual(["s-1"]);
    expect(filterSuppliers(rows, "ANA").map((r) => r.id)).toEqual(["s-2"]);
    expect(filterSuppliers(rows, "pérez").map((r) => r.id)).toEqual(["s-2"]);
  });

  it("returns an empty list when nothing matches", () => {
    expect(filterSuppliers([row()], "inexistente")).toEqual([]);
  });

  it("tolerates null taxId/contactName and a missing balance in the row data", () => {
    const rows = [
      row({ taxId: null, contactName: null, currentBalanceUSD: undefined }),
    ];

    expect(filterSuppliers(rows, "norte")).toHaveLength(1);
    expect(sumPendingBalance(rows)).toBe(0);
  });

  it("sums the pending balance as a real number, skipping invalid values", () => {
    const rows = [
      row({ id: "s-1", currentBalanceUSD: "10.5" }),
      row({ id: "s-2", currentBalanceUSD: 4 }),
      row({ id: "s-3", currentBalanceUSD: "no-numero" }),
      row({ id: "s-4", currentBalanceUSD: undefined }),
    ];

    expect(sumPendingBalance(rows)).toBeCloseTo(14.5);
  });

  it("returns 0 for an empty directory", () => {
    expect(sumPendingBalance([])).toBe(0);
  });
});

describe("supplier-list buildListParams (list pagination)", () => {
  it("defaults to page 1 with the page size of 25", () => {
    expect(buildListParams({})).toEqual({ page: 1, limit: 25 });
  });

  it("passes an explicit page through", () => {
    expect(buildListParams({ page: 5 }).page).toBe(5);
    expect(buildListParams({ page: 5 }).limit).toBe(25);
  });

  it("includes a trimmed q and omits empty or whitespace-only q", () => {
    expect(buildListParams({ q: "  norte  " }).q).toBe("norte");
    expect(buildListParams({ q: "" })).not.toHaveProperty("q");
    expect(buildListParams({ q: "   " })).not.toHaveProperty("q");
  });

  it("combines page and q for a filtered request", () => {
    expect(buildListParams({ page: 2, q: "norte" })).toEqual({
      page: 2,
      limit: 25,
      q: "norte",
    });
  });
});
