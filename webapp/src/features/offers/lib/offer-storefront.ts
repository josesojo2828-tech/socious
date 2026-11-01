/**
 * Storefront offer display (S11): pure formatting helpers for the public
 * `/shop/[slug]` page. The backend already filters the visible offers and
 * applies the discount — these helpers only shape the copy the shop renders.
 */

/**
 * Discount chip, e.g. `−10%`, or null when the offer does not discount
 * anything so the storefront renders no chip at all.
 */
export function offerPercentLabel(percent: number): string | null {
  const pct = Math.round(Number(percent) || 0);
  if (pct <= 0) return null;
  return `\u2212${pct}%`;
}

/**
 * "Vence dd/mm" from the stored expiry instant. The offer form stores the
 * chosen day at UTC midnight, so the label reads the UTC calendar day and
 * never shifts with the visitor's timezone; an unusable value returns null
 * and the line is simply skipped.
 */
export function offerExpiresLabel(
  expiresAt: string | Date | null | undefined,
): string | null {
  if (expiresAt == null || expiresAt === "") return null;
  const date = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return null;
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `Vence ${day}/${month}`;
}
