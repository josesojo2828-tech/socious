/**
 * frisancho.engine.ts
 *
 * Motor antropométrico pediátrico de Frisancho (1981, 1990) y corrección ósea Heymsfield et al. (1982).
 *
 * Evaluación de composición corporal del miembro superior:
 * - Área Total del Brazo (TAA)
 * - Área Muscular del Brazo (AMA)
 * - Área Muscular Corregida libre de hueso (cAMA - Heymsfield: varones -10, mujeres -6.5)
 * - Área Grasa del Brazo (AFA)
 * - Índice de Grasa Braquial (AFI)
 * - Tablas de referencia percentilar NHANES I & II (1.0 a 18.0 años)
 * - Categorización clínica de reserva muscular y adiposa (<p5, p5-p15, p15-p85, p85-p95, >p95).
 */

import { round2 } from "../../../calculadora/lib/sport-calculation.engine";

export type PediatricGender = "MALE" | "FEMALE" | "OTHER";

export const FRISANCHO_AGE_BRACKETS = [
  "1.0-1.9",
  "2.0-2.9",
  "3.0-3.9",
  "4.0-4.9",
  "5.0-5.9",
  "6.0-6.9",
  "7.0-7.9",
  "8.0-8.9",
  "9.0-9.9",
  "10.0-10.9",
  "11.0-11.9",
  "12.0-12.9",
  "13.0-13.9",
  "14.0-14.9",
  "15.0-15.9",
  "16.0-16.9",
  "17.0-18.0",
] as const;

export type FrisanchoAgeBracket = (typeof FRISANCHO_AGE_BRACKETS)[number];

export type FrisanchoPercentileCategory = "<p5" | "p5-p15" | "p15-p85" | "p85-p95" | ">p95";

export type FrisanchoSeverity = "NORMAL" | "INFO" | "WARNING" | "ALERT" | "CRITICAL";

export interface FrisanchoPercentileRow {
  p5: number;
  p10: number;
  p15: number;
  p25: number;
  p50: number;
  p75: number;
  p85: number;
  p90: number;
  p95: number;
}

export interface FrisanchoMetricPercentiles {
  ageBracket: FrisanchoAgeBracket;
  gender: "MALE" | "FEMALE";
  tsf: FrisanchoPercentileRow;
  muac: FrisanchoPercentileRow;
  ama: FrisanchoPercentileRow;
  afa: FrisanchoPercentileRow;
}

export interface FrisanchoClinicalEvaluation {
  metric: "muscle" | "fat" | "circumference";
  value: number;
  category: FrisanchoPercentileCategory;
  severity: FrisanchoSeverity;
  classification: string;
  badgeColor: string;
  badgeBorder: string;
  recommendation?: string;
}

export interface FrisanchoCompositionResult {
  muacCm: number;
  tsfMm: number;
  taaCm2: number;
  amaCm2: number;
  camaCm2: number | null;
  afaCm2: number;
  afiPercent: number;
  isPediatricApplicable: boolean;
  ageBracket: FrisanchoAgeBracket | null;
  percentiles: FrisanchoMetricPercentiles | null;
  muscleEvaluation: FrisanchoClinicalEvaluation;
  fatEvaluation: FrisanchoClinicalEvaluation;
  clinicalAlert: "NORMAL" | "WARNING" | "CRITICAL";
  summary: string;
}

/**
 * Normaliza strings de sexo a 'MALE' | 'FEMALE' | 'OTHER'.
 */
export const normalizeGender = (gender?: string): PediatricGender => {
  if (!gender) return "OTHER";
  const g = gender.toUpperCase().trim();
  if (g === "MALE" || g === "VARON" || g === "MASCULINO" || g === "M") return "MALE";
  if (g === "FEMALE" || g === "HEMBRA" || g === "FEMENINO" || g === "F") return "FEMALE";
  return "OTHER";
};

/**
 * Calcula el Área Total del Brazo (TAA) en cm^2:
 *   TAA = C^2 / (4 * pi)
 * donde C es el perímetro braquial (MUAC) en cm.
 */
export const calculateTotalArmArea = (muacCm: number): number | null => {
  if (!muacCm || muacCm <= 0) return null;
  const area = (muacCm * muacCm) / (4 * Math.PI);
  return round2(area);
};

/**
 * Calcula el Área Muscular del Brazo (AMA no corregida) en cm^2:
 *   AMA = (C - pi * T / 10)^2 / (4 * pi)
 * donde C es el MUAC en cm y T es el pliegue tricipital (TSF) en mm.
 * T / 10 convierte mm a cm.
 */
export const calculateArmMuscleArea = (muacCm: number, tsfMm: number): number | null => {
  if (!muacCm || muacCm <= 0 || tsfMm === null || tsfMm === undefined || tsfMm < 0) {
    return null;
  }
  const skinfoldCm = (Math.PI * tsfMm) / 10;
  const correctedCircumference = muacCm - skinfoldCm;
  if (correctedCircumference <= 0) {
    return null;
  }
  const ama = (correctedCircumference * correctedCircumference) / (4 * Math.PI);
  return round2(ama);
};

/**
 * Calcula el Área Muscular del Brazo Corregida (cAMA) libre de hueso (Heymsfield et al. 1982):
 *   Varones: cAMA = AMA - 10 (cm^2)
 *   Mujeres: cAMA = AMA - 6.5 (cm^2)
 * Si el resultado es negativo, se acota a 0.
 * Para género 'OTHER', devuelve null (no existe estándar de corrección ósea).
 */
