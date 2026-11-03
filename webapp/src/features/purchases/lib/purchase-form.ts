import { convertFromUSD } from "@/features/products/lib/price-currency";
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

/**
 * How the merchant settles the purchase at create time (S3). PENDING keeps
 * the historical behaviour (no payments booked with the document).
 */
export type PurchasePaymentMode = "PENDING" | "PAID" | "PARTIAL" | "CREDIT";

/** Narrow alias for draft payloads (same domain, optional on old rows). */
export type PurchaseDraftPaymentMode = PurchasePaymentMode;

export const PURCHASE_PAYMENT_MODE_LABELS: Record<
  PurchasePaymentMode,
  string
> = {
  PENDING: "Pendiente",
  PAID: "Pagada",
  PARTIAL: "Con inicial",
  CREDIT: "A crédito",
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
  /** MinIO key of the attached invoice photo/PDF (optional, S14 #5). */
  invoiceKey?: string;
  items: PurchaseLineForm[];
  /** Settlement mode booked with the document (S3). */
  paymentMode: PurchasePaymentMode;
  /** Method code for PAID / PARTIAL (`PURCHASE_PAYMENT_METHODS`). */
  paymentMethod: string;
  /** Initial amount in the METHOD's currency (PARTIAL only). */
  initialAmount: string;
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

/** Detailed resumen of the create screen (S14 #6), over the SENT lines. */
export interface PurchaseSummary {
  /** Lines with a name — the ones that reach the payload. */
  articleCount: number;
  /** Sum of the quantities of those lines (blank/unparsable = 0). */
  units: number;
  /** Sum of the line totals, rounded to cents. */
  subtotalUSD: number;
  /** Document total — the same value the API books (no taxes on entry). */
  totalUSD: number;
}

/** Pure math for the resumen card: artículos · unidades · subtotal · total. */
export function purchaseSummary(items: PurchaseLineForm[]): PurchaseSummary {
  const filled = items.filter((line) => line.productName.trim());
  const units = filled.reduce((sum, line) => {
    const quantity = Number(line.quantity);
    return sum + (Number.isFinite(quantity) && quantity > 0 ? quantity : 0);
  }, 0);

  const subtotalUSD = grandTotalUSD(filled);
  return {
    articleCount: filled.length,
    units: Math.round(units * 100) / 100,
    subtotalUSD,
    // The total is what the API books: the same sent lines (no taxes here).
    totalUSD: subtotalUSD,
  };
}

/** One per-currency equivalent shown under the total (S14 #7). */
export interface PurchaseEquivalent {
  currency: "VES" | "USDT";
  amount: number;
}

/**
 * ≈ equivalents of a USD amount at today's rates, gated by the currency
 * visibility checks. Conversion is the shared POS rule via `price-currency`
 * (VES = USD × BCV · USDT = USD × BCV / rateUsdt); without rates there is
 * nothing honest to show.
 */
export function purchaseCurrencyEquivalents(
  totalUSD: number,
  rates: { rateBcv: number; rateUsdt: number } | null,
  visibility: { showVES: boolean; showUSDT: boolean },
): PurchaseEquivalent[] {
  if (!rates) return [];
  const equivalents: PurchaseEquivalent[] = [];
  if (visibility.showVES) {
    equivalents.push({
      currency: "VES",
      amount: convertFromUSD(totalUSD, "VES", rates),
    });
  }
  if (visibility.showUSDT) {
    equivalents.push({
      currency: "USDT",
      amount: convertFromUSD(totalUSD, "USDT", rates),
    });
  }
  return equivalents;
}

/**
 * Validates the whole form. Returns the first problem as a user-facing
 * message, or null when the form can be sent.
 *
 * @param rates today's snapshot — required to book PAID/PARTIAL in a
 *   non-USD method currency (the document total lives in USD).
 */
export function validatePurchaseForm(
  form: PurchaseForm,
  rates: { rateBcv: number; rateUsdt: number } | null = null,
): string | null {
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

  // --- Settlement mode (S3) ---
  if (form.paymentMode === "PAID") {
    if (!form.paymentMethod) {
      return "Elegí un método de pago para marcar la compra como pagada.";
    }
    const currency = paymentCurrencyForMethod(form.paymentMethod);
    if (currency !== "USD" && !rates) {
      return "Necesitás la tasa de hoy para marcar Pagada en esa moneda.";
    }
  }

  if (form.paymentMode === "PARTIAL") {
    const initial = Number(form.initialAmount);
    if (!form.paymentMethod) {
      return "Elegí un método de pago para el inicial.";
    }
    if (!Number.isFinite(initial) || initial <= 0) {
      return "Ingresá un monto de inicial mayor que cero.";
    }
    const totalUSD = grandTotalUSD(filled);
    const initialUSD = initialAmountToUSD(
      initial,
      paymentCurrencyForMethod(form.paymentMethod),
      rates,
    );
    if (initialUSD !== null && initialUSD >= totalUSD) {
      return "El inicial no puede cubrir el total: usá Pagada.";
    }
  }

  if (form.paymentMode === "CREDIT") {
    if (!form.dueDate) {
      return "Marcá la fecha de pago para la compra a crédito.";
    }
    if (form.issueDate && form.dueDate < form.issueDate) {
      return "La fecha de pago no puede ser anterior a la fecha de emisión.";
    }
  }

  return null;
}

/**
 * Converts an amount expressed in `currency` into USD using today's rates.
 * USD is identity (rates not needed). Answers null when rates are missing
 * for a non-USD currency — the caller surfaces a user-facing message.
 */
export function initialAmountToUSD(
  amount: number,
  currency: PurchaseCurrency,
  rates: { rateBcv: number; rateUsdt: number } | null,
): number | null {
  if (!Number.isFinite(amount)) return null;
  if (currency === "USD") return amount;
  if (!rates || !(rates.rateBcv > 0)) return null;
  if (currency === "VES") return amount / rates.rateBcv;
  // USDT: VES = USDT × rateUsdt; USD = VES / rateBcv
  if (!(rates.rateUsdt > 0)) return null;
  return (amount * rates.rateUsdt) / rates.rateBcv;
}

/**
 * The `amountOriginal` (method currency) that settles the whole USD total.
 * Answers null when a non-USD conversion is impossible (no rates).
 */
export function totalToMethodAmount(
  totalUSD: number,
  currency: PurchaseCurrency,
  rates: { rateBcv: number; rateUsdt: number } | null,
): number | null {
  if (!Number.isFinite(totalUSD)) return null;
  if (currency === "USD") return Math.round(totalUSD * 100) / 100;
  if (!rates || !(rates.rateBcv > 0)) return null;
  if (currency === "VES") {
    return Math.round(totalUSD * rates.rateBcv * 100) / 100;
  }
  if (!(rates.rateUsdt > 0)) return null;
  return Math.round(((totalUSD * rates.rateBcv) / rates.rateUsdt) * 100) / 100;
}

/**
 * Maps the form to the API body; blank optional fields are omitted.
 * `payments` is included only for PAID/PARTIAL and never as an empty array.
 *
 * @param rates today's snapshot — needed to express PAID in a non-USD method.
 */
export function buildCreatePayload(
  form: PurchaseForm,
  rates: { rateBcv: number; rateUsdt: number } | null = null,
): CreatePurchasePayload {
  const filled = form.items.filter((line) => line.productName.trim());
  const totalUSD = grandTotalUSD(filled);
  const items = filled.map((line) => ({
    ...(line.productId ? { productId: line.productId } : {}),
    productName: line.productName.trim(),
    quantity: Number(line.quantity),
    unitCostUSD: Number(line.unitCostUSD),
  }));

  const payload: CreatePurchasePayload = {
    ...(form.supplierId ? { supplierId: form.supplierId } : {}),
    ...(form.issueDate ? { issueDate: form.issueDate } : {}),
    // Due date only exists for the credit-flavoured modes (S3): PENDING and
    // PAID never book one, matching the UI which hides the field.
    ...((form.paymentMode === "CREDIT" || form.paymentMode === "PARTIAL") &&
    form.dueDate
      ? { dueDate: form.dueDate }
      : {}),
    ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
    ...(form.invoiceKey ? { invoiceKey: form.invoiceKey } : {}),
    items,
  };

  if (form.paymentMode === "PAID" && form.paymentMethod) {
    const currency = paymentCurrencyForMethod(form.paymentMethod);
    const amountOriginal = totalToMethodAmount(totalUSD, currency, rates);
    if (amountOriginal !== null && amountOriginal > 0) {
      payload.payments = [
        {
          amountOriginal,
          currency,
          paymentMethod: form.paymentMethod,
        },
      ];
    }
  } else if (form.paymentMode === "PARTIAL" && form.paymentMethod) {
    const initial = Number(form.initialAmount);
    if (Number.isFinite(initial) && initial > 0) {
      payload.payments = [
        {
          amountOriginal: Math.round(initial * 100) / 100,
          currency: paymentCurrencyForMethod(form.paymentMethod),
          paymentMethod: form.paymentMethod,
        },
      ];
    }
  }

  return payload;
}

export function paymentCurrencyForMethod(code: string): PurchaseCurrency {
  return (
    PURCHASE_PAYMENT_METHODS.find((method) => method.code === code)?.currency ??
    "USD"
  );
}
