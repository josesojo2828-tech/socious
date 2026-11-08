import { describe, expect, it } from "vitest";
import { rangeForPreset } from "./range";

describe("rangeForPreset", () => {
  it("covers today and the six days before for a 7-day range", () => {
    expect(rangeForPreset(7, new Date(2026, 10, 8, 15))).toEqual({
      from: "2026-11-02",
      to: "2026-11-08",
    });
  });

  it("crosses the month boundary", () => {
    expect(rangeForPreset(7, new Date(2026, 10, 3))).toEqual({
      from: "2026-10-28",
      to: "2026-11-03",
    });
  });

  it("uses the same day for a 30-day range and ignores the time", () => {
    expect(rangeForPreset(30, new Date(2026, 10, 8, 23, 59))).toEqual({
      from: "2026-10-10",
      to: "2026-11-08",
    });
  });
});
