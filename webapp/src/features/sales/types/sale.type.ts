export type PaymentStatus = "UNPAID" | "PARTIAL" | "PAID";

export type SaleStatus = "COMPLETED" | "CANCELLED";

export interface SaleItem {
  id: string;
  saleId: string;
  productId?: string | null;
  productName: string;
  quantity: string | number;
  unitPriceUSD: string | number;
  discountUSD: string | number;
  taxRate: string | number;
  totalUSD: string | number;
}

export interface SalePayment {
  id: string;
  saleId: string;
  amountOriginal: string | number;
  amountUSD: string | number;
  amountVES: string | number;
  currency: string;
  paymentMethod: string;
  rateBcv: string | number;
  rateUsdt: string | number;
  reference?: string | null;
  paidAt: string;
}

export interface Sale {
  id: string;
  saleNumber: string;
  clientId?: string | null;
  issueDate: string;
  dueDate?: string | null;
  rateBcv: string | number;
  rateUsdt: string | number;
  subtotalUSD: string | number;
  discountUSD: string | number;
  taxUSD: string | number;
  totalUSD: string | number;
  totalVES: string | number;
  totalUSDT: string | number;
  status: SaleStatus;
  paymentStatus: PaymentStatus;
  notes?: string | null;
  client?: { id: string; name: string } | null;
  items?: SaleItem[];
  payments?: SalePayment[];
}

export interface SalePaymentInput {
  amountOriginal: number;
  currency: "USD" | "VES" | "USDT";
  paymentMethod: string;
  paidAt?: string;
  reference?: string;
  notes?: string;
}

export interface SaleItemInput {
  productId?: string;
  productName: string;
  quantity: number;
  unitPriceUSD: number;
  discountUSD?: number;
  taxRate?: number;
}

export interface CreateSalePayload {
  items: SaleItemInput[];
  payments?: SalePaymentInput[];
  clientId?: string;
  cashShiftId?: string;
  discountUSD?: number;
  notes?: string;
}

export interface SaleReturn {
  id: string;
  returnNumber: string;
  saleId: string;
  issueDate: string;
  reason?: string | null;
  refundMethod?: string | null;
  totalUSD: string | number;
  items: {
    id: string;
    productName: string;
    quantity: string | number;
    totalUSD: string | number;
  }[];
}

export interface SalesReport {
  issued: {
    count: number;
    totalUSD: number;
    totalVES: number;
    totalUSDT: number;
  };
  accrualByMonth: { month: string; totalUSD: number; count: number }[];
  collectionsByMonth: { month: string; totalUSD: number; count: number }[];
  aging: {
    current: number;
    days1_30: number;
    days31_60: number;
    over60: number;
  };
  openItems: {
    id: string;
    saleNumber: string;
    issueDate: string;
    totalUSD: number;
    daysOverdue: number;
    client: { id: string; name: string } | null;
  }[];
}
