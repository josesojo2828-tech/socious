export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "DELIVERED"
  | "CANCELLED";

export type FulfillmentType = "PICKUP" | "DELIVERY" | "SHIPPING";

export interface OrderAgency {
  id: string;
  key: string;
  name: string;
}

export interface OrderItem {
  id: string;
  productId?: string | null;
  productName: string;
  quantity: string | number;
  priceUSD: string | number;
  totalUSD: string | number;
}

export interface Order {
  id: string;
  orderNumber: string;
  clientId?: string | null;
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  customerAddress?: string | null;
  rateBcv: string | number;
  rateUsdt: string | number;
  totalUSD: string | number;
  totalVES: string | number;
  totalUSDT: string | number;
  status: OrderStatus;
  fulfillmentType: FulfillmentType;
  agencyId?: string | null;
  coordination: string;
  deliveryFeeUSD?: string | number | null;
  trackingNumber?: string | null;
  shippedAt?: string | null;
  saleId?: string | null;
  notes?: string | null;
  createdAt: string;
  client?: { id: string; name: string } | null;
  agency?: OrderAgency | null;
  items?: OrderItem[];
  sale?: { id: string; saleNumber: string; paymentStatus: string } | null;
}
