/**
 * Tenant settings catalog (S1, S3, S4, S6, S8).
 *
 * One JSON column (`Organization.settings`) holds every operational check the
 * merchant flips from the settings screen. This module is the single source of
 * truth for its shape:
 *
 *  - `DEFAULT_TENANT_SETTINGS` — what a brand-new (or never-configured)
 *    organization gets. Reading is total: `normalizeTenantSettings()` accepts
 *    any JSON and never throws, so a corrupted or partially-written column can
 *    never make the API unreadable.
 *  - Writing goes through `TenantSettingsService`, which validates the explicit
 *    patch (it CAN reject) before merging, so typos never persist silently.
 *
 * These checks gate *presentation and endpoints only*. Document storage never
 * changes with them: amounts are always persisted in USD/VES/USDT (S1 of the
 * previous phase), a sale is always a sale.
 */

export const FULFILLMENT_TYPES = ["PICKUP", "DELIVERY", "SHIPPING"] as const;
export type FulfillmentType = (typeof FULFILLMENT_TYPES)[number];

/** How the store coordinates the shipment with the customer. */
export const COORDINATION_METHODS = ["WHATSAPP", "PHONE", "EMAIL"] as const;
export type CoordinationMethod = (typeof COORDINATION_METHODS)[number];

/** Visibility switches: display-only, never a storage decision. */
export const CURRENCY_VISIBILITY_KEYS = [
  "showUSD",
  "showVES",
  "showUSDT",
  "showBCV",
  "showEUR",
] as const;
export type CurrencyVisibilityKey = (typeof CURRENCY_VISIBILITY_KEYS)[number];

export interface TenantSettings {
  /** `false` = cash always active: sales open no shift, closing is optional. */
  cash: { shiftControl: boolean };
  /** Which quotes/amounts the UI shows (storage is unaffected). */
  currencies: Record<CurrencyVisibilityKey, boolean>;
  /** Fulfillment types offered at checkout. */
  fulfillment: {
    enabledTypes: FulfillmentType[];
    coordination: CoordinationMethod;
  };
  /** Enabled shipping agencies (keys of the seeded global catalog). */
  shipping: { enabledAgencies: string[] };
  /** Delivery as a pickup option, with the fee frozen per order. */
  delivery: { enabled: boolean; feeUSD: number };
  /** Turns on the "Rutas" entry point in the sidebar (S8). */
  routes: { enabled: boolean };
  /** Enabled return reasons shown as a select on the returns flow (S5). */
  returns: { reasons: string[] };
  /** Payment-method switches (S3): built-ins the merchant turned off. */
  payments: { disabledCodes: string[] };
  /**
   * Purchase-screen switches (S14 #2): `onlySupplierProducts` filters the
   * catalog the /dashboard/compras/nuevo screen offers for a supplier.
   */
  purchases: {
    /**
     * `false` (default) = mostrar todos los productos; `true` = solo los del
     * proveedor seleccionado. Display-only: the invoice keeps whatever the
     * merchant registered.
     */
    onlySupplierProducts: boolean;
  };
  inventory: {
    /**
     * `false` (default) = catálogo simple, sin componentes visibles;
     * `true` = productos compuestos (BOM): la sección de materia prima
     * aparece en el form, la pantalla Materiales existe y las ventas
     * descuentan los insumos (S1/S2).
     */
    useRawMaterials: boolean;
    /**
     * `false` (default) = el negocio no vende servicios: la pantalla
     * Servicios y su entrada del sidebar quedan ocultas.
     */
    useServices: boolean;
  };
  /** Logic-only notification switches (CRM S2); nothing is sent yet. */
  notifications: {
    lowStock: boolean;
    creditDue: boolean;
    orderReceived: boolean;
    saleCreated: boolean;
  };
  /** Default terms for credit sales (S3). */
  credit: {
    /** Legacy amount hint in USD; the POS now prefills from initialPercent. */
    initialPaymentUSD: number | null;
    /** Default initial as a percent of the total (checks: 0/10/20/30/50). */
    initialPercent: number;
    cadence: CreditCadence;
    everyNDays: number;
    monthlyDay: number;
  };
}

/**
 * What a PATCH may contain: every section is optional, and inside it every
 * field is optional too. Sections absent from the patch are left untouched.
 */
export type TenantSettingsPatch = {
  [K in keyof TenantSettings]?: Partial<TenantSettings[K]>;
};

