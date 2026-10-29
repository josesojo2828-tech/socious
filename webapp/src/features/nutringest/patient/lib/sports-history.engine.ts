/**
 * sports-history.engine.ts
 *
 * Motores puros de cálculo para la historia deportiva del paciente.
 * Reutiliza los engines de calculadora deportiva (Cunningham/METS/round2)
 * y deriva la masa libre de grasa (FFM) desde la antropometría.
 */

import {
  round2,
  calculateCunninghamRmr,
  calculateMetsExpenditure,
} from "../../../calculadora/lib/sport-calculation.engine";

/** Masa libre de grasa derivada: FFM = peso × (1 − fatPercentage/100). */
export const deriveFfm = (p: { weightKg: number; fatPercentage: number }): number =>
  round2(p.weightKg * (1 - p.fatPercentage / 100));

export type SportsTrainingLoad = {
  minutesPerSession: number;
  daysPerWeek: number;
  sessionsPerDay: number;
};

export type ItemizedDisciplinePractice = {
  met: number;
  minutesPerSession: number;
  daysPerWeek: number;
  sessionsPerDay: number;
};

/** FFMI (Índice de Masa Libre de Grasa) y FFMI Normalizado a 1.80m */
export const calculateFfmi = (p: {
  ffmKg: number;
  heightCm: number;
  gender?: 'MALE' | 'FEMALE' | string;
}): {
  ffmi: number;
  ffmiNormalized: number;
  category: string;
} => {
  const { ffmKg, heightCm, gender } = p;
  const heightM = heightCm / 100;
  if (!heightM || heightM <= 0 || !ffmKg || ffmKg <= 0) {
    return { ffmi: 0, ffmiNormalized: 0, category: 'Sin datos' };
  }

  const ffmi = round2(ffmKg / (heightM * heightM));
  const ffmiNormalized = round2(ffmi + 6.1 * (1.80 - heightM));

  let category = 'Promedio';
  const isFemale = gender === 'FEMALE';

  if (isFemale) {
    if (ffmiNormalized < 15) category = 'Por debajo del promedio';
    else if (ffmiNormalized <= 16) category = 'Promedio';
    else if (ffmiNormalized <= 18) category = 'Atleta entrenada';
    else if (ffmiNormalized <= 21) category = 'Élite natural';
    else category = 'Umbral fisiológico superior';
  } else {
    if (ffmiNormalized < 18) category = 'Por debajo del promedio';
    else if (ffmiNormalized <= 20) category = 'Promedio';
    else if (ffmiNormalized <= 22) category = 'Atleta entrenado';
    else if (ffmiNormalized <= 25) category = 'Élite natural';
    else category = 'Umbral fisiológico hipertrófico superior';
  }

  return { ffmi, ffmiNormalized, category };
};

/** Disponibilidad Energética (EA) y Diagnóstico RED-S */
export type EnergyAvailabilityStatus = 'OPTIMAL' | 'SUBOPTIMAL' | 'LOW_AVAILABILITY';

export const calculateEnergyAvailability = (p: {
  totalEnergyIntakeKcal?: number;
  exerciseEnergyExpenditureKcal: number;
  ffmKg: number;
}): {
  ea: number | null;
  status: EnergyAvailabilityStatus | null;
  label: string;
  clinicalRecommendation: string;
} => {
  const { totalEnergyIntakeKcal, exerciseEnergyExpenditureKcal, ffmKg } = p;
  if (!totalEnergyIntakeKcal || totalEnergyIntakeKcal <= 0 || !ffmKg || ffmKg <= 0) {
    return {
      ea: null,
      status: null,
      label: 'Sin ingesta calórica',
      clinicalRecommendation: 'Se requiere la ingesta calórica total para evaluar Disponibilidad Energética (EA).',
    };
  }

  const ea = round2((totalEnergyIntakeKcal - exerciseEnergyExpenditureKcal) / ffmKg);

  if (ea >= 45) {
    return {
      ea,
      status: 'OPTIMAL',
      label: 'ÓPTIMO (≥45 kcal/kg FFM/día)',
      clinicalRecommendation: 'Soporte completo de masa ósea, función tiroidea (T3), eje reproductivo y síntesis proteica. Mantenimiento del plan.',
    };
  }
  if (ea >= 30) {
    return {
      ea,
      status: 'SUBOPTIMAL',
      label: 'SUBÓPTIMO (30–44 kcal/kg FFM/día)',
      clinicalRecommendation: 'Reducción moderada del recambio óseo y adaptación metabólica lenta. Tolerable solo a corto plazo. Ajuste calórico progresivo.',
    };
  }

  return {
    ea,
    status: 'LOW_AVAILABILITY',
    label: 'BAJA DISPONIBILIDAD - LEA / RED-S (<30 kcal/kg FFM/día)',
    clinicalRecommendation: 'Amenorrea/oligomenorrea, T3 libre baja, cortisol elevado, riesgo de osteopenia e inmunosupresión. Requiere intervención clínica e incremento calórico inmediato.',
  };
};

