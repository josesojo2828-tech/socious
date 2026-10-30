export type RouteStatus = "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export type RouteItemStatus = "PENDING" | "DELIVERED" | "FAILED";

export interface RouteOrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  customerName: string;
  customerPhone?: string | null;
  customerAddress?: string | null;
  fulfillmentType: string;
  shippedAt?: string | null;
  trackingNumber?: string | null;
  agency?: { id: string; key: string; name: string } | null;
}

export interface DeliveryRouteItem {
  id: string;
  routeId: string;
  orderId: string;
  sortOrder: number;
  status: RouteItemStatus;
  deliveredAt?: string | null;
  failureReason?: string | null;
  order: RouteOrderSummary;
}

export interface DeliveryRoute {
  id: string;
  routeNumber: string;
  date: string;
  name?: string | null;
  vehicle?: string | null;
  status: RouteStatus;
  notes?: string | null;
  createdAt: string;
  createdBy?: { id: string; fullName?: string | null; email: string } | null;
  items?: DeliveryRouteItem[];
  /** Present on the list endpoint. */
  progress?: { total: number; delivered: number; pending: number; failed: number };
  _count?: { items: number };
}