export const DEFAULT_TENANT_SETTINGS: TenantSettings = {
  cash: { shiftControl: true },
  currencies: {
    showUSD: true,
    showVES: true,
    showUSDT: true,
    showBCV: true,
    showEUR: false,
  },
  fulfillment: {
    enabledTypes: ["PICKUP", "DELIVERY", "SHIPPING"],
    coordination: "WHATSAPP",
  },
  shipping: { enabledAgencies: ["ZOOM", "MRW"] },
  delivery: { enabled: true, feeUSD: 0 },
  routes: { enabled: false },
  returns: {
    reasons: [
      "Solo lo estaba probando",
      "Producto defectuoso",
      "Talla o medida equivocada",
      "Se arrepintió de la compra",
    ],
  },
  credit: {
    initialPaymentUSD: null,
    initialPercent: 0,
    cadence: "QUINCENAL",
    everyNDays: 15,
    monthlyDay: 1,
  },
  payments: { disabledCodes: [] },
  purchases: { onlySupplierProducts: false },
  inventory: { useRawMaterials: false, useServices: false },
  notifications: {
    lowStock: true,
    creditDue: true,
    orderReceived: true,
    saleCreated: false,
  },
};

/** Agency keys are `ZOOM`, `MRW`, `DOMEZ`... upper-case, no spaces. */
export const AGENCY_KEY_PATTERN = /^[A-Z0-9_]{1,40}$/;

export function isFulfillmentType(value: unknown): value is FulfillmentType {
  return (FULFILLMENT_TYPES as readonly string[]).includes(value as string);
}

export function isCoordinationMethod(
  value: unknown,
): value is CoordinationMethod {
  return (COORDINATION_METHODS as readonly string[]).includes(value as string);
}

/** How a credit sale is collected (S3 of the sales overhaul). */
export type CreditCadence =
  | "QUINCENAL"
  | "MONTHLY"
  | "EVERY_N_DAYS"
  | "FREE";

export const CREDIT_CADENCES: readonly CreditCadence[] = [
  "QUINCENAL",
  "MONTHLY",
  "EVERY_N_DAYS",
  "FREE",
];

export function isCreditCadence(value: unknown): value is CreditCadence {
  return (CREDIT_CADENCES as readonly string[]).includes(value as string);
}

const asReasonList = (value: unknown, fallback: string[]): string[] => {
  if (!Array.isArray(value)) return fallback;
  const reasons = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && item.length <= 160);
  return [...new Set(reasons)];
};

const asNullableFee = (
  value: unknown,
  fallback: number | null,
): number | null => {
  if (value === null) return null;
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.round(value * 100) / 100;
  }
  return fallback;
};

