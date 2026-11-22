/**
 * Cashea (BNPL) helpers for the POS. Pure so vitest covers the math and the
 * date handling without a DOM.
 *
 * Cashea charges the customer every 14 days. The sale stores the initial paid
 * at the counter plus the equal installments Cashea will pay; the financed part
 * is a receivable against Cashea, never the client's debt.
 */

export const CASHEA_CADENCE_DAYS = 14;

export interface CasheaDraft {
  /** What the customer pays at the counter. */
  initialUSD: number;
  installmentCount: number;
  /** `yyyy-mm-dd` from the date input. */
  firstDueDate: string;
}

export interface CasheaPlanPayload {
  initialUSD: number;
  installmentCount: number;
  installmentUSD: number;
  /** Full ISO timestamp of the first installment. */
  firstDueDate: string;
}

export interface CasheaPreviewEntry {
  number: number;
  date: Date;
  amountUSD: number;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** `yyyy-mm-dd` parsed as a LOCAL date (never UTC, which shifts the day). */
export function parseDateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

/** Local midnight of the chosen day as an ISO timestamp the backend can parse. */
export function dateOnlyToIso(value: string): string {
  const date = parseDateOnly(value);
  return (date ?? new Date()).toISOString();
}

/** Suggested first installment: two weeks after the sale. */
export function defaultCasheaFirstDueDate(from: Date = new Date()): string {
  const date = new Date(from);
  date.setDate(date.getDate() + CASHEA_CADENCE_DAYS);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** What Cashea finances: everything the initial does not cover. */
export function casheaFinancedUSD(totalUSD: number, initialUSD: number): number {
  return roundMoney(Math.max(0, (totalUSD || 0) - (initialUSD || 0)));
}

/** Equal installments of the financed part. */
export function casheaInstallmentUSD(
  totalUSD: number,
  initialUSD: number,
  installmentCount: number,
): number {
  const financed = casheaFinancedUSD(totalUSD, initialUSD);
  if (!Number.isFinite(installmentCount) || installmentCount < 1) return 0;
  return roundMoney(financed / installmentCount);
}

/** User-facing error for an unusable draft, or `null` when it is fine. */
export function validateCashea(
  totalUSD: number,
  draft: Pick<CasheaDraft, "initialUSD" | "installmentCount">,
): string | null {
  const initial = draft.initialUSD ?? 0;
  if (!Number.isFinite(initial) || initial < 0) {
    return "El pago inicial de Cashea no puede ser negativo.";
  }
  if (initial > totalUSD + 0.01) {
    return "El pago inicial de Cashea no puede superar el total de la venta.";
  }
  if (
    !Number.isFinite(draft.installmentCount) ||
    draft.installmentCount < 1 ||
    draft.installmentCount > 36
  ) {
    return "Cashea necesita entre 1 y 36 cuotas.";
  }
  return null;
}

/** The exact shape POST /api/sales expects for `cashea`. */
export function buildCasheaPlan(
  totalUSD: number,
  draft: CasheaDraft,
): CasheaPlanPayload {
  const initial = roundMoney(Math.min(Math.max(draft.initialUSD || 0, 0), totalUSD));
  return {
    initialUSD: initial,
    installmentCount: draft.installmentCount,
    installmentUSD: casheaInstallmentUSD(
      totalUSD,
      initial,
      draft.installmentCount,
    ),
    firstDueDate: dateOnlyToIso(draft.firstDueDate),
  };
}

/** When each installment is expected, every 14 days from the first one. */
export function casheaPreview(
  totalUSD: number,
  draft: CasheaDraft,
): CasheaPreviewEntry[] {
  const first = parseDateOnly(draft.firstDueDate);
  const count = Math.floor(draft.installmentCount ?? 0);
  if (!first || count < 1) return [];

  const amountUSD = casheaInstallmentUSD(totalUSD, draft.initialUSD, count);
  const entries: CasheaPreviewEntry[] = [];
  for (let index = 0; index < count; index += 1) {
    const date = new Date(first);
    date.setDate(date.getDate() + CASHEA_CADENCE_DAYS * index);
    entries.push({ number: index + 1, date, amountUSD });
  }
  return entries;
}
