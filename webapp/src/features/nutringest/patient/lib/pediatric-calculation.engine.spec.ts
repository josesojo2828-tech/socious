import { describe, expect, it } from "vitest";
import {
  calculateHarrisBenedictWoman,
  calculateRct,
  calculateSchofieldTmb,
  calculateMirwaldPhv,
  getGrowthCostPercent,
  calculateHollidaySegar,
  calculatePediatricEnergyRequirement,
  PEDIATRIC_FA,
  PEDIATRIC_FA_MIDPOINT,
} from "./pediatric-calculation.engine";

describe("pediatric-calculation.engine", () => {
  describe("calculateSchofieldTmb — 6 ramas verbatim (Schofield 1985)", () => {
    it("Varón 0-3a: TMB = 59.5P − 30 (P=6 → 327)", () => {
      expect(
        calculateSchofieldTmb({ gender: "MALE", ageYears: 1, weightKg: 6 }),
      ).toBe(327);
    });

    it("Varón 3-10a: TMB = 22.7P + 495 (P=20 → 949)", () => {
      expect(
        calculateSchofieldTmb({ gender: "MALE", ageYears: 5, weightKg: 20 }),
      ).toBe(949);
    });

    it("Varón 10-18a: TMB = 17.5P + 651 (P=45 → 1438.5)", () => {
      expect(
        calculateSchofieldTmb({ gender: "MALE", ageYears: 12, weightKg: 45 }),
      ).toBe(1438.5);
    });

    it("Mujer 0-3a: TMB = 58.3P − 31 (P=6 → 318.8)", () => {
      expect(
        calculateSchofieldTmb({ gender: "FEMALE", ageYears: 1, weightKg: 6 }),
      ).toBe(318.8);
    });

    it("Mujer 3-10a: TMB = 22.5P + 499 (P=20 → 949)", () => {
      expect(
        calculateSchofieldTmb({ gender: "FEMALE", ageYears: 5, weightKg: 20 }),
      ).toBe(949);
    });

    it("Mujer 10-18a: TMB = 12.2P + 746 (P=45 → 1295)", () => {
      expect(
        calculateSchofieldTmb({ gender: "FEMALE", ageYears: 12, weightKg: 45 }),
      ).toBe(1295);
    });
  });

  describe("calculateSchofieldTmb — casos de borde", () => {
    it("gender OTHER → null", () => {
      expect(
        calculateSchofieldTmb({ gender: "OTHER", ageYears: 5, weightKg: 20 }),
      ).toBeNull();
    });

    it("edad ≥18 (fuera de rango pediátrico) → null", () => {
      expect(
        calculateSchofieldTmb({ gender: "MALE", ageYears: 18, weightKg: 70 }),
      ).toBeNull();
    });
  });

  describe("calculateHarrisBenedictWoman", () => {
    it("TMB = 655 + 9.6P + 1.8T − 4.7E (P=50, T=160, E=14 → 1357.2)", () => {
      expect(
        calculateHarrisBenedictWoman({ weightKg: 50, heightCm: 160, ageYears: 14 }),
      ).toBe(1357.2);
    });
  });

  describe("calculateRct", () => {
    it("RCT = TMB × FA + C, con C como % del gasto (TMB=994.4, FA=1.6, 2% → 1622.86)", () => {
      expect(
        calculateRct({ tmb: 994.4, activityFactor: 1.6, growthCostPercent: 0.02 }),
      ).toBe(1622.86);
    });

    it("sin costo de crecimiento (0%) → TMB × FA", () => {
      expect(
        calculateRct({ tmb: 949, activityFactor: 1.6, growthCostPercent: 0 }),
      ).toBe(1518.4);
    });
  });

  describe("getGrowthCostPercent — bandas de edad (meses)", () => {
    it("0-3m → 35 %", () => {
      expect(getGrowthCostPercent(0.2)).toBe(0.35);
    });

    it("4-6m → 7 %", () => {
      expect(getGrowthCostPercent(0.4)).toBe(0.07);
    });

    it("6-12m → 3 %", () => {
      expect(getGrowthCostPercent(0.7)).toBe(0.03);
    });

    it("12-24m → 2 %", () => {
      expect(getGrowthCostPercent(1.5)).toBe(0.02);
    });

    it("2-10 años → 2 %", () => {
      expect(getGrowthCostPercent(2)).toBe(0.02);
      expect(getGrowthCostPercent(5)).toBe(0.02);
    });

    it("pubertad (10-18 años) → 4 %", () => {
      expect(getGrowthCostPercent(10)).toBe(0.04);
      expect(getGrowthCostPercent(14)).toBe(0.04);
    });

    it("≥18 años o edad inválida → 0", () => {
      expect(getGrowthCostPercent(18)).toBe(0);
      expect(getGrowthCostPercent(25)).toBe(0);
      expect(getGrowthCostPercent(-1)).toBe(0);
    });
  });

  describe("PEDIATRIC_FA", () => {
    it("sedentario 1.2-1.3, poco activo 1.4-1.5, activo 1.6-1.7, muy activo 1.8-2.0", () => {
      expect(PEDIATRIC_FA.SEDENTARY).toEqual([1.2, 1.3]);
      expect(PEDIATRIC_FA.LOW).toEqual([1.4, 1.5]);
      expect(PEDIATRIC_FA.ACTIVE).toEqual([1.6, 1.7]);
      expect(PEDIATRIC_FA.VERY_ACTIVE).toEqual([1.8, 2.0]);
    });

    it("punto medio de cada banda para usar en el selector", () => {
      expect(PEDIATRIC_FA_MIDPOINT.SEDENTARY).toBe(1.25);
      expect(PEDIATRIC_FA_MIDPOINT.LOW).toBe(1.45);
      expect(PEDIATRIC_FA_MIDPOINT.ACTIVE).toBe(1.65);
      expect(PEDIATRIC_FA_MIDPOINT.VERY_ACTIVE).toBe(1.9);
    });
  });

  describe("Mirwald LEI-only (reuso calculadora/lib/mirwald.engine)", () => {
    it("chico 13.5a → +0.73 DESDE_PHV", () => {
      const result = calculateMirwaldPhv({
        gender: "MALE",
        age: 13.5,
        weightKg: 74,
        heightCm: 160,
        sittingHeightCm: 90,
      });
      expect(result.value).toBe(0.73);
      expect(result.maturityOffset).toBe(0.73);
      expect(result.ageAtPhv).toBe(12.77);
      expect(result.maturationStage).toBe("CIRCA_PHV");
      expect(result.sign).toBe(1);
      expect(result.label).toBe("DESDE_PHV");
      expect(result.rangeValid).toBe(true);
    });

    it("chica 12a → −1.5 HASTA_PHV", () => {
      const result = calculateMirwaldPhv({
        gender: "FEMALE",
        age: 12,
        weightKg: 29.5,
        heightCm: 130,
        sittingHeightCm: 65,
      });
      expect(result.value).toBe(-1.5);
      expect(result.maturityOffset).toBe(-1.5);
      expect(result.ageAtPhv).toBe(13.5);
      expect(result.maturationStage).toBe("PRE_PHV");
      expect(result.sign).toBe(-1);
      expect(result.label).toBe("HASTA_PHV");
      expect(result.rangeValid).toBe(true);
    });
  });

  describe("calculateHollidaySegar — gasto por peso corporal", () => {
    it("primeros 10 kg: 100 kcal/kg (8 kg -> 800 kcal)", () => {
      expect(calculateHollidaySegar(8)).toBe(800);
      expect(calculateHollidaySegar(10)).toBe(1000);
    });

    it("11 a 20 kg: 1000 + 50 kcal/kg (15 kg -> 1250 kcal)", () => {
      expect(calculateHollidaySegar(15)).toBe(1250);
      expect(calculateHollidaySegar(20)).toBe(1500);
    });

    it("por encima de 20 kg: 1500 + 20 kcal/kg (30 kg -> 1700 kcal)", () => {
      expect(calculateHollidaySegar(30)).toBe(1700);
    });

    it("peso <= 0 -> 0 kcal", () => {
      expect(calculateHollidaySegar(0)).toBe(0);
    });
  });

  describe("calculatePediatricEnergyRequirement — motor energético unificado", () => {
    it("calcula requerimiento completo con Schofield, crecimiento porcentual y macros", () => {
      // Varón, 5 años, 20 kg, FA 1.4
      // Schofield TMB = 22.7 * 20 + 495 = 949 kcal
      // FA = 1.4 -> 949 * 1.4 = 1328.6
      // Costo crecimiento 5 años = 2 % -> 26.57 kcal
      // Total = 1328.6 + 26.57 = 1355.17 kcal
      // Holliday-Segar 20 kg = 1500 kcal
      // CHOs (55%) = 1355.17 * 0.55 = 745.34 kcal -> 186.34 g
      // PRO (15%) = 1355.17 * 0.15 = 203.28 kcal -> 50.82 g
      // FAT (30%) = 1355.17 * 0.30 = 406.55 kcal -> 45.17 g
      const res = calculatePediatricEnergyRequirement({
        gender: "MALE",
        ageYears: 5,
        weightKg: 20,
        activityFactor: 1.4,
      });

      expect(res.tmbSchofield).toBe(949);
      expect(res.growthCostPercent).toBe(0.02);
      expect(res.growthCostKcal).toBe(26.57);
      expect(res.hollidaySegarKcal).toBe(1500);
      expect(res.totalKcal).toBe(1355.17);

      expect(res.macronutrients.carbohydrates.percentage).toBe(55);
      expect(res.macronutrients.carbohydrates.kcal).toBe(745.34);
      expect(res.macronutrients.carbohydrates.grams).toBe(186.34);

      expect(res.macronutrients.proteins.percentage).toBe(15);
      expect(res.macronutrients.proteins.kcal).toBe(203.28);
      expect(res.macronutrients.proteins.grams).toBe(50.82);

      expect(res.macronutrients.fats.percentage).toBe(30);
      expect(res.macronutrients.fats.kcal).toBe(406.55);
      expect(res.macronutrients.fats.grams).toBe(45.17);
    });

    it("reproduce el caso de la lámina: 6 años, 22 kg, activo (FA 1.6) → 1622.86 kcal", () => {
      // Schofield varón 3-10a = 22.7 * 22 + 495 = 994.4
      // TMB × FA = 994.4 * 1.6 = 1591.04
      // Crecimiento 2 % = 31.82
      // Total = 1622.86 kcal
      const res = calculatePediatricEnergyRequirement({
        gender: "MALE",
        ageYears: 6,
        weightKg: 22,
        activityFactor: 1.6,
      });

      expect(res.tmbSchofield).toBe(994.4);
      expect(res.growthCostPercent).toBe(0.02);
      expect(res.growthCostKcal).toBe(31.82);
      expect(res.totalKcal).toBe(1622.86);
    });

    it("usa fallback de Holliday-Segar cuando Schofield devuelve null (gender OTHER)", () => {
      const res = calculatePediatricEnergyRequirement({
        gender: "OTHER",
        ageYears: 5,
        weightKg: 20,
      });

      expect(res.tmbSchofield).toBeNull();
      expect(res.hollidaySegarKcal).toBe(1500);
      expect(res.growthCostPercent).toBe(0);
      expect(res.growthCostKcal).toBe(0);
      expect(res.totalKcal).toBe(1500);
    });
  });

  describe("calculatePediatricEnergyRequirement — objetivo y déficit", () => {
    // Mismo fixture del caso base: varón 5 años, 20 kg, FA 1.4
    // TMB Schofield = 949, RCT = 1355.17
    const base = {
      gender: "MALE" as const,
      ageYears: 5,
      weightKg: 20,
      activityFactor: 1.4,
    };

    it("MAINTAIN (default) → targetKcal = totalKcal y macros sin cambios", () => {
      const res = calculatePediatricEnergyRequirement(base);

      expect(res.targetKcal).toBe(1355.17);
      expect(res.macronutrients.carbohydrates.kcal).toBe(745.34);
      expect(res.macronutrients.carbohydrates.grams).toBe(186.34);
    });

    it("LOSE_WEIGHT 10% → déficit sobre el RCT y macros calculados sobre la meta", () => {
      // 1355.17 × 0.9 = 1219.653 → 1219.65 (piso 949 × 0.9 = 854.1, no liga)
      const res = calculatePediatricEnergyRequirement({
        ...base,
        goal: "LOSE_WEIGHT",
        deficitPct: 0.1,
      });

      expect(res.totalKcal).toBe(1355.17);
      expect(res.targetKcal).toBe(1219.65);
      expect(res.macronutrients.carbohydrates.kcal).toBe(670.81);
      expect(res.macronutrients.carbohydrates.grams).toBe(167.7);
      const macroSum =
        res.macronutrients.carbohydrates.kcal +
        res.macronutrients.proteins.kcal +
        res.macronutrients.fats.kcal;
      expect(macroSum).toBeCloseTo(res.targetKcal, 1);
    });

    it("LOSE_WEIGHT con déficit extremo → la meta nunca baja del 90% de la TMB", () => {
      // 1355.17 × 0.5 = 677.59 < piso 949 × 0.9 = 854.1
      const res = calculatePediatricEnergyRequirement({
        ...base,
        goal: "LOSE_WEIGHT",
        deficitPct: 0.5,
      });

      expect(res.targetKcal).toBe(854.1);
    });

    it("fallback Holliday-Segar (gender OTHER): el piso se toma sobre Holliday-Segar", () => {
      // 1500 × 0.85 = 1275 < piso 1500 × 0.9 = 1350
      const res = calculatePediatricEnergyRequirement({
        gender: "OTHER",
        ageYears: 5,
        weightKg: 20,
        goal: "LOSE_WEIGHT",
        deficitPct: 0.15,
      });

      expect(res.totalKcal).toBe(1500);
      expect(res.targetKcal).toBe(1350);
    });

    it("GAIN_MUSCLE → superávit de 300 kcal sobre el RCT", () => {
      const res = calculatePediatricEnergyRequirement({
        ...base,
        goal: "GAIN_MUSCLE",
      });

      expect(res.targetKcal).toBe(1655.17);
    });
  });
});