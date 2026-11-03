import { describe, expect, it } from "vitest";
import {
  buildFinancialSummary,
  filterOpenItemsByRange,
  openItemNumber,
  openItemParty,
  sumOpenItems,
  type FinancialReportSlice,
} from "./financial-summary";

const emptySales = (): FinancialReportSlice => ({
  issued: { count: 0, totalUSD: 0, totalVES: 0, totalUSDT: 0 },
  accrualByMonth: [],
  collectionsByMonth: [],
  aging: { current: 0, days1_30: 0, days31_60: 0, over60: 0 },
  openItems: [],
});

const emptyPurchases = (): FinancialReportSlice => ({
  issued: { count: 0, totalUSD: 0, totalVES: 0, totalUSDT: 0 },
  accrualByMonth: [],
  paymentsByMonth: [],
  aging: { current: 0, days1_30: 0, days31_60: 0, over60: 0 },
  openItems: [],
});

describe("buildFinancialSummary", () => {
  it("answers zeroes for empty reports", () => {
    const summary = buildFinancialSummary(emptySales(), emptyPurchases());
    expect(summary.salesUSD).toBe(0);
    expect(summary.purchasesUSD).toBe(0);
    expect(summary.resultUSD).toBe(0);
    expect(summary.collectedUSD).toBe(0);
    expect(summary.paidUSD).toBe(0);
    expect(summary.receivableUSD).toBe(0);
    expect(summary.payableUSD).toBe(0);
  });

  it("computes result as sales minus purchases", () => {
    const sales = emptySales();
    sales.issued.totalUSD = 1000;
    sales.issued.count = 4;
    const purchases = emptyPurchases();
    purchases.issued.totalUSD = 600;
    purchases.issued.count = 2;

    const summary = buildFinancialSummary(sales, purchases);
    expect(summary.salesUSD).toBe(1000);
    expect(summary.purchasesUSD).toBe(600);
    expect(summary.resultUSD).toBe(400);
    expect(summary.salesCount).toBe(4);
    expect(summary.purchasesCount).toBe(2);
  });

  it("answers a negative result when purchases exceed sales (loss)", () => {
    const sales = emptySales();
    sales.issued.totalUSD = 200;
    const purchases = emptyPurchases();
    purchases.issued.totalUSD = 350;

    expect(buildFinancialSummary(sales, purchases).resultUSD).toBe(-150);
  });

  it("sums collections and payments from the month buckets", () => {
    const sales = emptySales();
    sales.collectionsByMonth = [
      { month: "2026-10", totalUSD: 100, count: 1 },
      { month: "2026-11", totalUSD: 50, count: 2 },
    ];
    const purchases = emptyPurchases();
    purchases.paymentsByMonth = [
      { month: "2026-10", totalUSD: 80, count: 1 },
      { month: "2026-11", totalUSD: 20, count: 1 },
    ];

    const summary = buildFinancialSummary(sales, purchases);
    expect(summary.collectedUSD).toBe(150);
    expect(summary.paidUSD).toBe(100);
  });

  it("sums the aging buckets into receivable and payable", () => {
    const sales = emptySales();
    sales.aging = { current: 10, days1_30: 20, days31_60: 30, over60: 40 };
    const purchases = emptyPurchases();
    purchases.aging = { current: 5, days1_30: 5, days31_60: 0, over60: 0 };

    const summary = buildFinancialSummary(sales, purchases);
    expect(summary.receivableUSD).toBe(100);
    expect(summary.payableUSD).toBe(10);
  });

  it("rounds each report total to cents before subtracting", () => {
    const sales = emptySales();
    sales.issued.totalUSD = 10.005;
    const purchases = emptyPurchases();
    purchases.issued.totalUSD = 3.004;

    // 10.01 − 3.00 = 7.01 — money is rounded per document, then subtracted.
    expect(buildFinancialSummary(sales, purchases).resultUSD).toBe(7.01);
  });
});

describe("filterOpenItemsByRange", () => {
  const item = (issueDate: string, totalUSD = 100) => ({
    id: `x-${issueDate}`,
    saleNumber: "VTA-1",
    issueDate,
    totalUSD,
    daysOverdue: 0,
    client: { id: "c1", name: "Ana" },
  });

  it("keeps only open items issued inside the inclusive range", () => {
    const items = [
      item("2026-10-15T12:00:00.000Z"),
      item("2026-11-01T00:00:00.000Z"),
      item("2026-11-15T12:00:00.000Z"),
      item("2026-11-30T23:59:59.000Z"),
      item("2026-12-01T00:00:00.000Z"),
    ];
    const filtered = filterOpenItemsByRange(items, "2026-11-01", "2026-11-30");
    expect(filtered.map((i) => i.issueDate)).toEqual([
      "2026-11-01T00:00:00.000Z",
      "2026-11-15T12:00:00.000Z",
      "2026-11-30T23:59:59.000Z",
    ]);
  });

  it("passes everything through when either bound is missing", () => {
    const items = [item("2026-01-01T00:00:00.000Z")];
    expect(filterOpenItemsByRange(items, "", "2026-11-30")).toEqual(items);
    expect(filterOpenItemsByRange(items, "2026-11-01", "")).toEqual(items);
  });

  it("excludes unparseable issue dates when a range is set", () => {
    expect(
      filterOpenItemsByRange([item("not-a-date")], "2026-11-01", "2026-11-30"),
    ).toEqual([]);
  });
});

describe("sumOpenItems / openItem helpers", () => {
  it("sums totalUSD to cents", () => {
    expect(
      sumOpenItems([
        { id: "1", issueDate: "2026-11-01", totalUSD: 10.005, daysOverdue: 0 },
        { id: "2", issueDate: "2026-11-02", totalUSD: 5, daysOverdue: 0 },
      ]),
    ).toBe(15.01);
  });

  it("prefers the client name for sales and the supplier for purchases", () => {
    expect(
      openItemParty({
        id: "1",
        issueDate: "2026-11-01",
        totalUSD: 1,
        daysOverdue: 0,
        client: { id: "c", name: "Ana" },
      }),
    ).toBe("Ana");
    expect(
      openItemParty({
        id: "2",
        issueDate: "2026-11-01",
        totalUSD: 1,
        daysOverdue: 0,
        supplier: { id: "s", name: "Mercados" },
      }),
    ).toBe("Mercados");
    expect(
      openItemParty({ id: "3", issueDate: "2026-11-01", totalUSD: 1, daysOverdue: 0 }),
    ).toBe("—");
  });

  it("prefers saleNumber over purchaseNumber", () => {
    expect(
      openItemNumber({
        id: "1",
        saleNumber: "VTA-9",
        purchaseNumber: "COM-1",
        issueDate: "2026-11-01",
        totalUSD: 1,
        daysOverdue: 0,
      }),
    ).toBe("VTA-9");
    expect(
      openItemNumber({
        id: "2",
        purchaseNumber: "COM-2",
        issueDate: "2026-11-01",
        totalUSD: 1,
        daysOverdue: 0,
      }),
    ).toBe("COM-2");
  });
});
