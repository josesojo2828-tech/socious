import { describe, expect, it } from "vitest";
import {
  buildFinancialSummary,
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
