import { describe, expect, it } from "vitest";
import { calculateSportsResults, deriveFfm } from "./sports-history.engine";

const METS_FIXTURE = {
  weightKg: 75,
  ffmKg: 70,
  disciplines: [{ met: 5 }],
  load: { minutesPerSession: 240, daysPerWeek: 6, sessionsPerDay: 1 },
};

describe("sports-history.engine", () => {
  describe("deriveFfm", () => {
    it("FFM = peso × (1 − fatPercentage/100) — 75kg/20% → 60", () => {
      expect(deriveFfm({ weightKg: 75, fatPercentage: 20 })).toBe(60);
    });

    it("70kg/15% → 59.5", () => {
      expect(deriveFfm({ weightKg: 70, fatPercentage: 15 })).toBe(59.5);
    });
  });

  describe("calculateSportsResults", () => {
    it("Cunningham RMR = 500 + 22 × FFM (FFM=70 → 2040)", () => {
      const result = calculateSportsResults(METS_FIXTURE);
      expect(result.cunninghamRmr).toBe(2040);
    });

    it("METS single-discipline fixture met=5, 75kg, 240/6/1 → 1347.4 kcal/día", () => {
      const result = calculateSportsResults(METS_FIXTURE);
      expect(result.metsExpenditure).toBe(1347.4);
    });

    it("total = Cunningham + METS (2040 + 1347.4 → 3387.4)", () => {
      const result = calculateSportsResults(METS_FIXTURE);
      expect(result.total).toBe(3387.4);
    });

    it("Σ diario con múltiples disciplinas y carga compartida", () => {
      const result = calculateSportsResults({
        weightKg: 75,
        ffmKg: 70,
        disciplines: [{ met: 5 }, { met: 3 }],
        load: { minutesPerSession: 240, daysPerWeek: 6, sessionsPerDay: 1 },
      });
      const single = calculateSportsResults(METS_FIXTURE);
      const extra = calculateSportsResults({
        weightKg: 75,
        ffmKg: 70,
        disciplines: [{ met: 3 }],
        load: { minutesPerSession: 240, daysPerWeek: 6, sessionsPerDay: 1 },
      });
      expect(result.metsExpenditure).toBe(
        Math.round((single.metsExpenditure + extra.metsExpenditure) * 100) / 100,
      );
      expect(result.total).toBe(round2(2040 + result.metsExpenditure));
    });
  });
});

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}