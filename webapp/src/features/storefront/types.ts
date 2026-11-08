export type StorefrontOrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "DELIVERED"
  | "CANCELLED";

export type StorefrontFulfillment = "PICKUP" | "DELIVERY" | "SHIPPING";

export interface StorefrontMetricsBucket {
  orders: number;
  revenueUSD: number;
}

export interface StorefrontMetrics {
  from: string | null;
  to: string | null;
  totals: StorefrontMetricsBucket & { avgTicketUSD: number };
  byStatus: Record<StorefrontOrderStatus, StorefrontMetricsBucket>;
  byFulfillment: Record<StorefrontFulfillment, number>;
  topProducts: { productName: string; quantity: number; revenueUSD: number }[];
  daily: ({ date: string } & StorefrontMetricsBucket)[];
  publishedProducts: number;
}

export const STOREFRONT_STATUS_LABELS: Record<StorefrontOrderStatus, string> = {
  PENDING: "Pendientes",
  CONFIRMED: "Confirmados",
  PREPARING: "Preparando",
  DELIVERED: "Entregados",
  CANCELLED: "Cancelados",
};

export const STOREFRONT_FULFILLMENT_LABELS: Record<StorefrontFulfillment, string> = {
  PICKUP: "Retiro en tienda",
  DELIVERY: "Delivery",
  SHIPPING: "Envío por agencia",
};