export const calculateCorrectedArmMuscleArea = (
  ama: number,
  gender: PediatricGender,
): number | null => {
  if (ama === null || ama === undefined || ama < 0) return null;
  if (gender === "MALE") {
    return round2(Math.max(0, ama - 10));
  }
  if (gender === "FEMALE") {
    return round2(Math.max(0, ama - 6.5));
  }
  return null;
};

/**
 * Calcula el Área Grasa del Brazo (AFA) en cm^2:
 *   AFA = TAA - AMA
 */
export const calculateArmFatArea = (taa: number, ama: number): number | null => {
  if (taa === null || taa === undefined || taa <= 0 || ama === null || ama === undefined || ama < 0) {
    return null;
  }
  const afa = Math.max(0, taa - ama);
  return round2(afa);
};

/**
 * Calcula el Índice de Grasa Braquial (AFI) en %:
 *   AFI = (AFA / TAA) * 100
 */
export const calculateArmFatIndex = (afa: number, taa: number): number | null => {
  if (afa === null || afa === undefined || afa < 0 || !taa || taa <= 0) {
    return null;
  }
  const afi = (afa / taa) * 100;
  return round2(afi);
};

/**
 * Determina el rango de edad Frisancho aplicable (1.0 a 18.0 años).
 * Fuera de rango pediátrico (< 1.0 o > 18.0) devuelve null.
 */
export const getFrisanchoAgeBracket = (ageYears: number): FrisanchoAgeBracket | null => {
  if (ageYears === null || ageYears === undefined || ageYears < 1.0 || ageYears > 18.0) {
    return null;
  }

  const floorAge = Math.floor(ageYears);
  if (floorAge >= 17) {
    return "17.0-18.0";
  }

  const bracket = `${floorAge}.0-${floorAge}.9` as FrisanchoAgeBracket;
  return FRISANCHO_AGE_BRACKETS.includes(bracket) ? bracket : null;
};

/**
 * Tablas de referencia Frisancho (1981, 1990) NHANES I & II para población pediátrica (1 a 18 años).
 */
export const FRISANCHO_REFERENCE_TABLES: Record<
  "MALE" | "FEMALE",
  Record<
    FrisanchoAgeBracket,
    {
      tsf: FrisanchoPercentileRow;
      muac: FrisanchoPercentileRow;
      ama: FrisanchoPercentileRow;
      afa: FrisanchoPercentileRow;
    }
  >
