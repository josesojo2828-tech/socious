/** Pure list logic for the offers screen (list pagination). */

export interface OfferListFilters {
  page?: number;
  q?: string;
}

/**
 * Query params for GET /api/offers: page defaults to 1, the page size is
 * fixed at 25, and an empty q is omitted so the backend keeps its own
 * default for it.
 */
export function buildListParams(
  filters: OfferListFilters,
): Record<string, string | number> {
  const params: Record<string, string | number> = {
    page: filters.page ?? 1,
    limit: 25,
  };

  if (filters.q?.trim()) params.q = filters.q.trim();

  return params;
}
