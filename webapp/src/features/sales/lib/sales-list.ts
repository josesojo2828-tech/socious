import type { SalesReport, SaleItem, Sale } from "../types/sale.type";

/**
 * Pure helpers for the sales screen (S6): list params, report labels and the
 * return math the backend also enforces server-side (S13).
 */

export interface SalesFilters {
  q?: string;
  paymentStatus?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: number;
}

/** Query string params for GET /api/sales (empty values are omitted). */
export function buildListParams(filters: SalesFilters): Record<string, string | number> {
  const params: Record<string, string | number> = {
    page: filters.page ?? 1,
    limit: 10,
  };

  if (filters.q?.trim()) params.q = filters.q.trim();
  if (filters.paymentStatus) params.paymentStatus = filters.paymentStatus;
  if (filters.status) params.status = filters.status;
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;

  return params;
}

/** `2026-01` → `enero de 2026` (stable labels for the two report columns). */
export function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const parsed = Number(month);
  if (!year || !Number.isFinite(parsed) || parsed < 1 || parsed > 12) {
    return monthKey;
  }

  const date = new Date(Number(year), parsed - 1, 1);
  const label = new Intl.DateTimeFormat("es-VE", { month: "long" }).format(date);
  return `${label} de ${year}`;
}

export function agingTotal(aging: SalesReport["aging"]): number {
  const sum = Math.round(
    (aging.current + aging.days1_30 + aging.days31_60 + aging.over60) * 100,
  );
  return sum / 100;
}

/**
 * Units of a sale line still up for return (S13): sold minus what previous
 * returns already took. The backend refuses anything above this too.
 */
export function returnableQuantity(
  line: SaleItem,
  returnedBySaleItem: Record<string, number>,
): number {
  const sold = Number(line.quantity);
  const returned = Number(returnedBySaleItem[line.id] ?? 0);
  const remaining =
    (Number.isFinite(sold) ? sold : 0) - (Number.isFinite(returned) ? returned : 0);
  return Math.max(0, Math.round(remaining * 100) / 100);
}

export interface ReturnSelection {
  saleItemId: string;
  quantity: number;
}

/** Body for POST /api/sales/:id/returns — only positive quantities. */
export function buildReturnPayload(selections: ReturnSelection[], reason?: string) {
  const items = selections
    .filter((item) => Number.isFinite(item.quantity) && item.quantity > 0)
    .map((item) => ({
      saleItemId: item.saleItemId,
      quantity: item.quantity,
    }));

  return {
    items,
    ...(reason?.trim() ? { reason: reason.trim() } : {}),
  };
}

export function paymentStatusLabel(
  status: Sale["paymentStatus"],
): { text: string; className: string } {
  switch (status) {
    case "PAID":
      return { text: "Pagada", className: "text-emerald-600" };
    case "PARTIAL":
      return { text: "Parcial", className: "text-amber-600" };
    default:
      return { text: "Impaga", className: "text-red-600" };
  }
}