> = {
  MALE: {
    "1.0-1.9": {
      tsf: { p5: 6.5, p10: 7.0, p15: 7.5, p25: 8.0, p50: 10.0, p75: 12.0, p85: 13.0, p90: 14.0, p95: 15.5 },
      muac: { p5: 14.2, p10: 14.6, p15: 14.8, p25: 15.0, p50: 15.9, p75: 17.0, p85: 17.3, p90: 17.6, p95: 18.3 },
      ama: { p5: 9.7, p10: 10.4, p15: 10.8, p25: 11.6, p50: 13.0, p75: 14.6, p85: 15.4, p90: 16.3, p95: 17.2 },
      afa: { p5: 4.5, p10: 5.1, p15: 5.4, p25: 6.0, p50: 7.4, p75: 9.1, p85: 10.1, p90: 10.8, p95: 12.2 },
    },
    "2.0-2.9": {
      tsf: { p5: 6.0, p10: 6.5, p15: 7.0, p25: 8.0, p50: 10.0, p75: 12.0, p85: 13.0, p90: 14.0, p95: 15.0 },
      muac: { p5: 14.1, p10: 14.5, p15: 14.8, p25: 15.3, p50: 16.2, p75: 17.0, p85: 17.5, p90: 17.8, p95: 18.5 },
      ama: { p5: 10.1, p10: 10.9, p15: 11.4, p25: 12.3, p50: 13.9, p75: 15.6, p85: 16.5, p90: 17.4, p95: 18.4 },
      afa: { p5: 4.1, p10: 4.8, p15: 5.1, p25: 5.8, p50: 7.2, p75: 8.8, p85: 9.7, p90: 10.5, p95: 11.9 },
    },
    "3.0-3.9": {
      tsf: { p5: 6.0, p10: 6.5, p15: 7.0, p25: 8.0, p50: 9.5, p75: 12.0, p85: 13.0, p90: 14.0, p95: 15.0 },
      muac: { p5: 15.0, p10: 15.3, p15: 15.6, p25: 16.0, p50: 16.7, p75: 17.5, p85: 18.0, p90: 18.4, p95: 19.0 },
      ama: { p5: 10.1, p10: 11.3, p15: 12.1, p25: 13.2, p50: 15.0, p75: 16.9, p85: 17.8, p90: 18.5, p95: 19.2 },
      afa: { p5: 4.3, p10: 4.9, p15: 5.3, p25: 6.0, p50: 7.3, p75: 9.0, p85: 10.0, p90: 10.8, p95: 12.2 },
    },
    "4.0-4.9": {
      tsf: { p5: 5.5, p10: 6.0, p15: 6.5, p25: 7.5, p50: 9.0, p75: 11.5, p85: 12.5, p90: 13.5, p95: 14.0 },
      muac: { p5: 15.1, p10: 15.5, p15: 15.8, p25: 16.3, p50: 17.1, p75: 18.0, p85: 18.6, p90: 19.0, p95: 19.7 },
      ama: { p5: 10.4, p10: 11.7, p15: 12.5, p25: 13.7, p50: 15.2, p75: 17.3, p85: 18.5, p90: 19.3, p95: 20.1 },
      afa: { p5: 4.0, p10: 4.7, p15: 5.1, p25: 5.8, p50: 7.1, p75: 8.8, p85: 9.8, p90: 10.7, p95: 12.1 },
    },
    "5.0-5.9": {
      tsf: { p5: 5.0, p10: 5.5, p15: 6.0, p25: 7.0, p50: 8.0, p75: 11.0, p85: 12.0, p90: 13.0, p95: 14.5 },
      muac: { p5: 15.4, p10: 15.9, p15: 16.2, p25: 16.8, p50: 17.5, p75: 18.6, p85: 19.3, p90: 19.8, p95: 20.8 },
      ama: { p5: 11.3, p10: 12.3, p15: 13.0, p25: 14.4, p50: 16.2, p75: 18.3, p85: 19.6, p90: 20.4, p95: 21.4 },
      afa: { p5: 3.9, p10: 4.5, p15: 4.9, p25: 5.6, p50: 6.9, p75: 8.9, p85: 10.0, p90: 11.0, p95: 12.8 },
    },
    "6.0-6.9": {
      tsf: { p5: 5.0, p10: 5.5, p15: 6.0, p25: 6.5, p50: 8.0, p75: 10.0, p85: 12.0, p90: 13.0, p95: 16.0 },
      muac: { p5: 15.7, p10: 16.2, p15: 16.6, p25: 17.2, p50: 18.0, p75: 19.3, p85: 20.1, p90: 20.9, p95: 22.4 },
      ama: { p5: 11.2, p10: 12.6, p15: 13.4, p25: 14.9, p50: 16.9, p75: 19.3, p85: 20.7, p90: 21.8, p95: 23.0 },
      afa: { p5: 3.9, p10: 4.5, p15: 5.0, p25: 5.7, p50: 7.1, p75: 9.3, p85: 10.7, p90: 11.8, p95: 14.3 },
    },
    "7.0-7.9": {
      tsf: { p5: 5.0, p10: 5.5, p15: 6.0, p25: 7.0, p50: 8.5, p75: 11.5, p85: 13.0, p90: 14.5, p95: 17.0 },
      muac: { p5: 16.2, p10: 16.8, p15: 17.2, p25: 17.9, p50: 18.8, p75: 20.2, p85: 21.2, p90: 22.1, p95: 23.9 },
      ama: { p5: 12.1, p10: 13.3, p15: 14.1, p25: 15.8, p50: 18.0, p75: 20.5, p85: 22.0, p90: 23.1, p95: 24.3 },
      afa: { p5: 4.0, p10: 4.7, p15: 5.3, p25: 6.2, p50: 8.0, p75: 10.6, p85: 12.5, p90: 13.9, p95: 17.2 },
    },
    "8.0-8.9": {
      tsf: { p5: 5.0, p10: 5.5, p15: 6.0, p25: 7.0, p50: 8.5, p75: 12.0, p85: 14.5, p90: 16.0, p95: 19.5 },
      muac: { p5: 16.8, p10: 17.3, p15: 17.8, p25: 18.6, p50: 19.7, p75: 21.3, p85: 22.5, p90: 23.6, p95: 25.5 },
      ama: { p5: 12.5, p10: 14.0, p15: 14.8, p25: 16.5, p50: 18.9, p75: 21.6, p85: 23.0, p90: 24.0, p95: 25.1 },
      afa: { p5: 4.2, p10: 5.0, p15: 5.7, p25: 6.7, p50: 8.8, p75: 12.2, p85: 14.7, p90: 16.5, p95: 20.8 },
    },
    "9.0-9.9": {
      tsf: { p5: 5.0, p10: 6.0, p15: 6.5, p25: 7.5, p50: 9.5, p75: 13.5, p85: 16.5, p90: 18.5, p95: 22.0 },
      muac: { p5: 17.6, p10: 18.2, p15: 18.7, p25: 19.6, p50: 20.8, p75: 22.6, p85: 24.1, p90: 25.2, p95: 27.4 },
      ama: { p5: 13.5, p10: 14.9, p15: 15.8, p25: 17.6, p50: 20.3, p75: 23.2, p85: 24.8, p90: 25.9, p95: 27.0 },
      afa: { p5: 4.5, p10: 5.4, p15: 6.3, p25: 7.6, p50: 10.2, p75: 14.3, p85: 17.5, p90: 19.8, p95: 25.2 },
    },
    "10.0-10.9": {
      tsf: { p5: 5.0, p10: 6.0, p15: 6.5, p25: 7.5, p50: 10.0, p75: 14.0, p85: 17.5, p90: 20.0, p95: 24.0 },
      muac: { p5: 18.2, p10: 18.9, p15: 19.5, p25: 20.5, p50: 21.9, p75: 24.0, p85: 25.6, p90: 27.0, p95: 29.4 },
      ama: { p5: 14.1, p10: 15.7, p15: 16.8, p25: 18.7, p50: 21.6, p75: 24.7, p85: 26.4, p90: 27.4, p95: 28.5 },
      afa: { p5: 4.8, p10: 5.8, p15: 6.8, p25: 8.2, p50: 11.2, p75: 16.0, p85: 19.8, p90: 22.5, p95: 28.8 },
    },
    "11.0-11.9": {
      tsf: { p5: 5.0, p10: 5.5, p15: 6.5, p25: 7.5, p50: 10.5, p75: 15.0, p85: 18.5, p90: 21.5, p95: 25.5 },
      muac: { p5: 18.7, p10: 19.5, p15: 20.1, p25: 21.2, p50: 22.8, p75: 25.1, p85: 26.8, p90: 28.3, p95: 30.7 },
      ama: { p5: 14.4, p10: 16.2, p15: 17.3, p25: 19.2, p50: 22.1, p75: 25.8, p85: 27.6, p90: 28.9, p95: 30.2 },
      afa: { p5: 5.0, p10: 6.0, p15: 7.1, p25: 8.7, p50: 12.1, p75: 17.5, p85: 21.8, p90: 24.9, p95: 31.8 },
    },
    "12.0-12.9": {
      tsf: { p5: 5.0, p10: 5.5, p15: 6.0, p25: 7.0, p50: 10.0, p75: 14.5, p85: 18.5, p90: 21.5, p95: 26.0 },
      muac: { p5: 19.4, p10: 20.3, p15: 21.0, p25: 22.1, p50: 23.9, p75: 26.4, p85: 28.2, p90: 29.7, p95: 32.2 },
      ama: { p5: 15.2, p10: 17.1, p15: 18.2, p25: 20.3, p50: 23.4, p75: 27.3, p85: 29.3, p90: 30.5, p95: 31.9 },
      afa: { p5: 5.2, p10: 6.2, p15: 7.2, p25: 8.7, p50: 12.3, p75: 18.0, p85: 22.6, p90: 25.8, p95: 33.1 },
    },
    "13.0-13.9": {
      tsf: { p5: 5.0, p10: 5.5, p15: 6.0, p25: 6.5, p50: 9.0, p75: 13.5, p85: 17.5, p90: 20.5, p95: 25.0 },
      muac: { p5: 20.4, p10: 21.3, p15: 22.0, p25: 23.3, p50: 25.2, p75: 27.8, p85: 29.7, p90: 31.1, p95: 33.7 },
      ama: { p5: 16.0, p10: 18.0, p15: 19.3, p25: 21.6, p50: 25.0, p75: 29.2, p85: 31.1, p90: 32.3, p95: 33.5 },
      afa: { p5: 5.4, p10: 6.4, p15: 7.4, p25: 8.7, p50: 12.0, p75: 17.6, p85: 22.3, p90: 25.6, p95: 32.8 },
    },
    "14.0-14.9": {
      tsf: { p5: 4.5, p10: 5.0, p15: 5.5, p25: 6.0, p50: 8.0, p75: 12.5, p85: 16.5, p90: 19.5, p95: 24.0 },
      muac: { p5: 21.7, p10: 22.7, p15: 23.5, p25: 24.8, p50: 26.8, p75: 29.5, p85: 31.4, p90: 32.8, p95: 35.3 },
      ama: { p5: 17.8, p10: 20.0, p15: 21.4, p25: 24.0, p50: 28.0, p75: 32.5, p85: 34.6, p90: 35.8, p95: 37.0 },
      afa: { p5: 5.2, p10: 6.2, p15: 7.1, p25: 8.4, p50: 11.5, p75: 16.9, p85: 21.4, p90: 24.6, p95: 31.6 },
    },
    "15.0-15.9": {
      tsf: { p5: 5.0, p10: 5.0, p15: 5.5, p25: 6.0, p50: 7.5, p75: 11.0, p85: 14.5, p90: 18.0, p95: 23.5 },
      muac: { p5: 23.0, p10: 24.0, p15: 24.8, p25: 26.1, p50: 28.2, p75: 30.9, p85: 32.7, p90: 34.0, p95: 36.5 },
      ama: { p5: 19.0, p10: 21.5, p15: 23.0, p25: 25.8, p50: 30.1, p75: 34.8, p85: 36.9, p90: 38.0, p95: 39.2 },
      afa: { p5: 5.5, p10: 6.3, p15: 7.2, p25: 8.4, p50: 11.2, p75: 16.2, p85: 20.4, p90: 23.4, p95: 30.2 },
    },
    "16.0-16.9": {
      tsf: { p5: 4.5, p10: 5.0, p15: 5.5, p25: 6.0, p50: 7.0, p75: 11.0, p85: 14.0, p90: 17.0, p95: 21.0 },
      muac: { p5: 24.3, p10: 25.3, p15: 26.1, p25: 27.4, p50: 29.5, p75: 32.2, p85: 33.9, p90: 35.2, p95: 37.6 },
      ama: { p5: 21.3, p10: 23.8, p15: 25.4, p25: 28.5, p50: 33.5, p75: 38.8, p85: 41.2, p90: 42.8, p95: 45.0 },
      afa: { p5: 5.4, p10: 6.2, p15: 7.1, p25: 8.2, p50: 10.7, p75: 15.6, p85: 19.7, p90: 22.5, p95: 28.9 },
    },
    "17.0-18.0": {
      tsf: { p5: 4.0, p10: 5.0, p15: 5.5, p25: 6.0, p50: 7.0, p75: 11.0, p85: 13.5, p90: 16.0, p95: 19.5 },
      muac: { p5: 25.2, p10: 26.2, p15: 27.0, p25: 28.3, p50: 30.4, p75: 33.0, p85: 34.7, p90: 35.9, p95: 38.3 },
      ama: { p5: 22.4, p10: 25.0, p15: 26.8, p25: 30.0, p50: 35.2, p75: 41.0, p85: 43.5, p90: 45.2, p95: 47.5 },
      afa: { p5: 5.0, p10: 6.0, p15: 7.0, p25: 8.1, p50: 10.6, p75: 15.4, p85: 19.4, p90: 22.1, p95: 28.4 },
    },
  },
  FEMALE: {
    "1.0-1.9": {
      tsf: { p5: 6.0, p10: 7.0, p15: 7.5, p25: 8.5, p50: 10.0, p75: 12.0, p85: 13.5, p90: 14.5, p95: 16.0 },
      muac: { p5: 13.8, p10: 14.2, p15: 14.5, p25: 14.8, p50: 15.6, p75: 16.5, p85: 17.0, p90: 17.3, p95: 18.0 },
      ama: { p5: 8.9, p10: 9.7, p15: 10.1, p25: 10.8, p50: 12.3, p75: 13.8, p85: 14.6, p90: 15.3, p95: 16.2 },
      afa: { p5: 4.1, p10: 4.8, p15: 5.2, p25: 5.9, p50: 7.2, p75: 8.7, p85: 9.7, p90: 10.4, p95: 11.8 },
    },
    "2.0-2.9": {
      tsf: { p5: 6.0, p10: 7.0, p15: 7.5, p25: 8.5, p50: 10.0, p75: 12.0, p85: 13.5, p90: 14.5, p95: 16.0 },
      muac: { p5: 14.0, p10: 14.4, p15: 14.7, p25: 15.1, p50: 16.0, p75: 16.9, p85: 17.4, p90: 17.8, p95: 18.4 },
      ama: { p5: 10.1, p10: 10.8, p15: 11.2, p25: 11.9, p50: 13.2, p75: 14.8, p85: 15.6, p90: 16.4, p95: 17.3 },
      afa: { p5: 4.2, p10: 4.9, p15: 5.3, p25: 6.0, p50: 7.3, p75: 8.8, p85: 9.8, p90: 10.5, p95: 11.9 },
    },
    "3.0-3.9": {
      tsf: { p5: 6.0, p10: 7.0, p15: 7.5, p25: 8.5, p50: 10.0, p75: 12.0, p85: 13.5, p90: 14.5, p95: 16.0 },
      muac: { p5: 14.5, p10: 14.9, p15: 15.3, p25: 15.8, p50: 16.6, p75: 17.5, p85: 18.0, p90: 18.4, p95: 19.1 },
      ama: { p5: 10.2, p10: 11.0, p15: 11.4, p25: 12.2, p50: 13.5, p75: 15.0, p85: 15.9, p90: 16.7, p95: 17.6 },
      afa: { p5: 4.4, p10: 5.1, p15: 5.5, p25: 6.3, p50: 7.6, p75: 9.2, p85: 10.2, p90: 11.0, p95: 12.4 },
    },
    "4.0-4.9": {
      tsf: { p5: 6.0, p10: 6.5, p15: 7.0, p25: 8.0, p50: 10.0, p75: 12.0, p85: 13.5, p90: 14.5, p95: 15.5 },
      muac: { p5: 14.8, p10: 15.3, p15: 15.7, p25: 16.2, p50: 17.0, p75: 18.0, p85: 18.6, p90: 19.1, p95: 19.9 },
      ama: { p5: 10.4, p10: 11.3, p15: 11.8, p25: 12.6, p50: 14.0, p75: 15.5, p85: 16.4, p90: 17.2, p95: 18.2 },
      afa: { p5: 4.5, p10: 5.2, p15: 5.6, p25: 6.4, p50: 7.8, p75: 9.5, p85: 10.6, p90: 11.4, p95: 12.9 },
    },
    "5.0-5.9": {
      tsf: { p5: 5.5, p10: 6.5, p15: 7.0, p25: 8.0, p50: 10.0, p75: 12.5, p85: 14.0, p90: 15.5, p95: 17.0 },
      muac: { p5: 15.2, p10: 15.7, p15: 16.1, p25: 16.7, p50: 17.5, p75: 18.7, p85: 19.4, p90: 20.0, p95: 21.0 },
      ama: { p5: 11.3, p10: 12.0, p15: 12.5, p25: 13.3, p50: 14.7, p75: 16.3, p85: 17.2, p90: 18.0, p95: 19.0 },
      afa: { p5: 4.4, p10: 5.2, p15: 5.7, p25: 6.6, p50: 8.2, p75: 10.2, p85: 11.5, p90: 12.5, p95: 14.3 },
    },
    "6.0-6.9": {
      tsf: { p5: 5.5, p10: 6.5, p15: 7.0, p25: 8.0, p50: 10.0, p75: 12.5, p85: 14.5, p90: 16.0, p95: 18.0 },
      muac: { p5: 15.5, p10: 16.1, p15: 16.5, p25: 17.2, p50: 18.1, p75: 19.5, p85: 20.3, p90: 21.1, p95: 22.5 },
      ama: { p5: 11.2, p10: 12.2, p15: 12.8, p25: 13.7, p50: 15.1, p75: 16.8, p85: 17.7, p90: 18.5, p95: 19.5 },
      afa: { p5: 4.6, p10: 5.5, p15: 6.0, p25: 7.0, p50: 8.8, p75: 11.2, p85: 12.8, p90: 14.0, p95: 16.2 },
    },
    "7.0-7.9": {
      tsf: { p5: 6.0, p10: 7.0, p15: 7.5, p25: 8.5, p50: 11.0, p75: 14.0, p85: 16.0, p90: 17.5, p95: 20.0 },
      muac: { p5: 16.1, p10: 16.7, p15: 17.2, p25: 18.0, p50: 19.1, p75: 20.6, p85: 21.7, p90: 22.6, p95: 24.3 },
      ama: { p5: 12.1, p10: 13.0, p15: 13.6, p25: 14.5, p50: 16.0, p75: 17.9, p85: 18.9, p90: 19.8, p95: 21.0 },
      afa: { p5: 5.1, p10: 6.0, p15: 6.6, p25: 7.8, p50: 9.9, p75: 12.8, p85: 14.8, p90: 16.3, p95: 19.1 },
    },
    "8.0-8.9": {
      tsf: { p5: 6.0, p10: 7.0, p15: 7.5, p25: 9.0, p50: 11.5, p75: 15.0, p85: 17.5, p90: 19.5, p95: 22.0 },
      muac: { p5: 16.6, p10: 17.3, p15: 17.9, p25: 18.8, p50: 20.0, p75: 21.8, p85: 23.0, p90: 24.1, p95: 26.1 },
      ama: { p5: 12.5, p10: 13.3, p15: 13.9, p25: 14.8, p50: 16.3, p75: 18.3, p85: 19.4, p90: 20.3, p95: 21.5 },
      afa: { p5: 5.3, p10: 6.3, p15: 7.0, p25: 8.4, p50: 10.8, p75: 14.3, p85: 16.7, p90: 18.5, p95: 21.9 },
    },
    "9.0-9.9": {
      tsf: { p5: 6.0, p10: 7.0, p15: 8.0, p25: 9.5, p50: 12.5, p75: 16.5, p85: 19.0, p90: 21.0, p95: 24.5 },
      muac: { p5: 17.3, p10: 18.1, p15: 18.7, p25: 19.7, p50: 21.1, p75: 23.1, p85: 24.5, p90: 25.7, p95: 28.0 },
      ama: { p5: 13.1, p10: 14.1, p15: 14.8, p25: 15.8, p50: 17.5, p75: 19.6, p85: 20.8, p90: 21.8, p95: 23.0 },
      afa: { p5: 5.7, p10: 6.8, p15: 7.6, p25: 9.2, p50: 12.1, p75: 16.2, p85: 19.1, p90: 21.3, p95: 25.6 },
    },
    "10.0-10.9": {
      tsf: { p5: 6.5, p10: 7.5, p15: 8.5, p25: 10.0, p50: 13.0, p75: 17.5, p85: 20.5, p90: 22.5, p95: 26.0 },
      muac: { p5: 18.0, p10: 18.9, p15: 19.6, p25: 20.7, p50: 22.3, p75: 24.6, p85: 26.2, p90: 27.5, p95: 30.1 },
      ama: { p5: 13.8, p10: 14.9, p15: 15.6, p25: 16.8, p50: 18.6, p75: 20.8, p85: 22.0, p90: 23.0, p95: 24.2 },
      afa: { p5: 6.3, p10: 7.5, p15: 8.4, p25: 10.3, p50: 13.6, p75: 18.3, p85: 21.7, p90: 24.3, p95: 29.2 },
    },
    "11.0-11.9": {
      tsf: { p5: 7.0, p10: 8.0, p15: 9.0, p25: 11.0, p50: 14.0, p75: 18.5, p85: 21.5, p90: 23.5, p95: 27.0 },
      muac: { p5: 18.6, p10: 19.6, p15: 20.4, p25: 21.6, p50: 23.4, p75: 26.0, p85: 27.7, p90: 29.1, p95: 31.8 },
      ama: { p5: 14.2, p10: 15.4, p15: 16.2, p25: 17.4, p50: 19.3, p75: 21.7, p85: 23.0, p90: 24.1, p95: 25.4 },
      afa: { p5: 6.9, p10: 8.2, p15: 9.2, p25: 11.3, p50: 15.0, p75: 20.1, p85: 23.8, p90: 26.6, p95: 31.9 },
    },
    "12.0-12.9": {
      tsf: { p5: 7.5, p10: 8.5, p15: 9.5, p25: 11.5, p50: 15.0, p75: 19.5, p85: 22.5, p90: 24.5, p95: 28.0 },
      muac: { p5: 19.5, p10: 20.6, p15: 21.4, p25: 22.7, p50: 24.7, p75: 27.4, p85: 29.2, p90: 30.6, p95: 33.3 },
      ama: { p5: 15.1, p10: 16.4, p15: 17.2, p25: 18.5, p50: 20.5, p75: 22.9, p85: 24.3, p90: 25.5, p95: 26.8 },
      afa: { p5: 7.7, p10: 9.1, p15: 10.2, p25: 12.4, p50: 16.4, p75: 21.8, p85: 25.7, p90: 28.6, p95: 34.2 },
    },
    "13.0-13.9": {
      tsf: { p5: 8.0, p10: 9.5, p15: 10.5, p25: 12.5, p50: 16.5, p75: 21.0, p85: 24.0, p90: 26.0, p95: 29.5 },
      muac: { p5: 20.5, p10: 21.7, p15: 22.5, p25: 23.8, p50: 25.8, p75: 28.6, p85: 30.4, p90: 31.8, p95: 34.5 },
      ama: { p5: 16.1, p10: 17.4, p15: 18.3, p25: 19.7, p50: 21.9, p75: 24.3, p85: 25.7, p90: 26.8, p95: 27.9 },
      afa: { p5: 8.6, p10: 10.2, p15: 11.4, p25: 13.7, p50: 18.1, p75: 23.7, p85: 27.8, p90: 30.8, p95: 36.7 },
    },
    "14.0-14.9": {
      tsf: { p5: 8.5, p10: 10.0, p15: 11.0, p25: 13.0, p50: 17.0, p75: 21.5, p85: 24.5, p90: 26.5, p95: 30.0 },
      muac: { p5: 21.4, p10: 22.6, p15: 23.4, p25: 24.7, p50: 26.7, p75: 29.4, p85: 31.2, p90: 32.5, p95: 35.1 },
      ama: { p5: 17.3, p10: 18.4, p15: 19.2, p25: 20.6, p50: 23.0, p75: 25.4, p85: 26.8, p90: 27.9, p95: 29.1 },
      afa: { p5: 9.3, p10: 11.0, p15: 12.2, p25: 14.6, p50: 19.1, p75: 24.7, p85: 28.8, p90: 31.8, p95: 37.7 },
    },
    "15.0-15.9": {
      tsf: { p5: 9.0, p10: 10.5, p15: 11.5, p25: 13.5, p50: 17.5, p75: 22.0, p85: 25.0, p90: 27.0, p95: 30.5 },
      muac: { p5: 22.0, p10: 23.1, p15: 23.9, p25: 25.2, p50: 27.2, p75: 29.8, p85: 31.5, p90: 32.8, p95: 35.3 },
      ama: { p5: 18.0, p10: 19.1, p15: 19.9, p25: 21.3, p50: 23.8, p75: 26.2, p85: 27.6, p90: 28.7, p95: 29.8 },
      afa: { p5: 9.9, p10: 11.6, p15: 12.8, p25: 15.2, p50: 19.8, p75: 25.4, p85: 29.5, p90: 32.5, p95: 38.3 },
    },
    "16.0-16.9": {
      tsf: { p5: 9.5, p10: 11.0, p15: 12.0, p25: 14.0, p50: 18.0, p75: 22.5, p85: 25.5, p90: 27.5, p95: 31.0 },
      muac: { p5: 22.4, p10: 23.4, p15: 24.2, p25: 25.5, p50: 27.5, p75: 30.1, p85: 31.8, p90: 33.0, p95: 35.5 },
      ama: { p5: 18.4, p10: 19.5, p15: 20.3, p25: 21.8, p50: 24.3, p75: 26.8, p85: 28.2, p90: 29.3, p95: 30.5 },
      afa: { p5: 10.3, p10: 12.0, p15: 13.2, p25: 15.6, p50: 20.3, p75: 25.9, p85: 30.0, p90: 33.0, p95: 38.8 },
    },
    "17.0-18.0": {
      tsf: { p5: 10.0, p10: 11.5, p15: 12.5, p25: 14.5, p50: 18.5, p75: 23.0, p85: 26.0, p90: 28.0, p95: 31.5 },
      muac: { p5: 22.7, p10: 23.7, p15: 24.4, p25: 25.7, p50: 27.7, p75: 30.3, p85: 32.0, p90: 33.2, p95: 35.7 },
      ama: { p5: 18.8, p10: 19.9, p15: 20.7, p25: 22.2, p50: 24.8, p75: 27.3, p85: 28.8, p90: 29.9, p95: 31.2 },
      afa: { p5: 10.7, p10: 12.4, p15: 13.6, p25: 16.0, p50: 20.7, p75: 26.3, p85: 30.4, p90: 33.4, p95: 39.2 },
    },
  },
};

