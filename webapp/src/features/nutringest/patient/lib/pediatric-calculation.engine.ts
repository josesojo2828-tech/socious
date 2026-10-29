/**
 * pediatric-calculation.engine.ts
 *
 * Motores puros de cálculo energético pediátrico.
 * Fórmulas verbatim de la literatura de referencia:
 *   - Schofield WN (1985) Am J Clin Nutr 41:1121-30; FAO/WHO/UNU (2004) TR35
 *   - Harris & Benedict (1919)
 *   - RCT = TMB × FA + C; costos de crecimiento FAO/WHO/UNU (2004)
 *
 * Redondeo round2 (toFixed(2)) como patrón del engine de calculadora.
 */

import { round2 } from "../../../calculadora/lib/sport-calculation.engine";

export { calculateMirwaldPhv } from "../../../calculadora/lib/mirwald.engine";

export type PediatricGender = "MALE" | "FEMALE" | "OTHER";

/**
 * Tasa metabólica basal por Schofield (6 ramas: sexo × rango de edad).
 *
 *   Varón 0-3a   TMB = 59.5P − 30
 *   Varón 3-10a  TMB = 22.7P + 495
 *   Varón 10-18a TMB = 17.5P + 651
 *   Mujer 0-3a   TMB = 58.3P − 31
 *   Mujer 3-10a  TMB = 22.5P + 499
 *   Mujer 10-18a TMB = 12.2P + 746
 *
 * gender=OTHER → null (el motor pediátrico no aplica).
 * Edad fuera del rango pediátrico (≥18 años o negativa) → null.
 */
export const calculateSchofieldTmb = (p: {
  gender: PediatricGender;
  ageYears: number;
  weightKg: number;
}): number | null => {
  const { gender, ageYears, weightKg } = p;

  if (gender === "OTHER" || ageYears < 0 || ageYears >= 18) return null;

  if (ageYears < 3) {
    return round2(gender === "MALE" ? 59.5 * weightKg - 30 : 58.3 * weightKg - 31);
  }

  if (ageYears < 10) {
    return round2(gender === "MALE" ? 22.7 * weightKg + 495 : 22.5 * weightKg + 499);
  }

  return round2(gender === "MALE" ? 17.5 * weightKg + 651 : 12.2 * weightKg + 746);
};

/**
 * Tasa metabólica basal por Harris-Benedict (mujer):
 *   TMB = 655 + 9.6×P + 1.8×T − 4.7×E (P=peso kg, T=talla cm, E=edad años)
 */
export const calculateHarrisBenedictWoman = (p: {
  weightKg: number;
  heightCm: number;
  ageYears: number;
}): number => {
  const { weightKg, heightCm, ageYears } = p;
  return round2(655 + 9.6 * weightKg + 1.8 * heightCm - 4.7 * ageYears);
};

/**
 * Requerimiento calórico total (RCT):
 *   RCT = TMB × FA + C  (FA = factor de actividad, C = costo de crecimiento)
 * C se expresa como porcentaje del gasto (TMB × FA), según la tabla de costo
 * energético del crecimiento (FAO/WHO/UNU 2004).
 */
export const calculateRct = (p: {
  tmb: number;
  activityFactor: number;
  growthCostPercent: number;
}): number => {
  const { tmb, activityFactor, growthCostPercent } = p;
  return round2(tmb * activityFactor * (1 + (growthCostPercent ?? 0)));
};

/**
 * Costo de crecimiento como porcentaje del gasto energético total
 * (FAO/WHO/UNU 2004; tabla de costo energético del crecimiento por edad).
 *   <3m: 35 %, 4-6m: 7 %, 6-12m: 3 %, 12-24m: 2 %, 2-10a: 2 %, pubertad (10-18a): 4 %
 * Edad expresada en años; la banda se deriva en meses.
 * Fuera del rango pediátrico (edad negativa o ≥18 años) → 0.
 */
