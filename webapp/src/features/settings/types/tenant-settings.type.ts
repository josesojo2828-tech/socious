/**
 * Tenant settings contract (S4 of the webapp port / S1 of the backend).
 *
 * Mirrors `TenantSettings` in `serverapp/src/shared/constants/tenant-settings.ts`
 * exactly: the API normalizes the whole object on read, so every field is
 * always present in responses. Patches send only what changed.
 */

export type FulfillmentType = "PICKUP" | "DELIVERY" | "SHIPPING";

export type CoordinationMethod = "WHATSAPP" | "PHONE" | "EMAIL";

export type CurrencyVisibilityKey =
  | "showUSD"
  | "showVES"
  | "showUSDT"
  | "showBCV"
  | "showEUR";

export interface TenantSettings {
  /** `false` = the cash register is always active (no open/close shifts). */
  cash: { shiftControl: boolean };
  /** Display switches only; amounts are always stored in USD/VES/USDT. */
  currencies: Record<CurrencyVisibilityKey, boolean>;
  fulfillment: {
    enabledTypes: FulfillmentType[];
    coordination: CoordinationMethod;
  };
  shipping: { enabledAgencies: string[] };
  delivery: { enabled: boolean; feeUSD: number };
  routes: { enabled: boolean };
  /** Enabled return reasons (S5 of the sales overhaul). */
  returns: { reasons: string[] };
  /** Logic-only notification switches (CRM S2). */
  notifications: {
    lowStock: boolean;
    creditDue: boolean;
    orderReceived: boolean;
    saleCreated: boolean;
  };
  /** Default terms for credit sales (S3). */
  credit: {
    initialPaymentUSD: number | null;
    cadence: "QUINCENAL" | "MONTHLY" | "EVERY_N_DAYS" | "FREE";
    everyNDays: number;
    monthlyDay: number;
  };
  /**
   * Module keys of the active plan (entitlements). Básico lacks SHIPPING,
   * ROUTES, ORDERS and CATALOG_ONLINE — the settings screen hides the
   * sections those modules own instead of offering switches that only exist
   * in higher plans.
   */
  planModules?: string[];
}

/** A PATCH sends any subset of the sections; the backend merges the rest. */
export type TenantSettingsPatch = {
  [K in keyof TenantSettings]?: Partial<TenantSettings[K]>;
};

export const FULFILLMENT_TYPE_LABELS: Record<FulfillmentType, string> = {
  PICKUP: "Retiro en tienda",
  DELIVERY: "Delivery a domicilio",
  SHIPPING: "Envío por agencia",
};

export const COORDINATION_LABELS: Record<CoordinationMethod, string> = {
  WHATSAPP: "WhatsApp",
  PHONE: "Teléfono",
  EMAIL: "Correo",
};

export const CREDIT_CADENCE_LABELS: Record<
  "QUINCENAL" | "MONTHLY" | "EVERY_N_DAYS" | "FREE",
  string
> = {
  QUINCENAL: "Cada 15 días",
  MONTHLY: "Una vez al mes",
  EVERY_N_DAYS: "Cada X días",
  FREE: "Libre (por abonos)",
};

export const CURRENCY_LABELS: Record<CurrencyVisibilityKey, string> = {
  showUSD: "Dólar (USD)",
  showVES: "Bolívar (VES)",
  showUSDT: "USDT (Binance)",
  showBCV: "Tasa BCV",
  showEUR: "Euro (EUR)",
};