/**
 * Consulta la tabla percentilar correspondiente a sexo y edad.
 */
export const getFrisanchoPercentiles = (params: {
  gender?: string;
  ageYears?: number;
}): FrisanchoMetricPercentiles | null => {
  const normGender = normalizeGender(params.gender);
  if (normGender === "OTHER" || params.ageYears === undefined || params.ageYears === null) {
    return null;
  }

  const ageBracket = getFrisanchoAgeBracket(params.ageYears);
  if (!ageBracket) return null;

  const tableData = FRISANCHO_REFERENCE_TABLES[normGender]?.[ageBracket];
  if (!tableData) return null;

  return {
    ageBracket,
    gender: normGender,
    tsf: tableData.tsf,
    muac: tableData.muac,
    ama: tableData.ama,
    afa: tableData.afa,
  };
};

/**
 * Clasifica la reserva muscular (AMA o cAMA o MUAC) según percentiles de Frisancho.
 */
export const classifyMuscleReserve = (
  value: number,
  row: FrisanchoPercentileRow,
): FrisanchoClinicalEvaluation => {
  if (value < row.p5) {
    return {
      metric: "muscle",
      value,
      category: "<p5",
      severity: "CRITICAL",
      classification: "Depleción severa de masa muscular (Masa magra crítica)",
      badgeColor: "bg-red-500/15 text-red-700 dark:text-red-400",
      badgeBorder: "border-red-500/30",
      recommendation:
        "Riesgo de malnutrición proteico-calórica severa. Evaluar ingesta proteica y soporte nutricional.",
    };
  }

  if (value < row.p15) {
    return {
      metric: "muscle",
      value,
      category: "p5-p15",
      severity: "WARNING",
      classification: "Depleción moderada de masa muscular (Bajo el promedio)",
      badgeColor: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
      badgeBorder: "border-amber-500/30",
      recommendation:
        "Reserva proteica somática disminuida. Monitorear velocidad de crecimiento y balance nitrogenado.",
    };
  }

  if (value <= row.p85) {
    return {
      metric: "muscle",
      value,
      category: "p15-p85",
      severity: "NORMAL",
      classification: "Masa muscular promedio (Adecuada para edad y sexo)",
      badgeColor: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
      badgeBorder: "border-emerald-500/30",
      recommendation: "Reserva muscular en rango normal de la población pediátrica de referencia.",
    };
  }

  if (value <= row.p95) {
    return {
      metric: "muscle",
      value,
      category: "p85-p95",
      severity: "NORMAL",
      classification: "Masa muscular sobre el promedio (Reserva proteica alta)",
      badgeColor: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
      badgeBorder: "border-blue-500/30",
      recommendation: "Adecuado desarrollo muscular. Buen estado nutricional somático.",
    };
  }

  return {
    metric: "muscle",
    value,
    category: ">p95",
    severity: "INFO",
    classification: "Hipertrofia muscular / Masa muscular muy desarrollada",
    badgeColor: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
    badgeBorder: "border-purple-500/30",
    recommendation: "Desarrollo muscular prominente, frecuente en niños con alta actividad física o deportiva.",
  };
};

