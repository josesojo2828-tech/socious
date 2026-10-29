/**
 * Normalization shared by the exchange-list search column and its queries.
 *
 * `FoodExchangeList.searchText` stores name + category + sub in folded form so
 * Prisma's `contains` can match a query typed without accents ("Kefir" must
 * find "Kéfir"). Both sides of that comparison MUST go through this function —
 * the row when it is written, the query string when it is searched — otherwise
 * the two sides drift and the search silently stops matching.
 *
 * Keep the SQL backfill in
 * `prisma/migrations/<add_search_text>/migration.sql` in sync with this
 * behaviour: it applies `translate` over the same concatenation for rows that
 * exist before the seeder rewrites them.
 */
export function normalizeSearchText(
  ...parts: (string | number | null | undefined)[]
): string {
  return parts
    .filter((part): part is string | number => part !== null && part !== undefined)
    .map((part) => String(part))
    .join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
