/**
 * frisancho.engine.test.ts
 *
 * TDD Suite for Pediatric Frisancho Anthropometric Evaluation Engine
 * Standards: A. Roberto Frisancho (1981, 1990) & Heymsfield et al. (1982)
 */

import { describe, expect, it } from "vitest";
import {
  calculateTotalArmArea,
  calculateArmMuscleArea,
  calculateCorrectedArmMuscleArea,
  calculateArmFatArea,
  calculateArmFatIndex,
  calculateFrisanchoComposition,
  getFrisanchoAgeBracket,
  getFrisanchoPercentiles,
  classifyMuscleReserve,
  classifyFatReserve,
  FRISANCHO_AGE_BRACKETS,
} from "../frisancho.engine";

describe("frisancho.engine", () => {
  describe("Exact Formulas Calculations (S1)", () => {
    describe("calculateTotalArmArea (TAA)", () => {
      it("calculates TAA = C^2 / (4 * pi) with round2 precision", () => {
        // C = 20.0 cm -> 400 / (4 * pi) = 100 / pi = 31.830988... -> 31.83
        expect(calculateTotalArmArea(20.0)).toBe(31.83);
      });

      it("calculates TAA for MUAC = 16.5 cm", () => {
        // C = 16.5 cm -> 272.25 / (4 * pi) = 21.6649... -> 21.66
        expect(calculateTotalArmArea(16.5)).toBe(21.66);
      });

      it("returns null for non-positive MUAC", () => {
        expect(calculateTotalArmArea(0)).toBeNull();
        expect(calculateTotalArmArea(-15)).toBeNull();
      });
    });

    describe("calculateArmMuscleArea (AMA)", () => {
      it("calculates uncorrected AMA = (C - pi * T / 10)^2 / (4 * pi)", () => {
        // C = 20.0 cm, T = 10.0 mm -> pi * 10 / 10 = pi = 3.14159...
        // C - pi = 16.8584... -> (16.8584...)^2 / (4 * pi) = 22.6163... -> 22.62
        expect(calculateArmMuscleArea(20.0, 10.0)).toBe(22.62);
      });

      it("calculates AMA for infant/toddler C = 15.0 cm, T = 8.0 mm", () => {
        // C = 15, T = 8 -> pi * 0.8 = 2.51327...
        // 15 - 2.51327 = 12.4867... -> (12.4867)^2 / (4 * pi) = 155.918 / 12.56637 = 12.407... -> 12.41
        expect(calculateArmMuscleArea(15.0, 8.0)).toBe(12.41);
      });

      it("returns null for invalid inputs or when skinfold exceeds circumference boundary", () => {
        expect(calculateArmMuscleArea(0, 10)).toBeNull();
        expect(calculateArmMuscleArea(20, -5)).toBeNull();
        // If pi * T / 10 >= C, muscle area is physically impossible
        expect(calculateArmMuscleArea(5.0, 25.0)).toBeNull();
      });
    });

    describe("calculateCorrectedArmMuscleArea (cAMA - Heymsfield bone-free)", () => {
      it("subtracts 10 cm^2 for MALES", () => {
        // AMA = 22.62 -> cAMA = 12.62
        expect(calculateCorrectedArmMuscleArea(22.62, "MALE")).toBe(12.62);
      });

      it("subtracts 6.5 cm^2 for FEMALES", () => {
        // AMA = 22.62 -> cAMA = 16.12
        expect(calculateCorrectedArmMuscleArea(22.62, "FEMALE")).toBe(16.12);
      });

      it("clamps cAMA to 0 if subtraction yields negative value", () => {
        expect(calculateCorrectedArmMuscleArea(8.5, "MALE")).toBe(0);
        expect(calculateCorrectedArmMuscleArea(4.0, "FEMALE")).toBe(0);
      });

      it("returns null for gender OTHER or invalid AMA", () => {
        expect(calculateCorrectedArmMuscleArea(22.62, "OTHER")).toBeNull();
        expect(calculateCorrectedArmMuscleArea(-5, "MALE")).toBeNull();
      });
    });

    describe("calculateArmFatArea (AFA)", () => {
      it("calculates AFA = TAA - AMA", () => {
        // TAA = 31.83, AMA = 22.62 -> AFA = 9.21
        expect(calculateArmFatArea(31.83, 22.62)).toBe(9.21);
      });

      it("clamps AFA to 0 if AMA exceeds TAA due to measurement error", () => {
        expect(calculateArmFatArea(20.0, 22.0)).toBe(0);
      });

      it("returns null for non-positive inputs", () => {
        expect(calculateArmFatArea(0, 10)).toBeNull();
        expect(calculateArmFatArea(20, -5)).toBeNull();
      });
    });

    describe("calculateArmFatIndex (AFI)", () => {
      it("calculates AFI = (AFA / TAA) * 100 (%)", () => {
        // AFA = 9.21, TAA = 31.83 -> (9.21 / 31.83) * 100 = 28.9349... -> 28.93%
        expect(calculateArmFatIndex(9.21, 31.83)).toBe(28.93);
      });

      it("returns null if TAA is non-positive or AFA is negative", () => {
        expect(calculateArmFatIndex(5, 0)).toBeNull();
        expect(calculateArmFatIndex(-2, 20)).toBeNull();
      });
    });
  });

  describe("Age Brackets & Bounds Check (S2)", () => {
    it("returns null for infants < 1.0 year (outside Frisancho pediatric tables)", () => {
      expect(getFrisanchoAgeBracket(0.5)).toBeNull();
      expect(getFrisanchoAgeBracket(0.99)).toBeNull();
    });

    it("returns null for age > 18.0 years (outside pediatric scope)", () => {
      expect(getFrisanchoAgeBracket(18.1)).toBeNull();
      expect(getFrisanchoAgeBracket(25)).toBeNull();
    });

    it("identifies correct bracket for milestone pediatric ages", () => {
      expect(getFrisanchoAgeBracket(1.0)).toBe("1.0-1.9");
      expect(getFrisanchoAgeBracket(1.5)).toBe("1.0-1.9");
      expect(getFrisanchoAgeBracket(2.0)).toBe("2.0-2.9");
      expect(getFrisanchoAgeBracket(5.5)).toBe("5.0-5.9");
      expect(getFrisanchoAgeBracket(10.0)).toBe("10.0-10.9");
      expect(getFrisanchoAgeBracket(17.9)).toBe("17.0-18.0");
      expect(getFrisanchoAgeBracket(18.0)).toBe("17.0-18.0");
    });

    it("contains all 17 pediatric brackets from 1.0 to 18.0 years", () => {
      expect(FRISANCHO_AGE_BRACKETS.length).toBe(17);
      expect(FRISANCHO_AGE_BRACKETS[0]).toBe("1.0-1.9");
      expect(FRISANCHO_AGE_BRACKETS[FRISANCHO_AGE_BRACKETS.length - 1]).toBe("17.0-18.0");
    });
  });

  describe("Percentile Lookup Tables (S2)", () => {
    it("retrieves standard reference percentiles for a 5-year-old boy (Male, 5.0-5.9)", () => {
      const p = getFrisanchoPercentiles({ gender: "MALE", ageYears: 5.2 });
      expect(p).not.toBeNull();
      if (!p) return;

      expect(p.ageBracket).toBe("5.0-5.9");
      expect(p.gender).toBe("MALE");

      // Triceps skinfold (mm) percentiles for boys 5-5.9
      expect(p.tsf.p5).toBe(5.0);
      expect(p.tsf.p50).toBe(8.0);
      expect(p.tsf.p95).toBe(14.5);

      // Arm muscle area (cm^2) percentiles for boys 5-5.9
      expect(p.ama.p5).toBe(11.3);
      expect(p.ama.p50).toBe(16.2);
      expect(p.ama.p95).toBe(21.4);
    });

    it("retrieves standard reference percentiles for a 10-year-old girl (Female, 10.0-10.9)", () => {
      const p = getFrisanchoPercentiles({ gender: "FEMALE", ageYears: 10.5 });
      expect(p).not.toBeNull();
      if (!p) return;

      expect(p.ageBracket).toBe("10.0-10.9");
      expect(p.gender).toBe("FEMALE");

      // Arm muscle area (cm^2) percentiles for girls 10-10.9
      expect(p.ama.p5).toBe(13.8);
      expect(p.ama.p50).toBe(18.6);
      expect(p.ama.p95).toBe(24.2);
    });

    it("returns null when gender is OTHER or age is out of bounds", () => {
      expect(getFrisanchoPercentiles({ gender: "OTHER", ageYears: 5.0 })).toBeNull();
      expect(getFrisanchoPercentiles({ gender: "MALE", ageYears: 0.8 })).toBeNull();
      expect(getFrisanchoPercentiles({ gender: "FEMALE", ageYears: 19.0 })).toBeNull();
    });
  });

  describe("Clinical Categorization & Severity (S2 & S5)", () => {
    const mockTableRow = {
      p5: 11.3,
      p10: 12.3,
      p15: 13.0,
      p25: 14.4,
      p50: 16.2,
      p75: 18.3,
      p85: 19.6,
      p90: 20.4,
      p95: 21.4,
    };

    describe("classifyMuscleReserve", () => {
      it("classifies value < p5 as severe muscle depletion (CRITICAL)", () => {
        const c = classifyMuscleReserve(10.0, mockTableRow);
        expect(c.category).toBe("<p5");
        expect(c.severity).toBe("CRITICAL");
        expect(c.classification).toContain("Depleción severa de masa muscular");
      });

      it("classifies value in p5-p15 as below average / moderate depletion (WARNING)", () => {
        const c = classifyMuscleReserve(12.5, mockTableRow);
        expect(c.category).toBe("p5-p15");
        expect(c.severity).toBe("WARNING");
        expect(c.classification).toContain("Depleción moderada de masa muscular");
      });

      it("classifies value in p15-p85 as normal / adequate muscle reserve (NORMAL)", () => {
        const c = classifyMuscleReserve(16.0, mockTableRow);
        expect(c.category).toBe("p15-p85");
        expect(c.severity).toBe("NORMAL");
        expect(c.classification).toContain("Masa muscular promedio");
      });

      it("classifies value in p85-p95 as above average muscle reserve (NORMAL)", () => {
        const c = classifyMuscleReserve(20.0, mockTableRow);
        expect(c.category).toBe("p85-p95");
        expect(c.severity).toBe("NORMAL");
        expect(c.classification).toContain("Masa muscular sobre el promedio");
      });

      it("classifies value > p95 as high muscle mass / hypertrophy (INFO)", () => {
        const c = classifyMuscleReserve(23.0, mockTableRow);
        expect(c.category).toBe(">p95");
        expect(c.severity).toBe("INFO");
        expect(c.classification).toContain("Hipertrofia muscular");
      });
    });

    describe("classifyFatReserve", () => {
      const mockFatRow = {
        p5: 5.0,
        p10: 5.5,
        p15: 6.0,
        p25: 7.0,
        p50: 8.0,
        p75: 11.0,
        p85: 13.0,
        p90: 14.0,
        p95: 16.0,
      };

      it("classifies value < p5 as severe fat depletion (CRITICAL)", () => {
        const c = classifyFatReserve(4.2, mockFatRow);
        expect(c.category).toBe("<p5");
        expect(c.severity).toBe("CRITICAL");
        expect(c.classification).toContain("Depleción severa de reserva grasa");
      });

      it("classifies value in p5-p15 as low fat reserve (WARNING)", () => {
        const c = classifyFatReserve(5.5, mockFatRow);
        expect(c.category).toBe("p5-p15");
        expect(c.severity).toBe("WARNING");
        expect(c.classification).toContain("Reserva grasa baja");
      });

      it("classifies value in p15-p85 as adequate fat reserve (NORMAL)", () => {
        const c = classifyFatReserve(8.5, mockFatRow);
        expect(c.category).toBe("p15-p85");
        expect(c.severity).toBe("NORMAL");
        expect(c.classification).toContain("Reserva grasa promedio");
      });

      it("classifies value in p85-p95 as overweight / excess risk (WARNING)", () => {
        const c = classifyFatReserve(14.5, mockFatRow);
        expect(c.category).toBe("p85-p95");
        expect(c.severity).toBe("WARNING");
        expect(c.classification).toContain("Sobrepeso");
      });

      it("classifies value > p95 as obesity / severe fat excess (ALERT)", () => {
        const c = classifyFatReserve(18.0, mockFatRow);
        expect(c.category).toBe(">p95");
        expect(c.severity).toBe("ALERT");
        expect(c.classification).toContain("Obesidad");
      });
    });
  });

  describe("Unified Engine: calculateFrisanchoComposition", () => {
    it("performs complete evaluation for a 5-year-old boy (MUAC = 16.0 cm, TSF = 8.0 mm)", () => {
      const result = calculateFrisanchoComposition({
        gender: "MALE",
        ageYears: 5.0,
        muacCm: 16.0,
        tsfMm: 8.0,
      });

      expect(result).not.toBeNull();
      if (!result) return;

      // 1. Core areas
      // TAA = 16^2 / (4 * pi) = 256 / 12.56637 = 20.3718... -> 20.37
      expect(result.taaCm2).toBe(20.37);

      // pi * 0.8 = 2.51327...
      // (16 - 2.51327...)^2 / (4 * pi) = (13.4867)^2 / (4 * pi) = 181.8918 / 12.56637 = 14.4744... -> 14.47
      expect(result.amaCm2).toBe(14.47);

      // Heymsfield male correction: 14.47 - 10 = 4.47
      expect(result.camaCm2).toBe(4.47);

      // AFA = 20.37 - 14.47 = 5.90
      expect(result.afaCm2).toBe(5.9);

      // AFI = (5.9 / 20.37) * 100 = 28.964... -> 28.96%
      expect(result.afiPercent).toBe(28.96);

      // 2. Classifications
      expect(result.ageBracket).toBe("5.0-5.9");
      expect(result.muscleEvaluation.category).toBe("p15-p85");
      expect(result.muscleEvaluation.severity).toBe("NORMAL");
      expect(result.fatEvaluation.severity).toBe("NORMAL");
      expect(result.isPediatricApplicable).toBe(true);
    });

    it("returns null if input measurements are missing or negative", () => {
      expect(
        calculateFrisanchoComposition({
          gender: "MALE",
          ageYears: 5.0,
          muacCm: 0,
          tsfMm: 8.0,
        }),
      ).toBeNull();

      expect(
        calculateFrisanchoComposition({
          gender: "FEMALE",
          ageYears: 5.0,
          muacCm: 16.0,
          tsfMm: -2.0,
        }),
      ).toBeNull();
    });

    it("calculates areas but flags non-pediatric if age is out of bounds", () => {
      const adultResult = calculateFrisanchoComposition({
        gender: "MALE",
        ageYears: 22.0,
        muacCm: 28.0,
        tsfMm: 12.0,
      });

      // Formulas still calculate, but percentile evaluation is marked non-applicable
      expect(adultResult).not.toBeNull();
      if (!adultResult) return;
      expect(adultResult.isPediatricApplicable).toBe(false);
      expect(adultResult.percentiles).toBeNull();
    });
  });
});