const asCredit = (
  value: Record<string, unknown>,
  defaults: TenantSettings["credit"],
): TenantSettings["credit"] => {
  const everyNDays =
    typeof value.everyNDays === "number" && value.everyNDays >= 1
      ? Math.min(Math.floor(value.everyNDays), 365)
      : defaults.everyNDays;
  const monthlyDay =
    typeof value.monthlyDay === "number" && value.monthlyDay >= 1
      ? Math.min(Math.floor(value.monthlyDay), 28)
      : defaults.monthlyDay;
  const rawPercent = value.initialPercent;
  const initialPercent =
    typeof rawPercent === "number" && Number.isFinite(rawPercent)
      ? Math.min(100, Math.max(0, Math.round(rawPercent)))
      : defaults.initialPercent;
  return {
    initialPaymentUSD: asNullableFee(
      value.initialPaymentUSD,
      defaults.initialPaymentUSD,
    ),
    initialPercent,
    cadence: isCreditCadence(value.cadence) ? value.cadence : defaults.cadence,
    everyNDays,
    monthlyDay,
  };
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asBool = (value: unknown, fallback: boolean): boolean =>
  typeof value === "boolean" ? value : fallback;

/** Fees are money: finite, non-negative, two decimals. */
const asFee = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.round(value * 100) / 100
    : fallback;

const asTypeList = (
  value: unknown,
  fallback: FulfillmentType[],
): FulfillmentType[] => {
  if (!Array.isArray(value)) return fallback;
  // An explicitly empty list is a legal choice: the merchant turned every
  // type off and coordinates pickups manually (e.g. over WhatsApp). Only a
  // missing or corrupt value falls back to the defaults.
  return [...new Set(value.filter(isFulfillmentType))];
};

const asAgencyList = (
  value: unknown,
  fallback: string[],
): string[] => {
  if (!Array.isArray(value)) return fallback;
  const keys = value.filter(
    (item): item is string =>
      typeof item === "string" && AGENCY_KEY_PATTERN.test(item),
  );
  return [...new Set(keys)];
};

/**
 * Total read path: any JSON (including `null`, `[]` or garbage) is coerced to
 * a complete settings object, falling back to defaults field by field.
 */
export function normalizeTenantSettings(raw: unknown): TenantSettings {
  const source = isPlainObject(raw) ? raw : {};
  const cash = isPlainObject(source.cash) ? source.cash : {};
  const currencies = isPlainObject(source.currencies) ? source.currencies : {};
  const fulfillment = isPlainObject(source.fulfillment)
    ? source.fulfillment
    : {};
  const shipping = isPlainObject(source.shipping) ? source.shipping : {};
  const delivery = isPlainObject(source.delivery) ? source.delivery : {};
  const routes = isPlainObject(source.routes) ? source.routes : {};
  const returns = isPlainObject(source.returns) ? source.returns : {};
  const credit = isPlainObject(source.credit) ? source.credit : {};
  const notifications = isPlainObject(source.notifications)
    ? source.notifications
    : {};
  const payments = isPlainObject(source.payments) ? source.payments : {};
  const purchases = isPlainObject(source.purchases) ? source.purchases : {};
  const inventory = isPlainObject(source.inventory) ? source.inventory : {};

  const defaults = DEFAULT_TENANT_SETTINGS;

  return {
    cash: {
      shiftControl: asBool(cash.shiftControl, defaults.cash.shiftControl),
    },
    currencies: {
      showUSD: asBool(currencies.showUSD, defaults.currencies.showUSD),
      showVES: asBool(currencies.showVES, defaults.currencies.showVES),
      showUSDT: asBool(currencies.showUSDT, defaults.currencies.showUSDT),
      showBCV: asBool(currencies.showBCV, defaults.currencies.showBCV),
      showEUR: asBool(currencies.showEUR, defaults.currencies.showEUR),
    },
    fulfillment: {
      enabledTypes: asTypeList(
        fulfillment.enabledTypes,
        defaults.fulfillment.enabledTypes,
      ),
      coordination: isCoordinationMethod(fulfillment.coordination)
        ? fulfillment.coordination
        : defaults.fulfillment.coordination,
    },
    shipping: {
      enabledAgencies: asAgencyList(
        shipping.enabledAgencies,
        defaults.shipping.enabledAgencies,
      ),
    },
    delivery: {
      enabled: asBool(delivery.enabled, defaults.delivery.enabled),
      feeUSD: asFee(delivery.feeUSD, defaults.delivery.feeUSD),
    },
    routes: {
      enabled: asBool(routes.enabled, defaults.routes.enabled),
    },
    returns: {
      reasons: asReasonList(returns.reasons, defaults.returns.reasons),
    },
    credit: asCredit(credit, defaults.credit),
    payments: {
      disabledCodes: Array.isArray(payments.disabledCodes)
        ? [...new Set(payments.disabledCodes.filter((c: unknown) => typeof c === "string"))]
        : defaults.payments.disabledCodes,
    },
    purchases: {
      onlySupplierProducts: asBool(
        purchases.onlySupplierProducts,
        defaults.purchases.onlySupplierProducts,
      ),
    },
    inventory: {
      useRawMaterials: asBool(
        inventory.useRawMaterials,
        defaults.inventory.useRawMaterials,
      ),
      useServices: asBool(
        inventory.useServices,
        defaults.inventory.useServices,
      ),
    },
    notifications: {
      lowStock: asBool(notifications.lowStock, defaults.notifications.lowStock),
      creditDue: asBool(notifications.creditDue, defaults.notifications.creditDue),
      orderReceived: asBool(
        notifications.orderReceived,
        defaults.notifications.orderReceived,
      ),
      saleCreated: asBool(
        notifications.saleCreated,
        defaults.notifications.saleCreated,
      ),
    },
  };
}

/** Deep clone so callers can never mutate the shared default object. */
export function cloneDefaultSettings(): TenantSettings {
  return normalizeTenantSettings(DEFAULT_TENANT_SETTINGS);
}