/**
 * Clasifica la reserva grasa (TSF o AFA) según percentiles de Frisancho.
 */
export const classifyFatReserve = (
  value: number,
  row: FrisanchoPercentileRow,
): FrisanchoClinicalEvaluation => {
  if (value < row.p5) {
    return {
      metric: "fat",
      value,
      category: "<p5",
      severity: "CRITICAL",
      classification: "Depleción severa de reserva grasa (Grasa subcutánea muy baja)",
      badgeColor: "bg-red-500/15 text-red-700 dark:text-red-400",
      badgeBorder: "border-red-500/30",
      recommendation:
        "Depleción severa de depósitos energéticos. Riesgo de emaciación o déficit energético prolongado.",
    };
  }

  if (value < row.p15) {
    return {
      metric: "fat",
      value,
      category: "p5-p15",
      severity: "WARNING",
      classification: "Reserva grasa baja / bajo el promedio",
      badgeColor: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
      badgeBorder: "border-amber-500/30",
      recommendation: "Grasa subcutánea reducida. Monitorear aporte calórico total.",
    };
  }

  if (value <= row.p85) {
    return {
      metric: "fat",
      value,
      category: "p15-p85",
      severity: "NORMAL",
      classification: "Reserva grasa promedio / adecuada",
      badgeColor: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
      badgeBorder: "border-emerald-500/30",
      recommendation: "Depósitos calóricos subcutáneos en equilibrio normativo.",
    };
  }

  if (value <= row.p95) {
    return {
      metric: "fat",
      value,
      category: "p85-p95",
      severity: "WARNING",
      classification: "Sobrepeso / Riesgo de exceso de grasa",
      badgeColor: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
      badgeBorder: "border-amber-500/30",
      recommendation: "Adiposidad braquial sobre el percentil 85. Vigilar hábitos y calidad nutricional.",
    };
  }

  return {
    metric: "fat",
    value,
    category: ">p95",
    severity: "ALERT",
    classification: "Obesidad / Exceso severo de reserva grasa",
    badgeColor: "bg-red-500/15 text-red-700 dark:text-red-400",
    badgeBorder: "border-red-500/30",
    recommendation: "Adiposidad braquial por encima del percentil 95. Requiere intervención en estilo de vida y nutrición.",
  };
};

