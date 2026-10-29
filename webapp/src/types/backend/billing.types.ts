/**
 * Monthly billing history types — mirror of the backend
 * `GET /api/billing/invoices` response (`BillingController` + `InvoiceService`).
 *
 * Prisma `Decimal` fields serialize to strings over JSON, so money values are
 * typed as `number | string` and must be coerced with `Number(...)`.
 */

export type InvoiceStatus =
  | 'DRAFT'
  | 'ISSUED'
  | 'PAID'
  | 'VOID'
  | 'FAILED';

export type InvoiceLineType = 'BASE_PLAN' | 'SEAT' | 'ADDON';

export interface InvoiceLine {
  id: string;
  invoiceId: string;
  type: InvoiceLineType;
  refId?: string | null;
  description: string;
  quantity: number;
  unitPrice: number | string;
  amount: number | string;
  addOnId?: string | null;
}

export interface Invoice {
  id: string;
  organizationId: string;
  periodStart: string;
  periodEnd: string;
  status: InvoiceStatus;
  subtotal: number | string;
  total: number | string;
  currency: string;
  dueDate: string;
  issuedAt?: string | null;
  paidAt?: string | null;
  payerUserId?: string | null;
  lines: InvoiceLine[];
}

export interface BillingHistoryResult {
  list: Invoice[];
  total: number;
  totalRecords: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  hasPrev: boolean;
  hasNext: boolean;
}
