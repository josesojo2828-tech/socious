import { describe, expect, it } from "vitest";
import {
  addDays,
  dayRange,
  defaultSlot,
  formatRange,
  toDateInputValue,
  toDateTimeLocal,
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
