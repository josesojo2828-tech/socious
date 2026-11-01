import { describe, expect, it } from "vitest";
import {
  applySettingsPatch,
  patchAgency,
  patchCashShiftControl,
  patchCoordination,
  patchCurrency,
  patchDeliveryEnabled,
  patchDeliveryFee,
  patchFulfillmentType,
  patchRoutesEnabled,
  toggleListValue,
} from "./settings-form";
import type { TenantSettings } from "../types/tenant-settings.type";

const base: TenantSettings = {
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
  delivery: { enabled: true, feeUSD: 3.5 },
  routes: { enabled: false },
  returns: { reasons: ["Solo lo estaba probando"] },
  credit: {
    initialPaymentUSD: null,
    initialPercent: 0,
    cadence: "QUINCENAL",
    everyNDays: 15,
    monthlyDay: 1,
  },
  notifications: {
    lowStock: true,
    creditDue: true,
    orderReceived: true,
    saleCreated: false,
  },
  payments: { disabledCodes: [] },
  purchases: { onlySupplierProducts: false },
};

describe("settings-form (S4)", () => {
  describe("applySettingsPatch", () => {
    it("changes only the patched section", () => {
      const next = applySettingsPatch(base, patchRoutesEnabled(base, true));

      expect(next.routes.enabled).toBe(true);
      expect(next.cash).toEqual(base.cash);
      expect(next.delivery).toEqual(base.delivery);
      expect(next.fulfillment.enabledTypes).toEqual(
        base.fulfillment.enabledTypes,
      );
    });

    it("merges a partial section without dropping siblings", () => {
      const patch = patchCurrency(base, "showEUR", true);
      const next = applySettingsPatch(base, patch);

      expect(next.currencies.showEUR).toBe(true);
      expect(next.currencies.showUSD).toBe(true);
      expect(next.currencies.showVES).toBe(true);
    });
  });

  describe("boolean checks", () => {
    it("flips the cash shift control", () => {
      expect(patchCashShiftControl(base)).toEqual({
        cash: { shiftControl: false },
      });
      expect(
        patchCashShiftControl(applySettingsPatch(base, patchCashShiftControl(base))),
      ).toEqual({ cash: { shiftControl: true } });
    });

    it("toggles delivery and routes independently", () => {
      expect(patchDeliveryEnabled(base, false)).toEqual({
        delivery: { enabled: false },
      });
      expect(patchRoutesEnabled(base, true)).toEqual({
        routes: { enabled: true },
      });
    });

    it("never sends a negative delivery fee", () => {
      expect(patchDeliveryFee(-5)).toEqual({ delivery: { feeUSD: 0 } });
      expect(patchDeliveryFee(2.75)).toEqual({ delivery: { feeUSD: 2.75 } });
    });
  });

  describe("list checks", () => {
    it("adds and removes a fulfillment type", () => {
      const off = patchFulfillmentType(base, "SHIPPING", false);
      const withoutShipping = applySettingsPatch(base, off);
      expect(withoutShipping.fulfillment.enabledTypes).toEqual([
        "PICKUP",
        "DELIVERY",
      ]);

      const on = patchFulfillmentType(withoutShipping, "SHIPPING", true);
      const back = applySettingsPatch(withoutShipping, on);
      expect(back.fulfillment.enabledTypes).toEqual([
        "PICKUP",
        "DELIVERY",
        "SHIPPING",
      ]);
    });

    it("enables and disables an agency without duplicates", () => {
      const off = patchAgency(base, "ZOOM", false);
      expect(applySettingsPatch(base, off).shipping.enabledAgencies).toEqual([
        "MRW",
      ]);

      const on = patchAgency(
        applySettingsPatch(base, off),
        "ZOOM",
        true,
      );
      const restored = applySettingsPatch(applySettingsPatch(base, off), on);
      expect(restored.shipping.enabledAgencies).toEqual(["MRW", "ZOOM"]);
      expect(toggleListValue(restored.shipping.enabledAgencies, "ZOOM")).toEqual([
        "MRW",
      ]);
    });

    it("replaces the coordination default", () => {
      expect(patchCoordination(base, "PHONE")).toEqual({
        fulfillment: { coordination: "PHONE" },
      });
    });
  });
});