/** Prescripción Periodizada de Macronutrientes por Carga Deportiva */
export type TrainingLoadLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME' | 'CUT';

export const calculatePeriodizedMacros = (p: {
  weightKg: number;
  loadLevel: TrainingLoadLevel;
}): {
  carbsGramsMin: number;
  carbsGramsMax: number;
  proteinGramsMin: number;
  proteinGramsMax: number;
  fatGramsMin: number;
  fatGramsMax: number;
  leucineTargetGrams: string;
} => {
  const { weightKg, loadLevel } = p;
  const w = weightKg > 0 ? weightKg : 70;

  const RANGES: Record<TrainingLoadLevel, { cho: [number, number]; pro: [number, number]; fat: [number, number] }> = {
    LOW: { cho: [3.0, 5.0], pro: [1.6, 2.0], fat: [1.0, 1.2] },
    MODERATE: { cho: [5.0, 7.0], pro: [1.6, 2.2], fat: [1.0, 1.2] },
    HIGH: { cho: [6.0, 10.0], pro: [1.8, 2.2], fat: [0.8, 1.0] },
    EXTREME: { cho: [8.0, 12.0], pro: [1.8, 2.4], fat: [0.8, 1.0] },
    CUT: { cho: [3.5, 5.0], pro: [2.2, 2.8], fat: [0.6, 0.8] },
  };

  const current = RANGES[loadLevel] || RANGES.MODERATE;

  return {
    carbsGramsMin: round2(w * current.cho[0]),
    carbsGramsMax: round2(w * current.cho[1]),
    proteinGramsMin: round2(w * current.pro[0]),
    proteinGramsMax: round2(w * current.pro[1]),
    fatGramsMin: round2(w * current.fat[0]),
    fatGramsMax: round2(w * current.fat[1]),
    leucineTargetGrams: `${round2(w * 0.3)}g – ${round2(w * 0.4)}g por comida (asegurando 2.5g–3.0g de Leucina para mTORC1)`,
  };
};

/**
 * Resultados deportivos calculados con carga INDIVIDUALizada por cada disciplina
 */
export const calculateItemizedSportsResults = (p: {
  weightKg: number;
  ffmKg: number;
  heightCm?: number;
  gender?: string;
  totalEnergyIntakeKcal?: number;
  practices: ItemizedDisciplinePractice[];
}): {
  metsExpenditure: number;
  cunninghamRmr: number;
  total: number;
  ffmiData?: ReturnType<typeof calculateFfmi>;
  energyAvailability?: ReturnType<typeof calculateEnergyAvailability>;
} => {
  const { weightKg, ffmKg, heightCm, gender, totalEnergyIntakeKcal, practices } = p;

  const metsExpenditure = round2(
    practices.reduce(
      (sum, item) =>
        sum +
        calculateMetsExpenditure({
          met: item.met,
          weightKg,
          minutesPerSession: item.minutesPerSession,
          daysPerWeek: item.daysPerWeek,
          sessionsPerDay: item.sessionsPerDay,
        }),
      0,
    ),
  );

  const cunninghamRmr = calculateCunninghamRmr(ffmKg);

  const ffmiData = heightCm && heightCm > 0 ? calculateFfmi({ ffmKg, heightCm, gender }) : undefined;
  const energyAvailability = calculateEnergyAvailability({
    totalEnergyIntakeKcal,
    exerciseEnergyExpenditureKcal: metsExpenditure,
    ffmKg,
  });

  return {
    metsExpenditure,
    cunninghamRmr,
    total: round2(cunninghamRmr + metsExpenditure),
    ffmiData,
    energyAvailability,
  };
};

/**
 * Resultados deportivos calculados con carga COMPARTIDA
 * (promedioMin global) para todas las disciplinas:
 *   - METS por disciplina = calculateMetsExpenditure (Σ diario, round2)
 *   - Cunningham RMR = 500 + 22 × FFM
 *   - total = round2(cunninghamRmr + metsExpenditure)
 */
export const calculateSportsResults = (p: {
  weightKg: number;
  ffmKg: number;
  disciplines: { met: number }[];
  load: SportsTrainingLoad;
}): { metsExpenditure: number; cunninghamRmr: number; total: number } => {
  const { weightKg, ffmKg, disciplines, load } = p;

  const metsExpenditure = round2(
    disciplines.reduce(
      (sum, d) =>
        sum +
        calculateMetsExpenditure({
          met: d.met,
          weightKg,
          minutesPerSession: load.minutesPerSession,
          daysPerWeek: load.daysPerWeek,
          sessionsPerDay: load.sessionsPerDay,
        }),
      0,
    ),
  );

  const cunninghamRmr = calculateCunninghamRmr(ffmKg);

  return {
    metsExpenditure,
    cunninghamRmr,
    total: round2(cunninghamRmr + metsExpenditure),
  };
};