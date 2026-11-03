/**
 * Pure aggregation of the sales + purchases report slices into the KPIs the
 * financial dashboard shows (Ventas − Compras del período).
 *
 * Both reports already accept `from`/`to`; this helper only folds the
 * response shapes — no fetching, no formatting.
 */

export interface FinancialAging {
  current: number;
  days1_30: number;
  days31_60: number;
  over60: number;
}

export interface FinancialMonthBucket {
  month: string;
  totalUSD: number;
  count: number;
}

/** One open (unpaid) document from either report's `openItems`. */
export interface FinancialOpenItem {
  id: string;
  saleNumber?: string;
  purchaseNumber?: string;
  issueDate: string;
  dueDate?: string | null;
  totalUSD: number;
  daysOverdue: number;
  client?: { id: string; name: string } | null;
  supplier?: { id: string; name: string } | null;
}

/** Shared shape of GET /api/sales/report and GET /api/purchases/report. */
export interface FinancialReportSlice {
  issued: {
    count: number;
    totalUSD: number;
    totalVES?: number;
    totalUSDT?: number;
  };
  accrualByMonth: FinancialMonthBucket[];
  /** Sales report only. */
  collectionsByMonth?: FinancialMonthBucket[];
  /** Purchases report only. */
  paymentsByMonth?: FinancialMonthBucket[];
  aging: FinancialAging;
  openItems: FinancialOpenItem[];
}

export interface FinancialSummary {
  /** Accrued sales in the period (USD). */
  salesUSD: number;
  salesCount: number;
  /** Accrued purchases in the period (USD). */
  purchasesUSD: number;
  purchasesCount: number;
  /** Ventas − Compras: positive = ganancia, negative = pérdida. */
  resultUSD: number;
  /** Sale payments whose `paidAt` fell in the period. */
  collectedUSD: number;
  /** Purchase payments whose `paidAt` fell in the period. */
  paidUSD: number;
  /** Open AR total (aging sum) — current, not period-scoped. */
  receivableUSD: number;
  /** Open AP total (aging sum) — current, not period-scoped. */
  payableUSD: number;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function sumMonths(buckets: FinancialMonthBucket[] | undefined): number {
  if (!Array.isArray(buckets)) return 0;
  return round2(
    buckets.reduce((sum, bucket) => sum + Number(bucket.totalUSD || 0), 0),
  );
}

function sumAging(aging: FinancialAging): number {
  if (!aging) return 0;
  return round2(
    Number(aging.current || 0) +
      Number(aging.days1_30 || 0) +
      Number(aging.days31_60 || 0) +
      Number(aging.over60 || 0),
  );
}

/**
 * Folds both report slices into the dashboard KPIs. Missing optional
 * sections (a report shape that omitted month buckets) count as zero so a
 * partial response never throws.
 */
export function buildFinancialSummary(
  sales: FinancialReportSlice,
  purchases: FinancialReportSlice,
): FinancialSummary {
  const salesUSD = round2(Number(sales?.issued?.totalUSD || 0));
  const purchasesUSD = round2(Number(purchases?.issued?.totalUSD || 0));

  return {
    salesUSD,
    salesCount: Number(sales?.issued?.count || 0),
    purchasesUSD,
    purchasesCount: Number(purchases?.issued?.count || 0),
    resultUSD: round2(salesUSD - purchasesUSD),
    collectedUSD: sumMonths(sales?.collectionsByMonth),
    paidUSD: sumMonths(purchases?.paymentsByMonth),
    receivableUSD: sumAging(sales?.aging),
    payableUSD: sumAging(purchases?.aging),
  };
}

/**
 * The backend's `openItems` are EVERY unpaid document (no date filter).
 * This keeps only those whose `issueDate` falls inside `[from, to]` so the
 * dashboard lists "lo que deben de este rango". Empty bounds pass through.
 * Unparseable dates are excluded when a bound is set.
 */
export function filterOpenItemsByRange(
  items: FinancialOpenItem[],
  from: string,
  to: string,
): FinancialOpenItem[] {
  if (!Array.isArray(items)) return [];
  if (!from || !to) return items;

  const start = Date.parse(`${from}T00:00:00.000Z`);
  const end = Date.parse(`${to}T23:59:59.999Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return items;

  return items.filter((item) => {
    const time = Date.parse(item.issueDate);
    if (Number.isNaN(time)) return false;
    return time >= start && time <= end;
  });
}

/** Total of a filtered open-item list, rounded to cents. */
export function sumOpenItems(items: FinancialOpenItem[]): number {
  if (!Array.isArray(items)) return 0;
  return round2(
    items.reduce((sum, item) => sum + Number(item.totalUSD || 0), 0),
  );
}

/** Display name of an open item: client for sales, supplier for purchases. */
export function openItemParty(item: FinancialOpenItem): string {
  return item.client?.name ?? item.supplier?.name ?? "—";
}

/** Document number of an open item (sale or purchase). */
export function openItemNumber(item: FinancialOpenItem): string {
  return item.saleNumber ?? item.purchaseNumber ?? "—";
}
