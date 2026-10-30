import { describe, expect, it } from "vitest";
import {
  allowedTransitions,
  buildOrderListParams,
  buildShipPayload,
  canTransition,
  FULFILLMENT_LABELS,
  needsShipping,
  ORDER_STATUS_LABELS,
} from "./order-actions";

describe("order-actions (S9)", () => {
  describe("state machine (mirrors the backend)", () => {
    it("walks PENDING → CONFIRMED → PREPARING → DELIVERED", () => {
      expect(allowedTransitions("PENDING")).toEqual(["CONFIRMED", "CANCELLED"]);
      expect(canTransition("CONFIRMED", "PREPARING")).toBe(true);
      expect(canTransition("PREPARING", "DELIVERED")).toBe(true);
      expect(canTransition("DELIVERED", "CANCELLED")).toBe(false);
      expect(canTransition("PENDING", "DELIVERED")).toBe(false);
    });

    it("never reopens a closed order", () => {
      expect(allowedTransitions("DELIVERED")).toEqual([]);
      expect(allowedTransitions("CANCELLED")).toEqual([]);
    });
  });

  describe("buildOrderListParams", () => {
    it("only sends filled filters with the default pagination", () => {
      expect(buildOrderListParams({})).toEqual({ page: 1, limit: 10 });
      expect(
        buildOrderListParams({
          fulfillmentType: "SHIPPING",
          agencyId: "a-1",
          shipped: false,
          from: "2026-11-01",
        }),
      ).toEqual({
        page: 1,
        limit: 10,
        fulfillmentType: "SHIPPING",
        agencyId: "a-1",
        shipped: "false",
        from: "2026-11-01",
      });
    });
  });

  describe("needsShipping", () => {
    it("is false only for a store pickup", () => {
      expect(needsShipping({ fulfillmentType: "PICKUP" })).toBe(false);
      expect(needsShipping({ fulfillmentType: "DELIVERY" })).toBe(true);
      expect(needsShipping({ fulfillmentType: "SHIPPING" })).toBe(true);
    });
  });

  describe("buildShipPayload", () => {
    it("sends only what was provided", () => {
      expect(buildShipPayload("  ZOOM-777  ")).toEqual({
        trackingNumber: "ZOOM-777",
      });
      expect(buildShipPayload(undefined, "2026-11-07")).toEqual({
        shippedAt: "2026-11-07T12:00:00.000Z",
      });
      expect(buildShipPayload()).toEqual({});
    });
  });

  describe("labels", () => {
    it("covers every status and fulfillment type", () => {
      expect(ORDER_STATUS_LABELS.PENDING).toBe("Pendiente");
      expect(FULFILLMENT_LABELS.SHIPPING).toBe("Envío");
      expect(Object.keys(ORDER_STATUS_LABELS)).toHaveLength(5);
      expect(Object.keys(FULFILLMENT_LABELS)).toHaveLength(3);
    });
  });
});
