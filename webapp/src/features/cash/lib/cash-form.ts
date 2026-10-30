/**
 * Pure helpers for the cash screen (S5): payload builders and the arqueo
 * preview. Kept out of the component so vitest (node env, no DOM) covers them.
 */

export interface OpenShiftPayload {
  initialAmountUSD: number;
  notes?: string;
}

export interface CloseShiftPayload {
  actualAmountUSD: number;
  notes?: string;
}

/** The backend rejects negatives; we never send them. */
export function buildOpenShiftPayload(
  initialAmount: number,
  notes?: string,
): OpenShiftPayload {
  return {
    initialAmountUSD: Math.max(0, Number.isFinite(initialAmount) ? initialAmount : 0),
    ...(notes?.trim() ? { notes: notes.trim() } : {}),
  };
}

export function buildCloseShiftPayload(
  countedAmount: number,
  notes?: string,
): CloseShiftPayload {
  return {
    actualAmountUSD: Math.max(
      0,
      Number.isFinite(countedAmount) ? countedAmount : 0,
    ),
    ...(notes?.trim() ? { notes: notes.trim() } : {}),
  };
}

export type ArqueoVerdict = "CUADRA" | "SOBRANTE" | "FALTANTE";

/**
 * The arqueo the cashier reads before closing: what the system expects vs what
 * was counted, plus the verdict. Rounding tolerance of one cent (the backend
 * uses the same tolerance to decide PAID/PARTIAL).
 */
export function arqueoPreview(
  expected: number,
  counted: number,
): { differenceUSD: number; verdict: ArqueoVerdict } {
  const safeExpected = Number.isFinite(expected) ? expected : 0;
  const safeCounted = Number.isFinite(counted) ? counted : 0;
  const differenceUSD = Math.round((safeCounted - safeExpected) * 100) / 100;

  if (Math.abs(differenceUSD) <= 0.01) {
    return { differenceUSD: 0, verdict: "CUADRA" };
  }
  return {
    differenceUSD,
    verdict: differenceUSD > 0 ? "SOBRANTE" : "FALTANTE",
  };
}

/** Local calendar day as `YYYY-MM-DD` (what the date input wants). */
export function todayISO(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** `$1.234,56`-style label for money columns (2 decimals always). */
export function formatAmount(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return `$${safe.toFixed(2)}`;
}
