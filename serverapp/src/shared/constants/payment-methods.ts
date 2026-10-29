/**
 * Canonical business payment methods for Socius ERP sales, purchases and cash
 * movements.
 *
 * This catalog is intentionally separate from the platform `PaymentMethod`
 * table (`modules/payment-method`), which models how a user pays their Socius
 * subscription (PayPal, crypto, Pago Móvil platform billing). These codes are
 * stored as a plain string in `SalePayment.paymentMethod`,
 * `PurchasePayment.paymentMethod` and `CashMovement.paymentMethod`.
 */

export const CURRENCY_CODES = ["USD", "VES", "USDT"] as const;

export type CurrencyCode = (typeof CURRENCY_CODES)[number];

export interface BusinessPaymentMethodOption {
  /** Machine value persisted in payment rows. */
  code: string;
  /** Neutral Spanish label rendered in the UI. */
  label: string;
  /** Currency the amount is captured in by default. */
  currency: CurrencyCode;
}

export const BUSINESS_PAYMENT_METHODS: readonly BusinessPaymentMethodOption[] =
  [
    { code: "CASH_USD", label: "Efectivo USD", currency: "USD" },
    { code: "CASH_VES", label: "Efectivo Bs", currency: "VES" },
    { code: "PAGO_MOVIL", label: "Pago Móvil", currency: "VES" },
    { code: "TRANSFER", label: "Transferencia bancaria", currency: "VES" },
    { code: "ZELLE", label: "Zelle", currency: "USD" },
    { code: "USDT_BINANCE", label: "USDT (Binance)", currency: "USDT" },
    { code: "CARD", label: "Punto de venta / Tarjeta", currency: "VES" },
    { code: "OTHER", label: "Otro", currency: "USD" },
  ] as const;

export const BUSINESS_PAYMENT_METHOD_CODES: readonly string[] =
  BUSINESS_PAYMENT_METHODS.map((method) => method.code);

export function isBusinessPaymentMethod(code: string): boolean {
  return BUSINESS_PAYMENT_METHOD_CODES.includes(code);
}

export function isSupportedCurrency(code: string): code is CurrencyCode {
  return (CURRENCY_CODES as readonly string[]).includes(code);
}
