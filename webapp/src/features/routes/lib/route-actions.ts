import type { DeliveryRoute, RouteStatus } from "../types/delivery-route.type";

/**
 * Delivery route logic (S10): list params, payloads and the same transitions
 * the backend refuses otherwise.
 */

/** Mirrors ROUTE_TRANSITIONS in the backend DeliveryRouteService. */
const TRANSITIONS: Record<RouteStatus, RouteStatus[]> = {
  OPEN: ["IN_PROGRESS", "COMPLETED", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function allowedRouteTransitions(status: RouteStatus): RouteStatus[] {
  return TRANSITIONS[status] ?? [];
}

export const ROUTE_STATUS_LABELS: Record<RouteStatus, string> = {
  OPEN: "Abierta",
  IN_PROGRESS: "En curso",
  COMPLETED: "Cerrada",
  CANCELLED: "Cancelada",
};

export interface RouteFilters {
  page?: number;
  from?: string;
  to?: string;
  status?: string;
}

export function buildRouteListParams(
  filters: RouteFilters,
): Record<string, string | number> {
  const params: Record<string, string | number> = {
    page: filters.page ?? 1,
    limit: 10,
  };

  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  if (filters.status) params.status = filters.status;
  return params;
}

export function buildCreateRoutePayload(input: {
  date: string;
  name?: string;
  vehicle?: string;
  notes?: string;
  orderIds?: string[];
}): Record<string, unknown> {
  const payload: Record<string, unknown> = { date: input.date };
  const trimmed = (value?: string) => value?.trim() || undefined;

  const name = trimmed(input.name);
  const vehicle = trimmed(input.vehicle);
  const notes = trimmed(input.notes);

  if (name) payload.name = name;
  if (vehicle) payload.vehicle = vehicle;
  if (notes) payload.notes = notes;
  if (input.orderIds?.length) payload.orderIds = input.orderIds;

  return payload;
}

export function buildMarkItemPayload(
  status: "DELIVERED" | "FAILED",
  failureReason?: string,
): Record<string, string> {
  const reason = failureReason?.trim();
  if (status === "FAILED") {
    if (!reason) {
      throw new Error("Indica el motivo del fallo de entrega.");
    }
    return { status, failureReason: reason };
  }
  return { status };
}

/** "3 de 5 entregados" progress for the route list/detail. */
export function routeProgress(route: DeliveryRoute): {
  delivered: number;
  total: number;
  label: string;
  percent: number;
} {
  const delivered = route.progress?.delivered ?? 0;
  const total =
    route.progress?.total ?? route._count?.items ?? route.items?.length ?? 0;

  return {
    delivered,
    total,
    label: `${delivered} de ${total} entregados`,
    percent: total > 0 ? Math.round((delivered / total) * 100) : 0,
  };
}
