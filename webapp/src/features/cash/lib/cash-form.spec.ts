import { describe, expect, it } from "vitest";
import {
  arqueoPreview,
  buildCloseShiftPayload,
  buildOpenShiftPayload,
  formatAmount,
  todayISO,
} from "./cash-form";

describe("cash-form (S5)", () => {
  describe("payload builders", () => {
    it("clamps a negative opening float to zero", () => {
      expect(buildOpenShiftPayload(-20)).toEqual({ initialAmountUSD: 0 });
    });

    it("keeps a positive float and trims the notes", () => {
      expect(buildOpenShiftPayload(100, "  turno de la mañana  ")).toEqual({
        initialAmountUSD: 100,
        notes: "turno de la mañana",
      });
    });

    it("omits blank notes instead of sending an empty string", () => {
      expect(buildOpenShiftPayload(50, "   ")).toEqual({ initialAmountUSD: 50 });
      expect(buildCloseShiftPayload(45, "")).toEqual({ actualAmountUSD: 45 });
    });

    it("treats a non-numeric count as zero", () => {
      expect(buildCloseShiftPayload(Number.NaN)).toEqual({
        actualAmountUSD: 0,
      });
    });
  });

  describe("arqueoPreview", () => {
    it("says CUADRA when the difference is within one cent", () => {
      expect(arqueoPreview(100, 100)).toEqual({
        differenceUSD: 0,
        verdict: "CUADRA",
      });
      expect(arqueoPreview(100, 100.01)).toEqual({
        differenceUSD: 0,
        verdict: "CUADRA",
      });
      expect(arqueoPreview(100, 99.99)).toEqual({
        differenceUSD: 0,
        verdict: "CUADRA",
      });
    });

    it("reports SOBRANTE when the drawer counts more", () => {
      expect(arqueoPreview(100, 105)).toEqual({
        differenceUSD: 5,
        verdict: "SOBRANTE",
      });
    });

    it("reports FALTANTE when the drawer counts less", () => {
      expect(arqueoPreview(100, 92)).toEqual({
        differenceUSD: -8,
        verdict: "FALTANTE",
      });
    });

    it("stays numeric when a field is missing", () => {
      expect(arqueoPreview(Number.NaN, Number.NaN)).toEqual({
        differenceUSD: 0,
        verdict: "CUADRA",
      });
    });
  });

  describe("format helpers", () => {
    it("renders the local calendar day", () => {
      expect(todayISO(new Date(2026, 0, 5))).toBe("2026-01-05");
      expect(todayISO(new Date(2026, 11, 31))).toBe("2026-12-31");
    });

    it("formats money with two decimals", () => {
      expect(formatAmount(1234.5)).toBe("$1234.50");
      expect(formatAmount(0)).toBe("$0.00");
      expect(formatAmount(Number.NaN)).toBe("$0.00");
    });
  });
});
