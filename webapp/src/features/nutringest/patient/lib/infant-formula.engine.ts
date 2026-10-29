/**
 * infant-formula.engine.ts
 *
 * Motor clínico pediátrico de fórmulas lácteas (Winder EVANUTDEP).
 * Fórmulas:
 *   1. Capacidad Gástrica (ml/toma) = Peso (kg) × 30
 *   2. Volumen Total Diario (ml/día) = Peso (kg) × 150 a 160 ml (para 0-6 meses)
 *   3. Número de tomas = Volumen Total / Capacidad Gástrica (Ajustado según edad)
 *   4. Dilución estándar: 1 medida de polvo por cada onza (30 ml) de agua.
 */

import { round2 } from '../../../calculadora/lib/sport-calculation.engine';

export interface InfantFormulaCalculationInput {
  weightKg: number;
  ageMonths: number;
  isBreastfed?: boolean;
}

export interface InfantFormulaCalculationResult {
  gastricCapacityMl: number;
  gastricCapacityOz: number;
  totalDailyVolumeMlMin: number;
  totalDailyVolumeMlMax: number;
  suggestedFeedingsCount: number;
  suggestedVolumePerFeedingMl: number;
  suggestedVolumePerFeedingOz: number;
  powderScoopsPerFeeding: number;
  feedingFrequencyHours: string;
}

export const calculateInfantFormulaRequirements = (
  input: InfantFormulaCalculationInput
): InfantFormulaCalculationResult => {
  const { weightKg, ageMonths } = input;
  const w = weightKg > 0 ? weightKg : 4.0;

  // 1. Capacidad gástrica funcional estimada (ml)
  const gastricCapacityMl = round2(w * 30);
  const gastricCapacityOz = round2(gastricCapacityMl / 30);

  // 2. Volumen total diario (0-6 meses: 150-160 ml/kg/día; >6 meses ajustado)
  const mlPerKgMin = ageMonths <= 6 ? 150 : 120;
  const mlPerKgMax = ageMonths <= 6 ? 160 : 140;

  const totalDailyVolumeMlMin = round2(w * mlPerKgMin);
  const totalDailyVolumeMlMax = round2(w * mlPerKgMax);
  const avgDailyVolumeMl = (totalDailyVolumeMlMin + totalDailyVolumeMlMax) / 2;

  // 3. Frecuencia y número de tomas según edad
  let suggestedFeedingsCount = 6;
  let feedingFrequencyHours = '3 a 4 horas';

  if (ageMonths < 1) {
    suggestedFeedingsCount = 8;
    feedingFrequencyHours = '2 a 3 horas';
  } else if (ageMonths < 4) {
    suggestedFeedingsCount = 6;
    feedingFrequencyHours = '3 a 4 horas';
  } else if (ageMonths < 6) {
    suggestedFeedingsCount = 5;
    feedingFrequencyHours = '4 a 5 horas';
  } else {
    suggestedFeedingsCount = 4;
    feedingFrequencyHours = 'Combinado con sólidos (4 tomas)';
  }

  // 4. Volumen ajustado por toma para no sobrepasar la capacidad gástrica funcional
  let suggestedVolumePerFeedingMl = round2(avgDailyVolumeMl / suggestedFeedingsCount);

  // Si el volumen sobrepasa la capacidad, limitamos al 110% de la capacidad y aumentamos tomas
  if (suggestedVolumePerFeedingMl > gastricCapacityMl * 1.1) {
    suggestedVolumePerFeedingMl = gastricCapacityMl;
  }

  const suggestedVolumePerFeedingOz = round2(suggestedVolumePerFeedingMl / 30);

  // 5. Medidas de polvo (1 medida por cada onza de agua = 30ml)
  const powderScoopsPerFeeding = round2(suggestedVolumePerFeedingOz);

  return {
    gastricCapacityMl,
    gastricCapacityOz,
    totalDailyVolumeMlMin,
    totalDailyVolumeMlMax,
    suggestedFeedingsCount,
    suggestedVolumePerFeedingMl,
    suggestedVolumePerFeedingOz,
    powderScoopsPerFeeding,
    feedingFrequencyHours,
  };
};
