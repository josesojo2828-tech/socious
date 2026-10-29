/**
 * sport-calculation.engine.ts
 *
 * Motores puros de cálculo energético para deportistas.
 * Replica exacta del gasto por METs del engine institucional
 * (serverapp: institutional-calculation.engine.ts:159-184) y suma el
 * gasto directo por tabla cal/min, Cunningham y total adulto.
 *
 * Redondeo round2 (toFixed(2)) en CADA paso para reproducir la hoja de referencia.
 */

export const round2 = (n: number): number => parseFloat(n.toFixed(2));

/** Promedio de minutos de entrenamiento por día en una semana. */
export const calculateAverageTrainingMinutes = (
  min: number,
  days: number,
  sessions: number,
): number => round2((min * days * sessions) / 7);

/**
 * Gasto energético diario por actividad física según METs (Método 2 / MET).
 *
 * Procedimiento de 4 pasos (equivalente de oxígeno), redondeando a 2 decimales
 * en CADA paso:
 *   Paso 0 — promedioMin = (minutosPorSesion × diasPorSemana × sesionesPorDia) / 7
 *   Paso A — mlO2PorKgMin = met × 3.5
 *   Paso B — ltO2PorMin = peso × mlO2PorKgMin / 1000
 *   Paso C — kcalPorMin = ltO2PorMin × 5
 *   Paso D — gastoKcalDia = kcalPorMin × promedioMin
 */
export const calculateMetsExpenditure = (p: {
  met: number;
  weightKg: number;
  minutesPerSession: number;
  daysPerWeek: number;
  sessionsPerDay: number;
}): number => {
  const { met, weightKg, minutesPerSession, daysPerWeek, sessionsPerDay } = p;

  const promedioMin = calculateAverageTrainingMinutes(
    minutesPerSession,
    daysPerWeek,
    sessionsPerDay,
  );

  const mlO2PorKgMin = round2(met * 3.5);
  const ltO2PorMin = round2((weightKg * mlO2PorKgMin) / 1000);
  const kcalPorMin = round2(ltO2PorMin * 5);

  return round2(kcalPorMin * promedioMin);
};

/**
 * Gasto energético por gasto directo (Método 1 / DIRECTO).
 * Total de minutos semanales × valor cal/min de la tabla de referencia:
 *   gasto = (minutosPorSesion × diasPorSemana × sesionesPorDia) × calPerMin
 */
export const calculateDirectExpenditure = (p: {
  calPerMin: number;
  minutesPerSession: number;
  daysPerWeek: number;
  sessionsPerDay: number;
}): number => {
  const { calPerMin, minutesPerSession, daysPerWeek, sessionsPerDay } = p;

  const totalWeeklyMinutes = minutesPerSession * daysPerWeek * sessionsPerDay;

  return round2(totalWeeklyMinutes * calPerMin);
};

/** Tasa metabólica en reposo por la fórmula de Cunningham (kcal/día). */
export const calculateCunninghamRmr = (ffmKg: number): number => round2(500 + 22 * ffmKg);

/** Total adulto = Cunningham + gasto por actividad deportiva. */
export const calculateAthleteTotal = (ffmKg: number, sportExpenditure: number): number =>
  round2(calculateCunninghamRmr(ffmKg) + sportExpenditure);