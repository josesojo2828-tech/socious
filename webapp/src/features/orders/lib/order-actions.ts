import type { FulfillmentType, OrderStatus } from "../types/order.type";

/**
 * Order inbox logic (S9): the same state machine the backend enforces, plus
 * the list params and labels the table renders.
 */

/** Mirrors ROUTE_TRANSITIONS in the backend OrderService. */
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

export function allowedTransitions(status: OrderStatus): OrderStatus[] {
  return TRANSITIONS[status] ?? [];
}

export function canTransition(
  from: OrderStatus,
  to: OrderStatus,
): boolean {
  return allowedTransitions(from).includes(to);
}

export interface OrderFilters {
  page?: number;
  fulfillmentType?: string;
  agencyId?: string;
  /** `true` → only dispatched, `false` → only pending dispatch. */
  shipped?: boolean;
  from?: string;
  to?: string;
  status?: string;
}

/** Query params for GET /api/orders (omitted when empty). */
export function buildOrderListParams(
  filters: OrderFilters,
): Record<string, string | number> {
  const params: Record<string, string | number> = {
    page: filters.page ?? 1,
    limit: 10,
  };

  if (filters.fulfillmentType) params.fulfillmentType = filters.fulfillmentType;
  if (filters.agencyId) params.agencyId = filters.agencyId;
  if (filters.shipped !== undefined) params.shipped = String(filters.shipped);
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  if (filters.status) params.status = filters.status;

  return params;
}

/** PICKUP never goes out for dispatch (the backend refuses it too). */
export function needsShipping(order: {
  fulfillmentType: FulfillmentType;
}): boolean {
  return order.fulfillmentType !== "PICKUP";
}

export function buildShipPayload(
  trackingNumber?: string,
  shippedAt?: string,
): Record<string, string> {
  const payload: Record<string, string> = {};
  const tracking = trackingNumber?.trim();
  if (tracking) payload.trackingNumber = tracking;
  if (shippedAt) payload.shippedAt = `${shippedAt}T12:00:00.000Z`;
  return payload;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmado",
  PREPARING: "En preparación",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};

export const FULFILLMENT_LABELS: Record<FulfillmentType, string> = {
  PICKUP: "Retiro",
  DELIVERY: "Delivery",
  SHIPPING: "Envío",
};