/**
 * Motor integral de evaluación de composición corporal Frisancho.
 */
export const calculateFrisanchoComposition = (params: {
  muacCm: number;
  tsfMm: number;
  gender?: string;
  ageYears?: number;
}): FrisanchoCompositionResult | null => {
  const { muacCm, tsfMm, gender, ageYears } = params;

  if (!muacCm || muacCm <= 0 || tsfMm === null || tsfMm === undefined || tsfMm < 0) {
    return null;
  }

  const taa = calculateTotalArmArea(muacCm);
  const ama = calculateArmMuscleArea(muacCm, tsfMm);

  if (taa === null || ama === null) {
    return null;
  }

  const normGender = normalizeGender(gender);
  const cama = calculateCorrectedArmMuscleArea(ama, normGender);
  const afa = calculateArmFatArea(taa, ama) ?? 0;
  const afi = calculateArmFatIndex(afa, taa) ?? 0;

  const age = ageYears ?? 0;
  const ageBracket = getFrisanchoAgeBracket(age);
  const percentiles = ageBracket && normGender !== "OTHER"
    ? getFrisanchoPercentiles({ gender: normGender, ageYears: age })
    : null;

  const isPediatricApplicable = Boolean(ageBracket && percentiles);

  let muscleEval: FrisanchoClinicalEvaluation;
  let fatEval: FrisanchoClinicalEvaluation;

  if (percentiles) {
    muscleEval = classifyMuscleReserve(ama, percentiles.ama);
    fatEval = classifyFatReserve(tsfMm, percentiles.tsf);
  } else {
    muscleEval = {
      metric: "muscle",
      value: ama,
      category: "p15-p85",
      severity: "NORMAL",
      classification: "Área muscular calculada (sin baremo de edad pediátrica disponible)",
      badgeColor: "bg-gray-500/15 text-gray-700 dark:text-gray-400",
      badgeBorder: "border-gray-500/30",
    };
    fatEval = {
      metric: "fat",
      value: tsfMm,
      category: "p15-p85",
      severity: "NORMAL",
      classification: "Área grasa calculada (sin baremo de edad pediátrica disponible)",
      badgeColor: "bg-gray-500/15 text-gray-700 dark:text-gray-400",
      badgeBorder: "border-gray-500/30",
    };
  }

  let clinicalAlert: "NORMAL" | "WARNING" | "CRITICAL" = "NORMAL";
  if (muscleEval.severity === "CRITICAL" || fatEval.severity === "CRITICAL") {
    clinicalAlert = "CRITICAL";
  } else if (
    muscleEval.severity === "WARNING" ||
    fatEval.severity === "WARNING" ||
    fatEval.severity === "ALERT"
  ) {
    clinicalAlert = "WARNING";
  }

  const summary = `Frisancho (${ageBracket ?? "s/b"}): Músculo ${muscleEval.classification} | Grasa ${fatEval.classification}. AFI: ${afi}%.`;

  return {
    muacCm,
    tsfMm,
    taaCm2: taa,
    amaCm2: ama,
    camaCm2: cama,
    afaCm2: afa,
    afiPercent: afi,
    isPediatricApplicable,
    ageBracket,
    percentiles,
    muscleEvaluation: muscleEval,
    fatEvaluation: fatEval,
    clinicalAlert,
    summary,
  };
};
