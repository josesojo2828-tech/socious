import { describe, expect, it } from "vitest";
import {
  allowedRouteTransitions,
  buildCreateRoutePayload,
  buildMarkItemPayload,
  buildRouteListParams,
  ROUTE_STATUS_LABELS,
  routeProgress,
} from "./route-actions";
import type { DeliveryRoute } from "../types/delivery-route.type";

describe("route-actions (S10)", () => {
  describe("state machine (mirrors the backend)", () => {
    it("walks OPEN → IN_PROGRESS → COMPLETED", () => {
      expect(allowedRouteTransitions("OPEN")).toEqual([
        "IN_PROGRESS",
        "COMPLETED",
        "CANCELLED",
      ]);
      expect(allowedRouteTransitions("IN_PROGRESS")).toEqual([
        "COMPLETED",
        "CANCELLED",
      ]);
      expect(allowedRouteTransitions("COMPLETED")).toEqual([]);
      expect(allowedRouteTransitions("CANCELLED")).toEqual([]);
    });

    it("labels every status", () => {
      expect(ROUTE_STATUS_LABELS.OPEN).toBe("Abierta");
      expect(Object.keys(ROUTE_STATUS_LABELS)).toHaveLength(4);
    });
  });

  describe("buildRouteListParams", () => {
    it("defaults to page 1 and omits empty filters", () => {
      expect(buildRouteListParams({})).toEqual({ page: 1, limit: 10 });
      expect(
        buildRouteListParams({ status: "OPEN", from: "2026-11-01" }),
      ).toEqual({ page: 1, limit: 10, status: "OPEN", from: "2026-11-01" });
    });
  });

  describe("buildCreateRoutePayload", () => {
    it("keeps only filled optional fields", () => {
      expect(
        buildCreateRoutePayload({
          date: "2026-11-07",
          name: "  Entregas sábado ",
          vehicle: "   ",
          orderIds: ["o-1", "o-2"],
        }),
      ).toEqual({
        date: "2026-11-07",
        name: "Entregas sábado",
        orderIds: ["o-1", "o-2"],
      });
    });
  });

  describe("buildMarkItemPayload", () => {
    it("allows a delivery without a reason", () => {
      expect(buildMarkItemPayload("DELIVERED")).toEqual({ status: "DELIVERED" });
    });

    it("requires and trims the reason on a failure", () => {
      expect(buildMarkItemPayload("FAILED", "  no había nadie ")).toEqual({
        status: "FAILED",
        failureReason: "no había nadie",
      });
      expect(() => buildMarkItemPayload("FAILED", "  ")).toThrow(
        /motivo del fallo/i,
      );
    });
  });

  describe("routeProgress", () => {
    it("uses the backend progress when present", () => {
      const route = {
        id: "r-1",
        routeNumber: "RUT-1",
        date: "2026-11-07",
        status: "OPEN",
        createdAt: "2026-11-01T00:00:00Z",
        progress: { total: 5, delivered: 3, pending: 2, failed: 0 },
      } as DeliveryRoute;

      expect(routeProgress(route)).toEqual({
        delivered: 3,
        total: 5,
        label: "3 de 5 entregados",
        percent: 60,
      });
    });

    it("falls back to the item count and stays at zero when empty", () => {
      const withCount = {
        id: "r-2",
        routeNumber: "RUT-2",
        date: "2026-11-08",
        status: "OPEN",
        createdAt: "2026-11-01T00:00:00Z",
        _count: { items: 4 },
      } as DeliveryRoute;

      expect(routeProgress(withCount).total).toBe(4);
      expect(
        routeProgress({
          id: "r-3",
          routeNumber: "RUT-3",
          date: "2026-11-09",
          status: "OPEN",
          createdAt: "2026-11-01T00:00:00Z",
        } as DeliveryRoute),
      ).toMatchObject({ total: 0, percent: 0 });
    });
  });
});
