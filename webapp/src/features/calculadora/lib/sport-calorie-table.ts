/**
 * sport-calorie-table.ts
 *
 * Tabla de gasto energético DIRECTO (kcal/min) por categoría deportiva.
 * Valores de REFERENCIA curados sobre base ACSM / McArdle para un adulto de
 * ~70 kg a intensidad moderada-típica de la categoría. No sustituyen
 * medición individual; en la UI se etiquetan como "referencia".
 *
 * Si una categoría no tiene valor, el consumidor DEBE hacer fallback al
 * Método 2 (MET): `getCalPerMinForCategory` devuelve undefined.
 */

export interface SportCalorieReference {
  /** kcal/min de referencia de la categoría. */
  calPerMin: number;
  /** Fuente/nota de la referencia (etiqueta de UI). */
  source: string;
}

export const SPORT_CALORIE_TABLE: Record<string, SportCalorieReference> = {
  DEPORTES: { calPerMin: 7.0, source: "referencia ACSM/McArdle" },
  CAMINATA: { calPerMin: 3.8, source: "referencia ACSM/McArdle" },
  CARRERA: { calPerMin: 10.0, source: "referencia ACSM/McArdle" },
  CICLISMO: { calPerMin: 7.0, source: "referencia ACSM/McArdle" },
  ACUÁTICO: { calPerMin: 6.5, source: "referencia ACSM/McArdle" },
  FUERZA: { calPerMin: 4.5, source: "referencia ACSM/McArdle" },
  CARDIO: { calPerMin: 8.0, source: "referencia ACSM/McArdle" },
  "MIND-BODY": { calPerMin: 3.0, source: "referencia ACSM/McArdle" },
  BAILE: { calPerMin: 5.0, source: "referencia ACSM/McArdle" },
  INVIERNO: { calPerMin: 7.0, source: "referencia ACSM/McArdle" },
};

/**
 * kcal/min de referencia para una categoría.
 * Devuelve undefined si la categoría no tiene valor → fallback a Método 2 (MET).
 */
export const getCalPerMinForCategory = (
  category: string,
): number | undefined => SPORT_CALORIE_TABLE[category]?.calPerMin;

/** Nota de fuente para la etiqueta "referencia" de una categoría. */
export const getCalorieSourceForCategory = (category: string): string =>
  SPORT_CALORIE_TABLE[category]?.source ?? "sin valor directo (usar Método 2)";