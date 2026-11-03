/**
 * Pure helpers for the financial dashboard's exchange-rate section:
 * snapshot differentials (USDT−BCV, Paralelo−BCV) and range filtering of
 * GET /api/exchange/rates/history rows.
 */

export interface RateHistoryRow {
  id?: string | null;
  date: string;
  rateBcv: number;
  rateUsdt: number;
  rateParallel?: number | null;
  source?: string;
}

export interface RateSnapshotDifferentials {
  date: string;
  rateBcv: number;
  rateUsdt: number;
  rateParallel: number | null;
  /** rateUsdt − rateBcv in Bs; null when either side is unusable. */
  usdtBcvAbs: number | null;
  /** (rateUsdt − rateBcv) / rateBcv × 100, 2 decimals. */
  usdtBcvPct: number | null;
  /** rateParallel − rateBcv in Bs; null when no parallel rate. */
  parallelBcvAbs: number | null;
  parallelBcvPct: number | null;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function spread(
  value: number | null | undefined,
  base: number,
): { abs: number | null; pct: number | null } {
  if (
    value == null ||
    !Number.isFinite(value) ||
    !Number.isFinite(base) ||
    base <= 0
  ) {
    return { abs: null, pct: null };
  }
  const abs = round2(value - base);
  return { abs, pct: round2(((value - base) / base) * 100) };
}

/**
 * Newest row becomes the snapshot; spreads are derived from it.
 * Answers null when there are no rows at all.
 */
export function buildRateDifferentials(
  rows: RateHistoryRow[],
): RateSnapshotDifferentials | null {
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const sorted = [...rows].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  const newest = sorted[0];
  const rateBcv = Number(newest.rateBcv);
  const rateUsdt = Number(newest.rateUsdt);
  const rateParallel =
    newest.rateParallel == null ? null : Number(newest.rateParallel);

  const usdt = spread(rateUsdt, rateBcv);
  const parallel = spread(rateParallel, rateBcv);

  return {
    date: newest.date,
    rateBcv,
    rateUsdt,
    rateParallel,
    usdtBcvAbs: usdt.abs,
    usdtBcvPct: usdt.pct,
    parallelBcvAbs: parallel.abs,
    parallelBcvPct: parallel.pct,
  };
}

/**
 * Inclusive `[from, to]` day filter (YYYY-MM-DD). BOTH bounds must be
 * present to filter at all — a half-filled custom range answers the rows
 * unchanged so the chart never silently drops history. Row dates are
 * compared in UTC so an ISO `Z` timestamp never slides across a day
 * boundary because of the browser timezone.
 */
export function filterRatesByRange(
  rows: RateHistoryRow[],
  from: string,
  to: string,
): RateHistoryRow[] {
  if (!Array.isArray(rows)) return [];
  if (!from || !to) return rows;

  const start = Date.parse(`${from}T00:00:00.000Z`);
  const end = Date.parse(`${to}T23:59:59.999Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return rows;

  return rows.filter((row) => {
    const time = Date.parse(row.date);
    if (Number.isNaN(time)) return false;
    return time >= start && time <= end;
  });
}

export interface OpenCloseRates {
  /** Oldest row in the set — the range's opening snapshot. */
  open: RateHistoryRow;
  /** Newest row in the set — the range's closing snapshot. */
  close: RateHistoryRow;
}

/**
 * Opening = oldest row, closing = newest row of the set the caller already
 * filtered to the active range. Answers null when there is nothing to
 * compare (empty history).
 */
export function buildOpenCloseRates(
  rows: RateHistoryRow[],
): OpenCloseRates | null {
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const sorted = [...rows].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  return { open: sorted[0], close: sorted[sorted.length - 1] };
}