export const getGrowthCostPercent = (ageYears: number): number => {
  if (!Number.isFinite(ageYears) || ageYears < 0 || ageYears >= 18) return 0;
  const months = ageYears * 12;
  if (months < 3) return 0.35;
  if (months < 6) return 0.07;
  if (months < 12) return 0.03;
  if (months < 24) return 0.02;
  if (ageYears < 10) return 0.02;
  return 0.04;
};

/** Factor de actividad pediátrico por nivel (rangos FAO/WHO/UNU 2004). */
export const PEDIATRIC_FA = {
  SEDENTARY: [1.2, 1.3],
  LOW: [1.4, 1.5],
  ACTIVE: [1.6, 1.7],
  VERY_ACTIVE: [1.8, 2.0],
} as const;

/** Punto medio de cada banda pediátrica, para usar en selectores de un solo valor. */
export const PEDIATRIC_FA_MIDPOINT = {
  SEDENTARY: 1.25,
  LOW: 1.45,
  ACTIVE: 1.65,
  VERY_ACTIVE: 1.9,
} as const;

/** Opciones de actividad pediátrica para la UI (valor único dentro de la banda FAO). */
export const PEDIATRIC_ACTIVITY_OPTIONS = [
  { level: "SEDENTARY", value: PEDIATRIC_FA_MIDPOINT.SEDENTARY, label: "1.25 — Sedentario (1.2-1.3)" },
  { level: "LOW", value: PEDIATRIC_FA_MIDPOINT.LOW, label: "1.45 — Poco activo (1.4-1.5)" },
  { level: "ACTIVE", value: PEDIATRIC_FA_MIDPOINT.ACTIVE, label: "1.65 — Activo (1.6-1.7)" },
  { level: "VERY_ACTIVE", value: PEDIATRIC_FA_MIDPOINT.VERY_ACTIVE, label: "1.90 — Muy activo (1.8-2.0)" },
] as const;

/**
 * Nivel de actividad de la calculadora de adultos traducido al factor
 * pediátrico equivalente (bandas FAO/OMS/UNU 2004). Lo usan las dos
 * calculadoras cuando la edad es menor de 18 años, para que el selector de
 * niveles no aplique factores de adulto a un niño.
 */
export const PEDIATRIC_ACTIVITY_FACTORS = {
  SEDENTARY: 1.25,
  LIGHT: 1.45,
  MODERATE: 1.65,
  ACTIVE: 1.9,
  VERY_ACTIVE: 2.0,
} as const;

/**
 * Estimación del gasto energético basal/diario mediante regla de Holliday-Segar (kcal/día por peso):
 *   - Primeros 10 kg: 100 kcal/kg
 *   - Siguientes 10 kg (11-20 kg): +50 kcal/kg (1000 + (peso - 10) * 50)
 *   - Por encima de 20 kg: +20 kcal/kg (1500 + (peso - 20) * 20)
 */
export const calculateHollidaySegar = (weightKg: number): number => {
  if (!weightKg || weightKg <= 0) return 0;
  if (weightKg <= 10) {
    return round2(weightKg * 100);
  }
  if (weightKg <= 20) {
    return round2(1000 + (weightKg - 10) * 50);
  }
  return round2(1500 + (weightKg - 20) * 20);
};

export interface PediatricEnergyInput {
  gender: PediatricGender;
  ageYears: number;
  weightKg: number;
  activityFactor?: number;
  /** Objetivo nutricional. Default "MAINTAIN" (mantenimiento = RCT). */
  goal?: PediatricGoal;
  /** Fracción de déficit sobre el RCT cuando goal = "LOSE_WEIGHT" (default 0.1). */
  deficitPct?: number;
}

/**
 * Objetivo nutricional pediátrico — misma semántica que la calculadora de
 * adultos (PatientTab): perder peso, mantener o ganar músculo.
 */
export type PediatricGoal = "LOSE_WEIGHT" | "MAINTAIN" | "GAIN_MUSCLE";

