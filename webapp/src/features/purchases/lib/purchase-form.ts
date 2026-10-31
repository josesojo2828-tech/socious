import type {
  CreatePurchasePayload,
  PurchaseCurrency,
  PurchasePaymentStatus,
  PurchaseStatus,
} from "../types/purchase.type";

/**
 * Payment methods accepted by POST /api/purchases/:id/payments. Mirrors
 * `BUSINESS_PAYMENT_METHODS` in the backend; the currency follows the method
 * so the merchant never picks a mismatched pair.
 */
export const PURCHASE_PAYMENT_METHODS: readonly {
  code: string;
  label: string;
  currency: PurchaseCurrency;
}[] = [
  { code: "CASH_USD", label: "Efectivo USD", currency: "USD" },
  { code: "CASH_VES", label: "Efectivo Bs", currency: "VES" },
  { code: "PAGO_MOVIL", label: "Pago Móvil", currency: "VES" },
  { code: "TRANSFER", label: "Transferencia bancaria", currency: "VES" },
  { code: "ZELLE", label: "Zelle", currency: "USD" },
  { code: "USDT_BINANCE", label: "USDT (Binance)", currency: "USDT" },
  { code: "CARD", label: "Punto de venta / Tarjeta", currency: "VES" },
  { code: "OTHER", label: "Otro", currency: "USD" },
];

export const PURCHASE_STATUS_LABELS: Record<PurchaseStatus, string> = {
  PENDING: "Pendiente",
  RECEIVED: "Recibida",
  CANCELLED: "Cancelada",
};

export const PAYMENT_STATUS_LABELS: Record<PurchasePaymentStatus, string> = {
  UNPAID: "Sin pagar",
  PARTIAL: "Parcial",
  PAID: "Pagada",
};

/** One editable line of the create form; amounts arrive as strings. */
export interface PurchaseLineForm {
  productId?: string;
  productName: string;
  quantity: string;
  unitCostUSD: string;
}

export interface PurchaseForm {
  supplierId: string;
  issueDate: string;
  dueDate: string;
  notes: string;
  items: PurchaseLineForm[];
}

export function emptyPurchaseLine(): PurchaseLineForm {
  return { productName: "", quantity: "1", unitCostUSD: "" };
}

export function lineTotalUSD(line: PurchaseLineForm): number {
  const quantity = Number(line.quantity);
  const unitCost = Number(line.unitCostUSD);
  if (!Number.isFinite(quantity) || !Number.isFinite(unitCost)) return 0;
  return Math.round(quantity * unitCost * 100) / 100;
}

export function grandTotalUSD(items: PurchaseLineForm[]): number {
  const total = items.reduce((sum, line) => sum + lineTotalUSD(line), 0);
  return Math.round(total * 100) / 100;
}

/**
 * Validates the whole form. Returns the first problem as a user-facing
 * message, or null when the form can be sent.
 */
export function validatePurchaseForm(form: PurchaseForm): string | null {
  const filled = form.items.filter((line) => line.productName.trim());
  if (filled.length === 0) {
    return "Agregá al menos un artículo con nombre.";
  }
  for (const line of filled) {
    const quantity = Number(line.quantity);
    const unitCost = Number(line.unitCostUSD);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return `Cantidad inválida en "${line.productName.trim()}".`;
    }
    if (!Number.isFinite(unitCost) || unitCost < 0) {
      return `Costo inválido en "${line.productName.trim()}".`;
    }
  }
  if (form.dueDate && form.issueDate && form.dueDate < form.issueDate) {
    return "La fecha de pago no puede ser anterior a la fecha de emisión.";
  }
  return null;
}

/** Maps the form to the API body; blank optional fields are omitted. */
export function buildCreatePayload(form: PurchaseForm): CreatePurchasePayload {
  const items = form.items
    .filter((line) => line.productName.trim())
    .map((line) => ({
      ...(line.productId ? { productId: line.productId } : {}),
      productName: line.productName.trim(),
      quantity: Number(line.quantity),
      unitCostUSD: Number(line.unitCostUSD),
    }));

  return {
    ...(form.supplierId ? { supplierId: form.supplierId } : {}),
    ...(form.issueDate ? { issueDate: form.issueDate } : {}),
    ...(form.dueDate ? { dueDate: form.dueDate } : {}),
    ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
    items,
  };
}

export function paymentCurrencyForMethod(code: string): PurchaseCurrency {
  return (
    PURCHASE_PAYMENT_METHODS.find((method) => method.code === code)?.currency ??
    "USD"
  );
}
