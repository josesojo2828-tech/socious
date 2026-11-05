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
    /** Default initial as a percent (check options 0/10/20/30/50). */
    initialPercent: number;
    cadence: "QUINCENAL" | "MONTHLY" | "EVERY_N_DAYS" | "FREE";
    everyNDays: number;
    monthlyDay: number;
  };
  /** Built-ins the merchant turned off (S3). */
  payments: { disabledCodes: string[] };
  /**
   * Purchase-screen switches (S14 #2): `onlySupplierProducts` filters the
   * catalog on /dashboard/compras/nuevo to the selected supplier's products.
   * `false` (default) = mostrar todos los productos.
   */
  purchases: { onlySupplierProducts: boolean };
  /**
   * Optional catalog features: `useRawMaterials` shows the Materials screen and
   * the BOM section; `useServices` shows the Services screen.
   */
  inventory: { useRawMaterials: boolean; useServices: boolean };
  /** Public storefront contact: digits with country code. */
  storefront: { whatsapp: string };
  /**
   * Module keys of the active plan (entitlements). Básico lacks SHIPPING,
   * ROUTES, ORDERS and CATALOG_ONLINE — the settings screen hides the
   * sections those modules own instead of offering switches that only exist
   * in higher plans.
   */
  planModules?: string[];
  /** Manual org grants (e.g. BRANCHES) — admin-assigned, flag-independent. */
  manualGrants?: string[];
  /**
   * Per-plan image slots (S8), server-computed from the subscription because
   * modules cannot tell Avanzado from Premium: Básico 1/1 · Avanzado 3/2 ·
   * Premium 5/3 (product/variant). Absent when the settings read fails.
   */
  imageLimits?: { product: number; variant: number };
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
