/**
 * Date presets for the financial dashboard filters. All math is local-time
 * so a merchant in UTC−4 never sees yesterday's ISO key at 20:00.
 */

export type PeriodPreset =
  | "hoy"
  | "siete-dias"
  | "treinta-dias"
  | "mes-actual"
  | "personalizado";

export interface PeriodRange {
  /** YYYY-MM-DD inclusive. */
  from: string;
  /** YYYY-MM-DD inclusive. */
  to: string;
}

/** Local YYYY-MM-DD for a Date (business day, not UTC). */
export function localDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Resolves a preset against `now`. The custom preset answers null so the
 * caller keeps its own from/to inputs. Month-end is the real last day of
 * the calendar month (Feb 28/29 handled by Date math).
 */
export function periodPresetRange(
  preset: PeriodPreset,
  now: Date = new Date(),
): PeriodRange | null {
  const to = localDayKey(now);

  if (preset === "hoy") {
    return { from: to, to };
  }

  if (preset === "siete-dias" || preset === "treinta-dias") {
    const days = preset === "siete-dias" ? 6 : 29; // inclusive of today
    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    start.setDate(start.getDate() - days);
    return { from: localDayKey(start), to };
  }

  if (preset === "mes-actual") {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { from: localDayKey(first), to: localDayKey(last) };
  }

  return null; // personalizado
}

export const PERIOD_PRESET_LABELS: Record<PeriodPreset, string> = {
  hoy: "Hoy",
  "siete-dias": "7 días",
  "treinta-dias": "30 días",
  "mes-actual": "Este mes",
  personalizado: "Personalizado",
};
