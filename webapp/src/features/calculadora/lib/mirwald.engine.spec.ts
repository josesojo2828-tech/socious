import { describe, expect, it } from "vitest";
import {
  calculateMirwaldPhv,
  isAgeInMirwaldRange,
  type PhvResult,
} from "./mirwald.engine";

const MALE_DESDE_FIXTURE = {
  gender: "MALE" as const,
  age: 13.5,
  weightKg: 74,
  heightCm: 160,
  sittingHeightCm: 90,
};

const FEMALE_HASTA_FIXTURE = {
  gender: "FEMALE" as const,
  age: 12,
  weightKg: 29.5,
  heightCm: 130,
  sittingHeightCm: 65,
};

describe("mirwald.engine", () => {
  describe("calculateMirwaldPhv — chico con valor positivo", () => {
    const result: PhvResult = calculateMirwaldPhv(MALE_DESDE_FIXTURE);

    it("devuelve +0.73 años con coeficiente masculino corregido (0.007216)", () => {
      expect(result.value).toBe(0.73);
      expect(result.maturityOffset).toBe(0.73);
    });

    it("calcula ageAtPhv = age - maturityOffset", () => {
      expect(result.ageAtPhv).toBe(12.77);
    });

    it("clasifica en ventana CIRCA_PHV con su etiqueta y recomendaciones", () => {
      expect(result.maturationStage).toBe("CIRCA_PHV");
      expect(result.maturationLabel).toBe("Ventana crítica de aceleración (Circa-PHV)");
      expect(result.clinicalRecommendations).toContain("Ventana crítica de máximo crecimiento lineal");
    });

    it("interpreta signo + como DESDE_PHV", () => {
      expect(result.sign).toBe(1);
      expect(result.label).toBe("DESDE_PHV");
    });

    it("está dentro del rango validado (13–15.6)", () => {
      expect(result.rangeValid).toBe(true);
    });
  });

  describe("calculateMirwaldPhv — chica con valor negativo", () => {
    const result: PhvResult = calculateMirwaldPhv(FEMALE_HASTA_FIXTURE);

    it("devuelve −1.5 años", () => {
      expect(result.value).toBe(-1.5);
      expect(result.maturityOffset).toBe(-1.5);
    });

    it("calcula ageAtPhv = 12 - (-1.5) = 13.5", () => {
      expect(result.ageAtPhv).toBe(13.5);
    });

    it("clasifica en etapa PRE_PHV", () => {
      expect(result.maturationStage).toBe("PRE_PHV");
      expect(result.maturationLabel).toBe("Pre-pico de crecimiento");
      expect(result.clinicalRecommendations).toContain("Fase formativa y de adquisición motora");
    });

    it("interpreta signo − como HASTA_PHV", () => {
      expect(result.sign).toBe(-1);
      expect(result.label).toBe("HASTA_PHV");
    });

    it("está dentro del rango validado (12–14.9)", () => {
      expect(result.rangeValid).toBe(true);
    });
  });

  describe("rangos etarios por género", () => {
    it("chicos: 13 a 15.6 inclusive", () => {
      expect(isAgeInMirwaldRange("MALE", 12)).toBe(false);
      expect(isAgeInMirwaldRange("MALE", 13)).toBe(true);
      expect(isAgeInMirwaldRange("MALE", 15.6)).toBe(true);
      expect(isAgeInMirwaldRange("MALE", 17)).toBe(false);
    });

    it("chicas: 12 a 14.9 inclusive", () => {
      expect(isAgeInMirwaldRange("FEMALE", 11)).toBe(false);
      expect(isAgeInMirwaldRange("FEMALE", 12)).toBe(true);
      expect(isAgeInMirwaldRange("FEMALE", 14.9)).toBe(true);
      expect(isAgeInMirwaldRange("FEMALE", 15)).toBe(false);
    });
  });

  describe("fuera de rango: advierte pero calcula igual", () => {
    it("chico de 17 calcula con rangeValid=false sin lanzar", () => {
      const result: PhvResult = calculateMirwaldPhv({
        ...MALE_DESDE_FIXTURE,
        age: 17,
      });
      expect(typeof result.value).toBe("number");
      expect(result.rangeValid).toBe(false);
    });

    it("chica de 15 calcula con rangeValid=false sin lanzar", () => {
      const result: PhvResult = calculateMirwaldPhv({
        ...FEMALE_HASTA_FIXTURE,
        age: 15,
      });
      expect(typeof result.value).toBe("number");
      expect(result.rangeValid).toBe(false);
    });
  });
});