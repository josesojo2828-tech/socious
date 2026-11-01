/**
 * Presentation own-price mapping (precio propio por presentación).
 *
 * A presentation either carries its own `salePriceUSD` or inherits the
 * product price when the column is null. The card inputs arrive as strings
 * ("" = hereda) and the API speaks `string | number | null` (Prisma Decimal
 * serializes as string), so both directions live here — pure, node-testable.
 */

/**
 * Maps the "Precio de venta" input to the number that goes in the body:
 * empty/blank → null (no own price: inherit on create, clear on patch);
 * anything unparseable or negative → null as well (the input is numeric
 * with min=0, this just refuses to send garbage).
 */
export function parsePresentationSalePrice(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

/** Human label for the effective price: own price or "hereda". */
export function presentationPriceLabel(
  salePriceUSD: string | number | null | undefined,
): string {
  if (salePriceUSD === null || salePriceUSD === undefined) return "hereda";
  const parsed = Number(salePriceUSD);
  if (!Number.isFinite(parsed)) return "hereda";
  return `$${parsed.toFixed(2)}`;
}
