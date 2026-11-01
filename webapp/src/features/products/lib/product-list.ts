/** Pure list logic for the product catalog screen (list pagination). */

export interface ProductListFilters {
  page?: number;
  q?: string;
  status?: string;
}

/**
 * Query params for GET /api/products: page defaults to 1, the page size is
 * fixed at 25, and empty q/status values are omitted so the backend keeps
 * its own defaults for them.
 */
export function buildListParams(
  filters: ProductListFilters,
): Record<string, string | number> {
  const params: Record<string, string | number> = {
    page: filters.page ?? 1,
    limit: 25,
  };

  if (filters.q?.trim()) params.q = filters.q.trim();
  if (filters.status) params.status = filters.status;

  return params;
}
