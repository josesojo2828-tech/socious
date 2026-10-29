/**
 * mirwald.engine.ts
 *
 * Predicción del pico de velocidad de crecimiento (PHV) según Mirwald et al. (2002).
 * Fórmulas verbatim por género. LEI (longitud de extremidad inferior) se deriva
 * como talla − talla sentado (sin campo persistido nuevo).
 *
 * Nota de nomenclatura: en las fórmulas verbatim "MC" = masa corporal (peso, kg)
 * y "Peso" = peso (kg). El parámetro se expone como `weightKg`.
 */

import { round2 } from "./sport-calculation.engine";

export type MaturationStage = "PRE_PHV" | "CIRCA_PHV" | "POST_PHV";

export type PhvResult = {
  value: number;
  maturityOffset: number;
  ageAtPhv: number;
  maturationStage: MaturationStage;
  maturationLabel: string;
  clinicalRecommendations: string;
  sign: 1 | -1;
  label: "DESDE_PHV" | "HASTA_PHV";
  rangeValid: boolean;
};

/**
 * Rango etario validado por género (años):
 *   chicas 12–14.9, chicos 13–15.6.
 * Fuera de rango: el resultado se calcula igual pero `rangeValid` es false.
 */
export const isAgeInMirwaldRange = (gender: "MALE" | "FEMALE", age: number): boolean =>
  gender === "MALE" ? age >= 13 && age <= 15.6 : age >= 12 && age <= 14.9;

const getMaturationInfo = (offset: number) => {
  if (offset < -1.0) {
    return {
      maturationStage: "PRE_PHV" as MaturationStage,
      maturationLabel: "Pre-pico de crecimiento",
      clinicalRecommendations:
        "Fase formativa y de adquisición motora. Priorizar desarrollo de habilidades técnicas básicas, coordinación neuromuscular, flexibilidad y agilidad. Evitar sobrecargas de fuerza con altas cargas axiales o volúmenes extenuantes de impacto repetitivo. Monitorear velocidad de crecimiento trimestral.",
    };
  }
  if (offset <= 1.0) {
    return {
      maturationStage: "CIRCA_PHV" as MaturationStage,
      maturationLabel: "Ventana crítica de aceleración (Circa-PHV)",
      clinicalRecommendations:
        "Ventana crítica de máximo crecimiento lineal y vulnerabilidad osteocondral. Mayor riesgo de lesiones por tracción apofisaria (ej. Osgood-Schlatter, Sever). Priorizar control postural, propiocepción, fortalecimiento del core y movilidad articular. Moderar cargas de impacto y asegurar adecuado balance energético, proteico, calcio y vitamina D.",
    };
  }
  return {
    maturationStage: "POST_PHV" as MaturationStage,
    maturationLabel: "Post-pico de crecimiento",
    clinicalRecommendations:
      "Fase de consolidación antropométrica y maduración esquelética. Ventana óptima para la hipertrofia muscular y entrenamiento progresivo de fuerza submáxima y máxima. Requerimientos energéticos orientados al mantenimiento o incremento de masa magra libre de grasa. Ajustar macros para recuperación deportiva.",
  };
};

export const calculateMirwaldPhv = (p: {
  gender: "MALE" | "FEMALE";
  age: number;
  weightKg: number;
  heightCm: number;
  sittingHeightCm: number;
}): PhvResult => {
  const { gender, age, weightKg, heightCm, sittingHeightCm } = p;

  const lei = heightCm - sittingHeightCm;

  let value: number;
  if (gender === "MALE") {
    value =
      -9.236 +
      0.0002708 * lei * sittingHeightCm -
      0.001663 * age * lei +
      0.007216 * age * sittingHeightCm +
      0.02292 * weightKg * (100 / heightCm);
  } else {
    value =
      -9.376 +
      0.0001882 * lei * sittingHeightCm +
      0.0022 * age * lei +
      0.005841 * age * sittingHeightCm -
      0.002658 * age * weightKg +
      0.07693 * weightKg * (100 / heightCm);
  }

  const roundedValue = round2(value);
  const sign: 1 | -1 = roundedValue >= 0 ? 1 : -1;
  const label: "DESDE_PHV" | "HASTA_PHV" = roundedValue >= 0 ? "DESDE_PHV" : "HASTA_PHV";
  const maturityOffset = roundedValue;
  const ageAtPhv = round2(age - maturityOffset);
  const { maturationStage, maturationLabel, clinicalRecommendations } =
    getMaturationInfo(maturityOffset);

  return {
    value: roundedValue,
    maturityOffset,
    ageAtPhv,
    maturationStage,
    maturationLabel,
    clinicalRecommendations,
    sign,
    label,
    rangeValid: isAgeInMirwaldRange(gender, age),
  };
};