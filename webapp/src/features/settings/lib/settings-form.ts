import type {
  CoordinationMethod,
  CurrencyVisibilityKey,
  FulfillmentType,
  TenantSettings,
  TenantSettingsPatch,
} from "../types/tenant-settings.type";

/**
 * Pure form logic for the settings screen (S4).
 *
 * Every builder returns the SAME shape the backend merges section by section,
 * so the UI can optimistically apply `applySettingsPatch` locally and send only
 * what changed. Keeping this outside the component makes it testable under
 * vitest's node environment (no jsdom in this repo).
 */

/** Mirrors the backend merge: untouched sections keep their values. */
export function applySettingsPatch(
  current: TenantSettings,
  patch: TenantSettingsPatch,
): TenantSettings {
  return {
    cash: { ...current.cash, ...(patch.cash ?? {}) },
    currencies: { ...current.currencies, ...(patch.currencies ?? {}) },
    fulfillment: {
      ...current.fulfillment,
      ...(patch.fulfillment ?? {}),
      enabledTypes:
        patch.fulfillment?.enabledTypes ?? current.fulfillment.enabledTypes,
      coordination:
        patch.fulfillment?.coordination ?? current.fulfillment.coordination,
    },
    shipping: {
      ...current.shipping,
      ...(patch.shipping ?? {}),
      enabledAgencies:
        patch.shipping?.enabledAgencies ?? current.shipping.enabledAgencies,
    },
    delivery: { ...current.delivery, ...(patch.delivery ?? {}) },
    routes: { ...current.routes, ...(patch.routes ?? {}) },
    returns: {
      ...current.returns,
      ...(patch.returns ?? {}),
      reasons: patch.returns?.reasons ?? current.returns.reasons,
    },
    credit: { ...current.credit, ...(patch.credit ?? {}) },
    notifications: { ...current.notifications, ...(patch.notifications ?? {}) },
    payments: {
      ...current.payments,
      ...(patch.payments ?? {}),
      disabledCodes:
        patch.payments?.disabledCodes ?? current.payments.disabledCodes,
    },
    purchases: { ...current.purchases, ...(patch.purchases ?? {}) },
  };
}

/** Adds or removes a value from a list (membership helpers below). */
export function toggleListValue(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

export function patchCashShiftControl(
  current: TenantSettings,
): TenantSettingsPatch {
  return { cash: { shiftControl: !current.cash.shiftControl } };
}

export function patchCurrency(
  current: TenantSettings,
  key: CurrencyVisibilityKey,
  enabled: boolean,
): TenantSettingsPatch {
  return { currencies: { [key]: enabled } };
}

export function patchFulfillmentType(
  current: TenantSettings,
  type: FulfillmentType,
  enabled: boolean,
): TenantSettingsPatch {
  return {
    fulfillment: {
      enabledTypes: enabled
        ? [...new Set([...current.fulfillment.enabledTypes, type])]
        : current.fulfillment.enabledTypes.filter((item) => item !== type),
    },
  };
}

export function patchCoordination(
  current: TenantSettings,
  coordination: CoordinationMethod,
): TenantSettingsPatch {
  return { fulfillment: { coordination } };
}

export function patchAgency(
  current: TenantSettings,
  agencyKey: string,
  enabled: boolean,
): TenantSettingsPatch {
  return {
    shipping: {
      enabledAgencies: enabled
        ? [...new Set([...current.shipping.enabledAgencies, agencyKey])]
        : current.shipping.enabledAgencies.filter((key) => key !== agencyKey),
    },
  };
}

export function patchDeliveryEnabled(
  current: TenantSettings,
  enabled: boolean,
): TenantSettingsPatch {
  return { delivery: { enabled } };
}

/** Accepts whatever the user typed; the backend rejects negatives itself. */
export function patchDeliveryFee(feeUSD: number): TenantSettingsPatch {
  return { delivery: { feeUSD: Math.max(0, feeUSD) } };
}

export function patchRoutesEnabled(
  current: TenantSettings,
  enabled: boolean,
): TenantSettingsPatch {
  return { routes: { enabled } };
}
