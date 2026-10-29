import { MEAL_MOMENTS } from "@/features/calculadora/lib/meal-moments";

/**
 * Canonical eating-moment vocabulary for plan assignments.
 *
 * `AssignedMenu.eatingMoment` / `AssignedExchangeList.eatingMoment` are free
 * TEXT columns: the exact ES string in `value` is what gets persisted and what
 * every assignment UI must offer. The five calculator moments reuse the
 * calculator's labels (single source: `meal-moments.ts`); Pre-Entreno,
 * Post-Entreno and General complete the 8-value `MenuCategory` enum.
 *
 * Legacy persisted strings ("Merienda", "Snack", "Colación", "Otro") keep
 * resolving through the maps below — they are data in production, not typos.
 */
export type MenuCategory =
  | "BREAKFAST"
  | "MORNING_SNACK"
  | "LUNCH"
  | "SNACK"
  | "DINNER"
  | "PRE_WORKOUT"
  | "POST_WORKOUT"
  | "OTHER";

export interface EatingMoment {
  /** Exact string persisted to `eatingMoment`. Part of the DB data contract. */
  value: string;
  label: string;
  category: MenuCategory;
  /** Suggested display time (HH:mm) for reports. */
  time: string;
  sortOrder: number;
}

const CALCULATOR_MOMENT_META: Record<string, { category: MenuCategory; time: string }> = {
  breakfast: { category: "BREAKFAST", time: "07:30" },
  morningSnack: { category: "MORNING_SNACK", time: "10:30" },
  lunch: { category: "LUNCH", time: "13:00" },
  snack: { category: "SNACK", time: "17:30" },
  dinner: { category: "DINNER", time: "20:30" },
};

export const EATING_MOMENTS: readonly EatingMoment[] = [
  ...MEAL_MOMENTS.map((m, idx) => ({
    value: m.label,
    label: m.label,
    category: CALCULATOR_MOMENT_META[m.key].category,
    time: CALCULATOR_MOMENT_META[m.key].time,
    sortOrder: idx + 1,
  })),
  { value: "Pre-Entreno", label: "Pre-Entreno", category: "PRE_WORKOUT", time: "06:30", sortOrder: 6 },
  { value: "Post-Entreno", label: "Post-Entreno", category: "POST_WORKOUT", time: "22:00", sortOrder: 7 },
  { value: "General", label: "General", category: "OTHER", time: "12:00", sortOrder: 8 },
];

const GENERAL_MOMENT: EatingMoment = EATING_MOMENTS[EATING_MOMENTS.length - 1];

/** Canonical values plus every legacy string ever persisted, case-insensitive. */
const CATEGORY_BY_VALUE: Record<string, MenuCategory> = {
  "desayuno": "BREAKFAST",
  "media mañana": "MORNING_SNACK",
  "almuerzo": "LUNCH",
  "media tarde": "SNACK",
  // Legacy dropdown/seed values that meant SNACK:
  "merienda": "SNACK",
  "snack": "SNACK",
  "colación": "SNACK",
  "colacion": "SNACK",
  "cena": "DINNER",
  "pre-entreno": "PRE_WORKOUT",
  "post-entreno": "POST_WORKOUT",
  "general": "OTHER",
  // Legacy seed value that meant OTHER:
  "otro": "OTHER",
  "otros": "OTHER",
};

function normalize(value?: string | null): string {
  return value?.trim().toLowerCase() ?? "";
}

/** ES label → MenuCategory. Total: unknown/empty → OTHER. */
export function eatingMomentToCategory(value?: string | null): MenuCategory {
  return CATEGORY_BY_VALUE[normalize(value)] ?? "OTHER";
}

/** MenuCategory → canonical moment. Total: unknown/null → General (OTHER). */
export function categoryToEatingMoment(category?: string | null): EatingMoment {
  return EATING_MOMENTS.find((m) => m.category === category) ?? GENERAL_MOMENT;
}

/**
 * Suggested report time for a persisted `eatingMoment`. Total by construction:
 * every canonical value and every legacy alias resolves to its category's
 * time; anything unrecognised lands on General's 12:00.
 */
export function resolveEatingMomentTime(value?: string | null): string {
  return categoryToEatingMoment(eatingMomentToCategory(value)).time;
}
