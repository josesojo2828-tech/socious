/** Purchase lifecycle (PENDING → RECEIVED | CANCELLED). */
export type PurchaseStatus = "PENDING" | "RECEIVED" | "CANCELLED";

/** Payment lifecycle of a purchase (UNPAID → PARTIAL → PAID). */
export type PurchasePaymentStatus = "UNPAID" | "PARTIAL" | "PAID";

export type PurchaseCurrency = "USD" | "VES" | "USDT";

export interface PurchaseItem {
  id: string;
  productId: string | null;
  productName: string;
  quantity: string | number;
  unitCostUSD: string | number;
  totalUSD: string | number;
}

export interface PurchasePayment {
  id: string;
  amountOriginal: string | number;
  amountUSD: string | number;
  currency: string;
  paymentMethod: string;
  reference: string | null;
  paidAt: string;
  notes: string | null;
}

export interface Purchase {
  id: string;
  purchaseNumber: string;
  issueDate: string;
  dueDate: string | null;
  totalUSD: string | number;
  status: PurchaseStatus;
  paymentStatus: PurchasePaymentStatus;
  notes: string | null;
  /** Attached invoice (photo/PDF) MinIO key — private, S14 #5. */
  invoiceKey?: string | null;
  supplier: { id: string; name: string } | null;
  items: PurchaseItem[];
  payments: PurchasePayment[];
}

/** Body POST /api/purchases — numbers, ISO dates, at least one item. */
export interface CreatePurchasePayload {
  supplierId?: string;
  issueDate?: string;
  dueDate?: string;
  notes?: string;
  /** Attached invoice MinIO key (upload prefix `purchase`, optional). */
  invoiceKey?: string;
  items: {
    productId?: string;
    productName: string;
    quantity: number;
    unitCostUSD: number;
  }[];
}

/** Body POST /api/purchases/:id/payments. */
export interface AddPurchasePaymentPayload {
  amountOriginal: number;
  currency: PurchaseCurrency;
  paymentMethod: string;
  paidAt?: string;
  reference?: string;
  notes?: string;
}

/** Shapes the purchase list and payables report return (S8). */
export interface PurchasesReport {
  issued: {
    count: number;
    totalUSD: number;
    totalVES: number;
    totalUSDT: number;
  };
  accrualByMonth: { month: string; totalUSD: number; count: number }[];
  paymentsByMonth: { month: string; totalUSD: number; count: number }[];
  aging: {
    current: number;
    days1_30: number;
    days31_60: number;
    over60: number;
  };
  openItems: {
    id: string;
    purchaseNumber: string;
    issueDate: string;
    totalUSD: number;
    daysOverdue: number;
    supplier: { id: string; name: string } | null;
  }[];
}
