/**
 * pediatric-history-init.ts
 *
 * Initialization helpers for PediatricHistoryForm.
 *
 * Age is ALWAYS derived from the patient (birthDate first, then patient.age)
 * because the PediatricHistory table has no ageMonths/ageYears columns: a saved
 * record can never supply the age, and reading it used to force every patient
 * with a record to 5 years (60 months fallback).
 *
 * Anthropometric measurements from the patient's latest Anthropometry record
 * fill any gap left by a saved pediatric record (history wins over profile).
 */

export interface PediatricAnthropometrySnapshot {
  weight?: number | string | null;
  height?: number | string | null;
  sittingHeight?: number | string | null;
  tricipital?: number | string | null;
  subscapular?: number | string | null;
}

export interface PediatricPatientSource {
  birthDate?: string | null;
  age?: number | string | null;
  gender?: string | null;
  anthropometrics?: PediatricAnthropometrySnapshot[] | null;
}

export interface PediatricHistoryRecordSource {
  weightKg?: number | string | null;
  heightCm?: number | string | null;
  sittingHeightCm?: number | string | null;
  tricepsSkinfoldMm?: number | string | null;
  subscapularSkinfoldMm?: number | string | null;
}

export const DEFAULT_AGE_MONTHS = 60;
export const DEFAULT_WEIGHT_KG = 18;
export const DEFAULT_HEIGHT_CM = 110;
export const DEFAULT_SITTING_HEIGHT_CM = 60;

const toFinite = (value?: number | string | null): number | undefined => {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

/**
 * Patient age in whole months, mirroring the original calculation
 * (year/month difference; day-of-month is intentionally ignored).
 */
export function deriveAgeMonthsFromPatient(
  patient: Pick<PediatricPatientSource, "birthDate" | "age"> | null | undefined,
  now: Date = new Date(),
): number {
  const birthTime = patient?.birthDate ? Date.parse(patient.birthDate) : NaN;
  if (!isNaN(birthTime)) {
    const birth = new Date(birthTime);
    const diffMonths =
      (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    if (Number.isFinite(diffMonths) && diffMonths >= 0) return diffMonths;
  }
  const ageYears = toFinite(patient?.age);
  if (ageYears !== undefined && ageYears >= 0) return Math.round(ageYears * 12);
  return DEFAULT_AGE_MONTHS;
}

export function monthsToYears(months: number): number {
  return Number((months / 12).toFixed(2));
}

export function resolvePediatricGender(raw?: string | null): "FEMALE" | "MALE" {
  const normalized = (raw || "").toUpperCase();
  return normalized === "FEMALE" || normalized === "FEMENINO" ? "FEMALE" : "MALE";
}

/** First defined candidate that parses to a number > 0. */
const pickMeasurement = (
  ...candidates: Array<number | string | null | undefined>
): number | undefined => {
  for (const candidate of candidates) {
    const parsed = toFinite(candidate);
    if (parsed !== undefined && parsed > 0) return parsed;
  }
  return undefined;
};

/**
 * Common initial values for the pediatric form, shared by defaultValues and
 * the load effect. `history` supplies saved measurements (when present);
 * `patient` always supplies age and fills measurement gaps from the latest
 * anthropometric record.
 */
export function buildPediatricFormInit(
  history: PediatricHistoryRecordSource | null | undefined,
  patient: PediatricPatientSource | null | undefined,
  now: Date = new Date(),
) {
  const ageMonths = deriveAgeMonthsFromPatient(patient, now);
  const anthropo = patient?.anthropometrics?.[0];
  return {
    ageMonths,
    ageYears: monthsToYears(ageMonths),
    weightKg: pickMeasurement(history?.weightKg, anthropo?.weight) ?? DEFAULT_WEIGHT_KG,
    heightCm: pickMeasurement(history?.heightCm, anthropo?.height) ?? DEFAULT_HEIGHT_CM,
    sittingHeightCm:
      pickMeasurement(history?.sittingHeightCm, anthropo?.sittingHeight) ?? null,
    tricepsSkinfoldMm:
      pickMeasurement(history?.tricepsSkinfoldMm, anthropo?.tricipital) ?? null,
    subscapularSkinfoldMm:
      pickMeasurement(history?.subscapularSkinfoldMm, anthropo?.subscapular) ?? null,
  };
}
