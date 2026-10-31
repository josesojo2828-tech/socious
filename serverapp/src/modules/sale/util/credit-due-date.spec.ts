import { computeCreditDueDate } from "./credit-due-date";

describe("computeCreditDueDate", () => {
  const from = new Date(2026, 9, 31); // 31 oct 2026

  it("leaves FREE sales open", () => {
    expect(computeCreditDueDate("FREE", {}, from)).toBeNull();
  });

  it("adds fifteen days for QUINCENAL", () => {
    const due = computeCreditDueDate("QUINCENAL", {}, from)!;
    expect(due.getDate()).toBe(15);
    expect(due.getMonth()).toBe(10); // noviembre
  });

  it("adds N days for EVERY_N_DAYS, clamped", () => {
    const due = computeCreditDueDate("EVERY_N_DAYS", { everyNDays: 30 }, from)!;
    expect(due.getDate()).toBe(30);
    const clamped = computeCreditDueDate(
      "EVERY_N_DAYS",
      { everyNDays: 999 },
      from,
    )!;
    expect(clamped.getTime() - from.getTime()).toBeLessThanOrEqual(
      365 * 24 * 60 * 60 * 1000,
    );
  });

  it("rolls MONTHLY to the next month when the day already passed", () => {
    const due = computeCreditDueDate("MONTHLY", { monthlyDay: 1 }, from)!;
    expect(due.getMonth()).toBe(10);
    expect(due.getDate()).toBe(1);

    const sameDay = new Date(2026, 9, 1);
    const nextMonth = computeCreditDueDate(
      "MONTHLY",
      { monthlyDay: 1 },
      sameDay,
    )!;
    expect(nextMonth.getMonth()).toBe(10);
  });
});
