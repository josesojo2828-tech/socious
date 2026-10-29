import { describe, expect, it } from "vitest";
import {
  calculateAthleteTotal,
  calculateAverageTrainingMinutes,
  calculateCunninghamRmr,
  calculateDirectExpenditure,
  calculateMetsExpenditure,
  round2,
} from "./sport-calculation.engine";
import { getCalPerMinForCategory } from "./sport-calorie-table";

const baseParams = {
  minutesPerSession: 240,
  daysPerWeek: 6,
  sessionsPerDay: 1,
};

const METS_FIXTURE = {
  met: 5,
  weightKg: 75,
  ...baseParams,
};

describe("sport-calculation.engine", () => {
  describe("round2", () => {
    it("redondea a 2 decimales", () => {
      expect(round2(3.14159)).toBe(3.14);
      expect(round2(1347.4005)).toBe(1347.4);
      expect(round2(205.7142857142857)).toBe(205.71);
    });
  });

  describe("calculateAverageTrainingMinutes", () => {
    it("promedia los minutos semanales entre 7 días (round2)", () => {
      expect(calculateAverageTrainingMinutes(240, 6, 1)).toBe(205.71);
    });
  });

  describe("calculateMetsExpenditure", () => {
    it("replica el engine institucional con el fixture met=5, 75kg, 240/6/1 → 1347,4 kcal/día", () => {
      expect(calculateMetsExpenditure(METS_FIXTURE)).toBe(1347.4);
    });

    it("aplica round2 en CADA paso (sin redondeo intermedio daría 1350)", () => {
      const result = calculateMetsExpenditure(METS_FIXTURE);
      expect(result).not.toBe(1350);
      expect(result).toBe(1347.4);
    });
  });

  describe("calculateDirectExpenditure (Método 1 / DIRECTO)", () => {
    it("gasto = min × días × sesiones × valorTabla (240×6×1 = 1440)", () => {
      expect(calculateDirectExpenditure({ calPerMin: 7, ...baseParams })).toBe(10080);
      expect(calculateDirectExpenditure({ calPerMin: 10, ...baseParams })).toBe(14400);
    });
  });

  describe("calculateCunninghamRmr", () => {
    it("Cunningham = 500 + 22 × FFM", () => {
      expect(calculateCunninghamRmr(70)).toBe(2040);
      expect(calculateCunninghamRmr(0)).toBe(500);
    });
  });

  describe("calculateAthleteTotal", () => {
    it("adulto = Cunningham + gasto deportivo (FFM=70, gasto=235 → 2275)", () => {
      expect(calculateAthleteTotal(70, 235)).toBe(2275);
    });
  });

  describe("sport-calorie-table fallback", () => {
    it("devuelve cal/min de referencia para una categoría conocida", () => {
      expect(getCalPerMinForCategory("CARRERA")).toBe(10);
      expect(getCalPerMinForCategory("MIND-BODY")).toBe(3);
    });

    it("devuelve undefined para categoría sin valor → fallback a Método 2", () => {
      expect(getCalPerMinForCategory("CATEGORÍA-DESCONOCIDA")).toBeUndefined();
    });
  });
});