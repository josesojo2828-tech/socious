import type { CurrencyVisibilityKey } from "@/features/settings/types/tenant-settings.type";

/**
 * Pure builder for the home dashboard "Tasa del día" card: one line per
 * currency the tenant enabled under Configuración → Monedas visibles,
 * always expressed in bolívares (the BCV line is the bare Bs-per-USD rate).
 */

export interface DailyRateLine {
  key: CurrencyVisibilityKey;
  label: string;
  /** Preformatted for display; "—" when the rate is missing or non-positive. */
  value: string;
}

/** Display order matches the settings screen (CURRENCY_LABELS key order). */
const RATE_ORDER: CurrencyVisibilityKey[] = [
  "showUSD",
  "showVES",
  "showUSDT",
  "showBCV",
  "showEUR",
];

const SHORT_LABELS: Record<CurrencyVisibilityKey, string> = {
  showUSD: "USD",
  showVES: "VES",
  showUSDT: "USDT",
  showBCV: "Tasa BCV",
  showEUR: "EUR",
};

export interface DailyRateSnapshot {
  rateBcv: number;
  rateUsdt: number;
  /** Official EUR → VES when the upstream reported one. */
  rateEur?: number | null;
}

function formatBs(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return "—";
  const formatted = amount.toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${formatted} Bs`;
}

function formatBare(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return "—";
  return amount.toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * @param visibility tenant `settings.currencies` switches (missing = off)
 * @param rates latest snapshot, or null when the exchange call failed
 */
export function buildDailyRateLines(
  visibility: Partial<Record<CurrencyVisibilityKey, boolean>>,
  rates: DailyRateSnapshot | null,
): DailyRateLine[] {
  const lines: DailyRateLine[] = [];

  for (const key of RATE_ORDER) {
    if (!visibility[key]) continue;

    let value = "—";
    if (key === "showVES") {
      // The quote currency itself: 1 VES is always 1 Bs.
      value = "1,00 Bs";
    } else if (rates) {
      if (key === "showUSD") value = formatBs(rates.rateBcv);
      else if (key === "showUSDT") value = formatBs(rates.rateUsdt);
      else if (key === "showBCV") value = formatBare(rates.rateBcv);
      else if (key === "showEUR")
        value = rates.rateEur != null ? formatBs(rates.rateEur) : "—";
    }

    lines.push({ key, label: SHORT_LABELS[key], value });
  }

  return lines;
}
