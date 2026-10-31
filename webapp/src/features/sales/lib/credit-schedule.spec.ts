import { describe, expect, it } from "vitest";
import { creditSchedule } from "./credit-schedule";

const FROM = new Date(2026, 9, 1); // 1 oct 2026

describe("creditSchedule", () => {
  it("walks fifteen-day steps with the outstanding balance (round 2, #3)", () => {
    const entries = creditSchedule({
      totalUSD: 100,
      initialUSD: 0,
      cadence: "QUINCENAL",
      everyNDays: 15,
      monthlyDay: 1,
      count: 3,
      from: FROM,
    });
    expect(entries).toHaveLength(3);
    expect(entries[0].date.getDate()).toBe(16);
    expect(entries[1].date.getDate()).toBe(31);
    expect(entries[2].date.getMonth()).toBe(10); // nov
    expect(entries.every((entry) => entry.balanceUSD === 100)).toBe(true);
  });

  it("subtracts the initial payment from the balance", () => {
    const entries = creditSchedule({
      totalUSD: 100,
      initialUSD: 30,
      cadence: "EVERY_N_DAYS",
      everyNDays: 10,
      monthlyDay: 1,
      count: 2,
      from: FROM,
    });
    expect(entries[0].date.getDate()).toBe(11);
    expect(entries[0].balanceUSD).toBe(70);
  });

  it("has no dates for FREE (paid by abonos)", () => {
    expect(
      creditSchedule({
        totalUSD: 100,
        initialUSD: 0,
        cadence: "FREE",
        everyNDays: 15,
        monthlyDay: 1,
        from: FROM,
      }),
    ).toEqual([]);
  });

  it("is empty when the initial already covers the total", () => {
    expect(
      creditSchedule({
        totalUSD: 100,
        initialUSD: 100,
        cadence: "QUINCENAL",
        everyNDays: 15,
        monthlyDay: 1,
        from: FROM,
      }),
    ).toEqual([]);
  });

  it("walks MONTHLY by the configured day", () => {
    const entries = creditSchedule({
      totalUSD: 50,
      initialUSD: 0,
      cadence: "MONTHLY",
      everyNDays: 15,
      monthlyDay: 5,
      count: 2,
      from: FROM,
    });
    expect(entries[0].date.getMonth()).toBe(9); // 5 oct
    expect(entries[0].date.getDate()).toBe(5);
    expect(entries[1].date.getMonth()).toBe(10); // 5 nov
  });
});
