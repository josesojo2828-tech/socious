import type { FulfillmentType } from "../../orders/types/order.type";

export interface CheckoutConfig {
  fulfillmentTypes: FulfillmentType[];
  coordination: string;
  delivery: { enabled: boolean; feeUSD: number };
  agencies: { id: string; key: string; name: string }[];
}

/** Shape GET /api/products/public returns per item (money as strings). */
export interface PublicProduct {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  salePriceUSD: string | number;
  wholesalePriceUSD?: string | number | null;
  unit: string;
  taxRate: string | number;
  imageUrl?: string | null;
  /** Uploaded catalog photos (ProductImage); the first one wins. */
  images?: { key: string }[];
  stock: string | number;
  categoryId?: string | null;
}

export interface CheckoutForm {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerAddress?: string;
  fulfillmentType: FulfillmentType;
  agencyId?: string;
  notes?: string;
}

export interface OrderCreatedResponse {
  id: string;
  orderNumber: string;
  status: string;
  totalUSD: string | number;
}
