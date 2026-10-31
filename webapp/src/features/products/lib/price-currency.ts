/**
 * Multi-currency price entry (S3). Storage stays USD-canonical; the form
 * interprets what the merchant types in the selected currency and shows the
 * live equivalents. Conversions follow the POS rule: VES = USD × BCV,
 * USDT = (USD × BCV) / USDT-rate.
 */

export type PriceCurrency = "USD" | "VES" | "USDT";

export interface ExchangeRates {
  rateBcv: number;
  rateUsdt: number;
}

export const PRICE_CURRENCY_LABELS: Record<PriceCurrency, string> = {
  USD: "Dólar (USD)",
  VES: "Bolívar (VES)",
  USDT: "USDT (Binance)",
};

export const BCV_HINT =
  "Lo recomendable es registrar el costo en USD usando la tasa BCV.";

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** USD → the display currency. Without rates everything stays USD. */
export function convertFromUSD(
  amountUSD: number,
  currency: PriceCurrency,
  rates: ExchangeRates | null,
): number {
  if (!rates || currency === "USD") return roundMoney(amountUSD);
  if (currency === "VES") return roundMoney(amountUSD * rates.rateBcv);
  return roundMoney((amountUSD * rates.rateBcv) / rates.rateUsdt);
}

/** The display currency → USD for storage. */
export function convertToUSD(
  amount: number,
  currency: PriceCurrency,
  rates: ExchangeRates | null,
): number {
  if (!rates || currency === "USD") return roundMoney(amount);
  if (currency === "VES") return roundMoney(amount / rates.rateBcv);
  return roundMoney((amount * rates.rateUsdt) / rates.rateBcv);
}

/** One-line live summary: "≈ X VES · ≈ Y USDT" for an amount in USD. */
export function priceEquivalents(
  amountUSD: number,
  rates: ExchangeRates | null,
): string {
  if (!rates) return "";
  const parts: string[] = [];
  const ves = convertFromUSD(amountUSD, "VES", rates);
  const usdt = convertFromUSD(amountUSD, "USDT", rates);
  if (ves) parts.push(`≈ ${ves.toLocaleString("es-VE")} Bs`);
  if (usdt) parts.push(`≈ ${usdt.toLocaleString("es-VE", { minimumFractionDigits: 2 })} USDT`);
  return parts.join(" · ");
}
