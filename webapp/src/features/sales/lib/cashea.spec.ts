import { describe, expect, it } from "vitest";
import {
  CASHEA_CADENCE_DAYS,
  buildCasheaPlan,
  casheaFinancedUSD,
  casheaInstallmentUSD,
  casheaPreview,
  dateOnlyToIso,
  defaultCasheaFirstDueDate,
  parseDateOnly,
  validateCashea,
} from "./cashea";

describe("cashea helpers", () => {
  it("finances what the initial does not cover", () => {
    expect(casheaFinancedUSD(100, 40)).toBe(60);
    expect(casheaFinancedUSD(100, 120)).toBe(0);
  });

  it("splits the financed part into equal installments", () => {
    expect(casheaInstallmentUSD(100, 40, 3)).toBe(20);
    expect(casheaInstallmentUSD(100, 0, 3)).toBe(33.33);
  });

  it("parses a date-only value as a local date", () => {
    const date = parseDateOnly("2026-01-20");
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(0);
    expect(date?.getDate()).toBe(20);
  });

  it("rejects an impossible date-only value", () => {
    expect(parseDateOnly("2026-02-31")).toBeNull();
    expect(parseDateOnly("20/01/2026")).toBeNull();
  });

  it("keeps the chosen day when converting to ISO", () => {
    const iso = dateOnlyToIso("2026-01-20");
    const back = new Date(iso);
    expect(back.getFullYear()).toBe(2026);
    expect(back.getMonth()).toBe(0);
    expect(back.getDate()).toBe(20);
  });

  it("suggests the first installment two weeks out", () => {
    expect(defaultCasheaFirstDueDate(new Date(2026, 0, 20))).toBe("2026-02-03");
  });

  it("previews one entry every 14 days", () => {
    const entries = casheaPreview(100, {
      initialUSD: 40,
      installmentCount: 3,
      firstDueDate: "2026-01-20",
    });

    expect(CASHEA_CADENCE_DAYS).toBe(14);
    expect(entries).toHaveLength(3);
    expect(entries.map((entry) => entry.number)).toEqual([1, 2, 3]);
    expect(entries[1].date.getDate()).toBe(3);
    expect(entries[1].date.getMonth()).toBe(1);
    expect(entries.every((entry) => entry.amountUSD === 20)).toBe(true);
  });

  it("builds the payload the API expects", () => {
    const plan = buildCasheaPlan(100, {
      initialUSD: 40,
      installmentCount: 3,
      firstDueDate: "2026-01-20",
    });

    expect(plan.initialUSD).toBe(40);
    expect(plan.installmentCount).toBe(3);
    expect(plan.installmentUSD).toBe(20);
    expect(plan.firstDueDate).toBe(dateOnlyToIso("2026-01-20"));
  });

  it("clamps the initial to the sale total", () => {
    const plan = buildCasheaPlan(100, {
      initialUSD: 140,
      installmentCount: 2,
      firstDueDate: "2026-01-20",
    });
    expect(plan.initialUSD).toBe(100);
    expect(plan.installmentUSD).toBe(0);
  });

  it("builds plans whose split stays within rounding tolerance for every count", () => {
    for (const total of [100, 250, 99.99]) {
      for (let count = 1; count <= 36; count += 1) {
        const plan = buildCasheaPlan(total, {
          initialUSD: 0,
          installmentCount: count,
          firstDueDate: "2026-02-03",
        });
        const declared =
          Math.round((plan.initialUSD + count * plan.installmentUSD) * 100) / 100;
        // Mirrors the backend tolerance: rounding drift only, never a mistake.
        const tolerance = Math.max(0.05, Math.round(count * 0.5) / 100 + 0.01);
        expect(Math.abs(declared - total)).toBeLessThanOrEqual(tolerance);
      }
    }
  });

  it("validates the draft", () => {
    expect(validateCashea(100, { initialUSD: 40, installmentCount: 3 })).toBeNull();
    expect(validateCashea(100, { initialUSD: -1, installmentCount: 3 })).toBe(
      "El pago inicial de Cashea no puede ser negativo.",
    );
    expect(validateCashea(100, { initialUSD: 140, installmentCount: 3 })).toBe(
      "El pago inicial de Cashea no puede superar el total de la venta.",
    );
    expect(validateCashea(100, { initialUSD: 40, installmentCount: 0 })).toBe(
      "Cashea necesita entre 1 y 36 cuotas.",
    );
    expect(validateCashea(100, { initialUSD: 40, installmentCount: 40 })).toBe(
      "Cashea necesita entre 1 y 36 cuotas.",
    );
  });
});