export interface PediatricMacronutrientItem {
  percentage: number;
  kcal: number;
  grams: number;
}

export interface PediatricEnergyRequirementResult {
  tmbSchofield: number | null;
  hollidaySegarKcal: number;
  growthCostPercent: number;
  growthCostKcal: number;
  /** Mantenimiento (RCT): TMB × FA + costo de crecimiento, sin objetivo. */
  totalKcal: number;
  /** Meta calórica según el objetivo aplicado sobre el RCT. */
  targetKcal: number;
  macronutrients: {
    carbohydrates: PediatricMacronutrientItem;
    proteins: PediatricMacronutrientItem;
    fats: PediatricMacronutrientItem;
  };
}

/**
 * Cálculo unificado de requerimiento energético pediátrico.
 * Integra TMB Schofield, Holliday-Segar, costo diario de crecimiento y
 * distribución de macronutrientes pediátrica recomendada (CHOs 55%, PRO 15%, FAT 30%).
 */
export const calculatePediatricEnergyRequirement = (
  p: PediatricEnergyInput
): PediatricEnergyRequirementResult => {
  const {
    gender,
    ageYears,
    weightKg,
    activityFactor = PEDIATRIC_FA_MIDPOINT.ACTIVE,
    goal = "MAINTAIN",
    deficitPct = 0.1,
  } = p;
  const tmbSchofield = calculateSchofieldTmb({ gender, ageYears, weightKg });
  const hollidaySegarKcal = calculateHollidaySegar(weightKg);

  // El costo de crecimiento solo aplica cuando hay TMB pediátrica; con el
  // fallback de Holliday-Segar (gender OTHER) no hay banda etaria que aplicar.
  const growthCostPercent = tmbSchofield !== null ? getGrowthCostPercent(ageYears) : 0;
  const baseKcal =
    tmbSchofield !== null
      ? tmbSchofield * activityFactor
      : hollidaySegarKcal;
  const growthCostKcal = round2(baseKcal * growthCostPercent);
  const totalKcal = round2(baseKcal + growthCostKcal);

  // Meta calórica según objetivo (misma semántica que PatientTab, adultos):
  //   - LOSE_WEIGHT: déficit sobre el RCT con piso de seguridad en el 90 %
  //     de la TMB (Schofield; Holliday-Segar como fallback), para no pisar
  //     el metabolismo basal en un niño en crecimiento.
  //   - GAIN_MUSCLE: superávit de 300 kcal.
  //   - MAINTAIN: el propio RCT.
  // Con género OTHER no hay TMB, así que el piso se toma sobre Holliday-Segar.
  const basalFloor = round2((tmbSchofield ?? hollidaySegarKcal) * 0.9);
  let targetKcal = totalKcal;
  if (goal === "LOSE_WEIGHT") {
    targetKcal = round2(Math.max(basalFloor, totalKcal * (1 - deficitPct)));
  } else if (goal === "GAIN_MUSCLE") {
    targetKcal = round2(totalKcal + 300);
  }

  // Los macros se calculan sobre la meta (targetKcal), no sobre el
  // mantenimiento: son las calorías que el paciente va a consumir.
  const choKcal = round2(targetKcal * 0.55);
  const proKcal = round2(targetKcal * 0.15);
  const fatKcal = round2(targetKcal * 0.3);

  return {
    tmbSchofield,
    hollidaySegarKcal,
    growthCostPercent,
    growthCostKcal,
    totalKcal,
    targetKcal,
    macronutrients: {
      carbohydrates: {
        percentage: 55,
        kcal: choKcal,
        grams: round2(choKcal / 4),
      },
      proteins: {
        percentage: 15,
        kcal: proKcal,
        grams: round2(proKcal / 4),
      },
      fats: {
        percentage: 30,
        kcal: fatKcal,
        grams: round2(fatKcal / 9),
      },
    },
  };
};