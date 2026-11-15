/**
 * Pure helpers for the decimal input (money and quantity). Kept out of the
 * component so vitest (node env, no DOM) covers every rule.
 *
 * Money follows the cash-register mask chosen for costs and prices: the typed
 * digits are cents, so `1` renders `0.01` and `2550` renders `25.50`.
 * Quantities are plain decimal text: `01` becomes `1`, one separator, at most
 * `decimals` decimals. `decimals = 0` (units of measure of kind COUNT) accepts
 * whole numbers only.
 */

function formatNumber(value: number, decimals: number): string {
  return (Number.isFinite(value) ? value : 0).toFixed(decimals);
}

/** Strips leading zeros but keeps a lone `0` (`01` → `1`, `000` → `0`). */
function stripLeadingZeros(integer: string): string {
  return integer.replace(/^0+(?=\d)/, "");
}

/** Everything before the first decimal separator, digits only. */
function integerOnly(raw: string): string {
  const text = raw.replace(/,/g, ".").replace(/[^\d.]/g, "");
  const dot = text.indexOf(".");
  const integer = dot === -1 ? text : text.slice(0, dot);
  return stripLeadingZeros(integer);
}

/** Text the quantity field should hold while the user types. */
export function sanitizeQuantityDraft(raw: string, maxDecimals = 2): string {
  const source = String(raw ?? "");
  if (maxDecimals <= 0) return integerOnly(source);

  let text = source.replace(/,/g, ".").replace(/[^\d.]/g, "");
  const dot = text.indexOf(".");
  if (dot !== -1) {
    text = text.slice(0, dot + 1) + text.slice(dot + 1).replace(/\./g, "");
  }

  const hasDot = text.includes(".");
  const [integer = "", decimal = ""] = text.split(".");
  const intPart = hasDot
    ? stripLeadingZeros(integer) || "0"
    : stripLeadingZeros(integer);

  return hasDot ? `${intPart}.${decimal.slice(0, maxDecimals)}` : intPart;
}

/**
 * Canonical text for the quantity field once editing ends.
 *
 * With `decimals = 0` (COUNT units) a legacy fractional value is preserved
 * instead of rounded: opening a form must never rewrite stored data the
 * merchant did not touch.
 */
export function quantityTextFromDraft(
  draft: string,
  decimals = 2,
  allowEmpty = false,
): string {
  const clean = draft.endsWith(".") ? draft.slice(0, -1) : draft;
  if (clean === "") return allowEmpty ? "" : formatNumber(0, decimals);
  const value = Number(clean);
  if (!Number.isFinite(value)) {
    return allowEmpty ? "" : formatNumber(0, decimals);
  }
  if (decimals <= 0) {
    return Number.isInteger(value) ? String(value) : clean;
  }
  return value.toFixed(decimals);
}

/** Numeric value of a quantity draft; `null` when there is nothing to send. */
export function parseQuantityDraft(draft: string): number | null {
  const clean = draft.endsWith(".") ? draft.slice(0, -1) : draft;
  if (clean === "") return null;
  const value = Number(clean);
  return Number.isFinite(value) ? value : null;
}

/**
 * Display text for a quantity value coming from state or the API. A value that
 * already carries decimals keeps them even on a COUNT field, so an untouched
 * legacy row is shown (and submitted) as stored.
 */
export function quantityTextFromValue(
  value: string | number | null | undefined,
  decimals = 2,
): string {
  if (value === null || value === undefined || value === "") return "";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "";
  if (decimals <= 0) return String(numeric);
  return numeric.toFixed(decimals);
}

/** Money value → cents buffer (`25.5` → `"2550"`, `0` → `"0"`). */
export function toMoneyDigits(
  value: string | number | null | undefined,
  decimals = 2,
): string {
  if (value === null || value === undefined || value === "") return "";
  const numeric =
    typeof value === "number"
      ? value
      : Number(String(value).trim().replace(",", "."));
  if (!Number.isFinite(numeric)) return "";
  return String(Math.round(Math.abs(numeric) * 10 ** decimals));
}

/** Keeps only the typed digits (the mask reads everything as cents). */
export function sanitizeMoneyDigits(raw: string): string {
  return String(raw ?? "").replace(/\D/g, "");
}

/** Cents buffer → display text (`"2550"` → `"25.50"`). */
export function moneyText(
  digits: string,
  decimals = 2,
  allowEmpty = false,
): string {
  if (digits === "") return allowEmpty ? "" : formatNumber(0, decimals);
  const numeric = Number(digits);
  if (!Number.isFinite(numeric)) {
    return allowEmpty ? "" : formatNumber(0, decimals);
  }
  return (numeric / 10 ** decimals).toFixed(decimals);
}

/** Cents buffer → number (`"2550"` → `25.5`); `null` when empty. */
export function parseMoneyDigits(
  digits: string,
  decimals = 2,
): number | null {
  if (digits === "") return null;
  const numeric = Number(digits);
  if (!Number.isFinite(numeric)) return null;
  return Number((numeric / 10 ** decimals).toFixed(decimals));
}
