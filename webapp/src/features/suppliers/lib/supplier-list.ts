import type { Supplier } from "../types/supplier.type";

/** Pure list logic for the supplier directory (makeover T3): search + summary. */

/**
 * Case-insensitive search over name, taxId and contactName — the same fields
 * the old inline directory filtered. An empty/whitespace query returns all.
 */
export function filterSuppliers(rows: Supplier[], query: string): Supplier[] {
  const term = query.trim().toLowerCase();
  if (!term) return rows;
  return rows.filter((supplier) =>
    [supplier.name, supplier.taxId ?? "", supplier.contactName ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(term),
  );
}

/**
 * Total pending payable across the directory, summed from the real
 * `currentBalanceUSD` the list endpoint already returns per row.
 * Non-numeric values count as 0 instead of poisoning the total with NaN.
 */
export function sumPendingBalance(rows: Supplier[]): number {
  return rows.reduce((total, supplier) => {
    const value = Number(supplier.currentBalanceUSD ?? 0);
    return total + (Number.isFinite(value) ? value : 0);
  }, 0);
}

export interface SupplierListFilters {
  page?: number;
  q?: string;
}

/**
 * Query params for GET /api/suppliers: page defaults to 1, the page size is
 * fixed at 25, and an empty q is omitted so the backend keeps its own
 * default for it.
 */
export function buildListParams(
  filters: SupplierListFilters,
): Record<string, string | number> {
  const params: Record<string, string | number> = {
    page: filters.page ?? 1,
    limit: 25,
  };

  if (filters.q?.trim()) params.q = filters.q.trim();

  return params;
}
