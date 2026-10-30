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
  const types = [...new Set(value.filter(isFulfillmentType))];
  // An empty list would leave the checkout with nothing to offer, so it is
  // treated as "not configured" and the defaults come back.
  return types.length > 0 ? types : fallback;
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
  };
}

/** Deep clone so callers can never mutate the shared default object. */
export function cloneDefaultSettings(): TenantSettings {
  return normalizeTenantSettings(DEFAULT_TENANT_SETTINGS);
}
