import { describe, expect, it } from "vitest";
import {
  addDays,
  dayKeyOf,
  dayRange,
  defaultSlot,
  formatRange,
  monthGrid,
  shiftPeriod,
  startOfWeek,
  toDateInputValue,
  toDateTimeLocal,
  viewRange,
} from "./agenda";

describe("studio agenda date helpers", () => {
  it("formats a local day as YYYY-MM-DD", () => {
    expect(toDateInputValue(new Date(2026, 10, 9))).toBe("2026-11-09");
  });

  it("shifts days across month boundaries", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("covers the whole local day with an exclusive upper bound", () => {
    const { from, to } = dayRange("2026-11-09");
    const start = new Date(from);
    const end = new Date(to);

    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it("renders the local time range of a slot", () => {
    const start = new Date(2026, 10, 9, 9, 0).toISOString();
    const end = new Date(2026, 10, 9, 10, 30).toISOString();

    expect(formatRange(start, end)).toBe("09:00 – 10:30");
  });

  it("round-trips into a datetime-local value without shifting the day", () => {
    const iso = new Date(2026, 10, 9, 14, 5).toISOString();
    expect(toDateTimeLocal(iso)).toBe("2026-11-09T14:05");
  });

  it("builds a default slot on the selected day", () => {
    expect(defaultSlot("2026-11-09")).toBe("2026-11-09T09:00");
    expect(defaultSlot("2026-11-09", 15)).toBe("2026-11-09T15:00");
  });
});

describe("studio calendar helpers", () => {
  it("finds the Monday of a week", () => {
    expect(startOfWeek("2026-11-09")).toBe("2026-11-09"); // lunes
    expect(startOfWeek("2026-11-15")).toBe("2026-11-09"); // domingo
  });

  it("builds whole weeks covering the month", () => {
    const grid = monthGrid("2026-11-09");
    expect(grid.length).toBeGreaterThanOrEqual(5);
    expect(grid.every((week) => week.length === 7)).toBe(true);
    const flat = grid.flat();
    expect(flat[0].dateISO).toBe("2026-10-26"); // lunes previo al 1 nov
    expect(flat.some((cell) => cell.dateISO === "2026-11-09")).toBe(true);
    expect(flat.some((cell) => cell.dateISO === "2026-11-09" && cell.inMonth)).toBe(true);
    expect(flat.some((cell) => !cell.inMonth)).toBe(true);
  });

  it("shifts one period per view", () => {
    expect(shiftPeriod("2026-11-09", "day", 1)).toBe("2026-11-10");
    expect(shiftPeriod("2026-11-09", "week", 1)).toBe("2026-11-16");
    expect(shiftPeriod("2026-11-30", "month", 1)).toBe("2026-12-30");
    expect(shiftPeriod("2026-01-31", "month", 1)).toBe("2026-02-28");
  });

  it("loads the exact window each view paints", () => {
    const day = viewRange("2026-11-09", "day");
    expect(new Date(day.from).getDate()).toBe(9);

    const week = viewRange("2026-11-11", "week");
    expect(dayKeyOf(week.from)).toBe("2026-11-09");

    const month = viewRange("2026-11-09", "month");
    expect(dayKeyOf(month.from)).toBe("2026-10-26");
    expect(dayKeyOf(new Date(new Date(month.to).getTime() - 1).toISOString())).toBe(
      "2026-12-06",
    );
  });

  it("maps an appointment instant to its local day", () => {
    const iso = new Date(2026, 10, 9, 23, 30).toISOString();
    expect(dayKeyOf(iso)).toBe("2026-11-09");
  });
});
