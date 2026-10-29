import type { CurrencyCode } from "../constants/payment-methods";

/**
 * Currency math for Socius ERP.
 *
 * Rate semantics (confirmed against `shared/types/exchange.types.ts`):
 *  - `rateBcv`  = VES per 1 USD (official BCV rate)
 *  - `rateUsdt` = VES per 1 USDT (Binance P2P rate)
 *
 * Every sale, purchase and payment persists a frozen snapshot of both rates,
 * so historical documents never change when today's rate changes:
 *  - `totalVES  = totalUSD × rateBcv`
 *  - `totalUSDT = totalVES ÷ rateUsdt`
 */

export interface RateSnapshot {
  rateBcv: number;
  rateUsdt: number;
}

/** Rounds to 2 decimals (money) tolerating binary floating point noise. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Guards a rate snapshot. A zero or negative rate would silently wipe a total
 * to zero or explode it to Infinity, so callers must fail loudly instead.
 */
export function assertValidRates(rates: RateSnapshot): void {
  if (!Number.isFinite(rates.rateBcv) || rates.rateBcv <= 0) {
    throw new Error(`Invalid BCV rate: ${rates.rateBcv}`);
  }
  if (!Number.isFinite(rates.rateUsdt) || rates.rateUsdt <= 0) {
    throw new Error(`Invalid USDT rate: ${rates.rateUsdt}`);
  }
}

/** USD → VES with the BCV snapshot. */
export function usdToVes(amountUsd: number, rates: RateSnapshot): number {
  assertValidRates(rates);
  return round2(amountUsd * rates.rateBcv);
}

/** VES → USD with the BCV snapshot. */
export function vesToUsd(amountVes: number, rates: RateSnapshot): number {
  assertValidRates(rates);
  return round2(amountVes / rates.rateBcv);
}

/** VES → USDT with the Binance snapshot. */
export function vesToUsdt(amountVes: number, rates: RateSnapshot): number {
  assertValidRates(rates);
  return round2(amountVes / rates.rateUsdt);
}

/** USD → USDT going through VES (BCV to buy VES, Binance to buy USDT). */
export function usdToUsdt(amountUsd: number, rates: RateSnapshot): number {
  assertValidRates(rates);
  return round2((amountUsd * rates.rateBcv) / rates.rateUsdt);
}

export interface DocumentTotalsInput {
  subtotalUSD: number;
  discountUSD?: number;
  taxUSD?: number;
}

export interface DocumentTotals {
  subtotalUSD: number;
  discountUSD: number;
  taxUSD: number;
  totalUSD: number;
  totalVES: number;
  totalUSDT: number;
}

/**
 * Builds the frozen three-currency totals of a sale or purchase.
 * A discount larger than the subtotal plus tax clamps the total to zero
 * instead of producing a negative document.
 */
export function buildDocumentTotals(
  input: DocumentTotalsInput,
  rates: RateSnapshot,
): DocumentTotals {
  assertValidRates(rates);

  const subtotalUSD = round2(input.subtotalUSD ?? 0);
  const discountUSD = round2(input.discountUSD ?? 0);
  const taxUSD = round2(input.taxUSD ?? 0);
  const totalUSD = Math.max(0, round2(subtotalUSD - discountUSD + taxUSD));

  return {
    subtotalUSD,
    discountUSD,
    taxUSD,
    totalUSD,
    totalVES: round2(totalUSD * rates.rateBcv),
    totalUSDT: round2((totalUSD * rates.rateBcv) / rates.rateUsdt),
  };
}

export interface PaymentAmounts {
  amountOriginal: number;
  amountUSD: number;
  amountVES: number;
  amountUSDT: number;
}

/**
 * Normalizes one payment captured in its original currency into the three
 * stored currencies, using the snapshot frozen on the document.
 */
export function buildPaymentAmounts(
  amountOriginal: number,
  currency: CurrencyCode,
  rates: RateSnapshot,
): PaymentAmounts {
  assertValidRates(rates);

  const amount = round2(amountOriginal ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`Invalid payment amount: ${amountOriginal}`);
  }

  let amountUSD: number;
  let amountVES: number;
  let amountUSDT: number;

  switch (currency) {
    case "USD":
      amountUSD = amount;
      amountVES = round2(amount * rates.rateBcv);
      amountUSDT = round2(amountVES / rates.rateUsdt);
      break;
    case "VES":
      amountVES = amount;
      amountUSD = round2(amount / rates.rateBcv);
      amountUSDT = round2(amount / rates.rateUsdt);
      break;
    case "USDT":
      amountUSDT = amount;
      amountVES = round2(amount * rates.rateUsdt);
      amountUSD = round2(amountVES / rates.rateBcv);
      break;
    default:
      throw new Error(`Unsupported currency: ${currency}`);
  }

  return { amountOriginal: amount, amountUSD, amountVES, amountUSDT };
}

/**
 * Payment status derived from how much was actually collected against the
 * document total. Uses a 1-cent tolerance so rounding never leaves a document
 * stuck in PARTIAL forever.
 */
export type PaymentProgress = "UNPAID" | "PARTIAL" | "PAID";

export function derivePaymentStatus(
  totalUSD: number,
  paidUSD: number,
): PaymentProgress {
  const total = round2(totalUSD ?? 0);
  const paid = round2(paidUSD ?? 0);

  if (total <= 0) return "PAID";
  if (paid <= 0) return "UNPAID";
  if (paid + 0.01 >= total) return "PAID";
  return "PARTIAL";
}

/** Remaining balance never goes negative. */
export function remainingBalance(totalUSD: number, paidUSD: number): number {
  return Math.max(0, round2((totalUSD ?? 0) - (paidUSD ?? 0)));
}

/** Prisma `Decimal` accepts a numeric string; avoid passing raw floats. */
export function toDecimal(value: number): string {
  return round2(value ?? 0).toFixed(2);
}
