import { describe, expect, it } from "vitest";
import { periodPresetRange, type PeriodPreset } from "./period-range";

describe("periodPresetRange", () => {
  const now = new Date(2026, 10, 15, 12, 0, 0); // 15 nov 2026

  /** Non-custom presets always answer a range; unwrap for the assertions. */
  function mustRange(preset: PeriodPreset, at: Date = now) {
    const range = periodPresetRange(preset, at);
    if (!range) throw new Error(`preset ${preset} answered null`);
    return range;
  }

  it("answers today for the hoy preset", () => {
    const range = mustRange("hoy");
    expect(range.from).toBe("2026-11-15");
    expect(range.to).toBe("2026-11-15");
  });

  it("answers a 7-day window ending today for siete-dias", () => {
    const range = mustRange("siete-dias");
    expect(range.from).toBe("2026-11-09");
    expect(range.to).toBe("2026-11-15");
  });

  it("answers a 30-day window ending today for treinta-dias", () => {
    const range = mustRange("treinta-dias");
    expect(range.from).toBe("2026-10-17");
    expect(range.to).toBe("2026-11-15");
  });

  it("answers the current calendar month for mes-actual", () => {
    const range = mustRange("mes-actual");
    expect(range.from).toBe("2026-11-01");
    expect(range.to).toBe("2026-11-30");
  });

  it("walks back whole days in local time (no UTC shift)", () => {
    // 00:30 local on the 15th must still be the 15th, not the 14th UTC.
    const early = new Date(2026, 10, 15, 0, 30, 0);
    expect(mustRange("hoy", early).from).toBe("2026-11-15");
    expect(mustRange("siete-dias", early).from).toBe("2026-11-09");
  });

  it("answers null for the custom preset", () => {
    expect(periodPresetRange("personalizado", now)).toBeNull();
  });

  it("covers every declared preset key", () => {
    const presets: PeriodPreset[] = [
      "hoy",
      "siete-dias",
      "treinta-dias",
      "mes-actual",
      "personalizado",
    ];
    for (const preset of presets) {
      const range = periodPresetRange(preset, now);
      if (preset === "personalizado") {
        expect(range).toBeNull();
      } else {
        expect(range?.from).toBeTruthy();
        expect(range?.to).toBeTruthy();
        expect(range!.from <= range!.to).toBe(true);
      }
    }
  });
});
