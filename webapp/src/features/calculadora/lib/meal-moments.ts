export type MealKey = "breakfast" | "morningSnack" | "lunch" | "snack" | "dinner";

export type MealIconName = "coffee" | "croissant" | "sun" | "cookie" | "moon";

export type MealClinicalCategory =
  | "protein"
  | "carbs"
  | "fats"
  | "vegetables"
  | "fruits"
  | "dairy";

export interface MealMoment {
  key: MealKey;
  label: string;
  color: string;
  accent: string;
  border: string;
  bg: string;
  icon: MealIconName;
  emoji: string;
  defaultSplit: number;
  reportFallbackSplit: number;
  reportIconColor: string;
  reportCardOrder: number;
  clinicalFactor: Record<MealClinicalCategory, number>;
}

export const MEAL_MOMENTS: readonly MealMoment[] = [
  {
    key: "breakfast",
    label: "Desayuno",
    color: "text-primary",
    accent: "accent-primary",
    border: "border-primary/30",
    bg: "bg-primary/5",
    icon: "coffee",
    emoji: "☕",
    defaultSplit: 25,
    reportFallbackSplit: 25,
    reportIconColor: "text-amber-600",
    reportCardOrder: 1,
    clinicalFactor: {
      protein: 0.2,
      carbs: 0.25,
      fats: 0.2,
      vegetables: 0.0,
      fruits: 0.35,
      dairy: 0.4,
    },
  },
  {
    key: "morningSnack",
    label: "Media Mañana",
    color: "text-rose-600",
    accent: "accent-rose-600",
    border: "border-rose-600/30",
    bg: "bg-rose-600/5",
    icon: "croissant",
    emoji: "🥐",
    defaultSplit: 10,
    reportFallbackSplit: 5,
    reportIconColor: "text-rose-500",
    reportCardOrder: 2,
    clinicalFactor: {
      protein: 0.1,
      carbs: 0.15,
      fats: 0.05,
      vegetables: 0.0,
      fruits: 0.25,
      dairy: 0.25,
    },
  },
  {
    key: "lunch",
    label: "Almuerzo",
    color: "text-purple-700",
    accent: "accent-purple-700",
    border: "border-purple-700/30",
    bg: "bg-purple-700/5",
    icon: "sun",
    emoji: "☀️",
    defaultSplit: 35,
    reportFallbackSplit: 35,
    reportIconColor: "text-orange-500",
    reportCardOrder: 3,
    clinicalFactor: {
      protein: 0.35,
      carbs: 0.35,
      fats: 0.35,
      vegetables: 0.6,
      fruits: 0.0,
      dairy: 0.0,
    },
  },
  {
    key: "snack",
    label: "Media Tarde",
    color: "text-sky-600",
    accent: "accent-sky-600",
    border: "border-sky-600/30",
    bg: "bg-sky-600/5",
    icon: "cookie",
    emoji: "🍪",
    defaultSplit: 15,
    reportFallbackSplit: 15,
    reportIconColor: "text-emerald-600",
    reportCardOrder: 4,
    clinicalFactor: {
      protein: 0.1,
      carbs: 0.15,
      fats: 0.15,
      vegetables: 0.0,
      fruits: 0.4,
      dairy: 0.35,
    },
  },
  {
    key: "dinner",
    label: "Cena",
    color: "text-amber-600",
    accent: "accent-amber-600",
    border: "border-amber-600/30",
    bg: "bg-amber-600/5",
    icon: "moon",
    emoji: "🌙",
    defaultSplit: 15,
    reportFallbackSplit: 20,
    reportIconColor: "text-indigo-600",
    reportCardOrder: 5,
    clinicalFactor: {
      protein: 0.25,
      carbs: 0.1,
      fats: 0.25,
      vegetables: 0.4,
      fruits: 0.0,
      dairy: 0.0,
    },
  },
];

// 3 columns on md+ keeps every card readable; 5 cards wrap 3 + 2 instead of
// squeezing five side by side (both on screen and on the A4 report).
export const MEAL_MOMENTS_GRID_CLASS = "md:grid-cols-3 xl:grid-cols-5";

export function mealKeys(): MealKey[] {
  return MEAL_MOMENTS.map((m) => m.key);
}

export function defaultSplits(): Record<MealKey, number> {
  return Object.fromEntries(
    MEAL_MOMENTS.map((m) => [m.key, m.defaultSplit])
  ) as Record<MealKey, number>;
}

export function emptyMealDistribution(): Record<MealKey, Record<string, number>> {
  return Object.fromEntries(
    MEAL_MOMENTS.map((m) => [m.key, {}])
  ) as Record<MealKey, Record<string, number>>;
}

export function sumMealSplits(splits: Record<MealKey, number>): number {
  return MEAL_MOMENTS.reduce((acc, m) => acc + (splits[m.key] ?? 0), 0);
}

export function reportMealMoments(): MealMoment[] {
  return [...MEAL_MOMENTS].sort((a, b) => a.reportCardOrder - b.reportCardOrder);
}

// The four moments that existed before the 5th slot. Plans without a persisted
// `splits` blob must keep rendering exactly the cards they rendered before it.
const LEGACY_REPORT_MEAL_KEYS: readonly MealKey[] = [
  "breakfast",
  "lunch",
  "snack",
  "dinner",
];

/**
 * Report cards for a persisted `splits` blob.
 *
 * - `splits` present → only moments whose key exists in the blob: an old
 *   4-key plan renders its 4 cards (no phantom Media Mañana), and a key
 *   stored with value 0 still renders its card (the value itself goes
 *   through the caller's pct expression).
 * - no usable `splits` → the legacy 4-moment set, so plans created without
 *   distribution metadata render exactly as they did before the 5th moment.
 */
export function visibleReportMealMoments(
  splits: Partial<Record<MealKey, number>> | null | undefined
): MealMoment[] {
  const ordered = reportMealMoments();
  if (!splits || Object.keys(splits).length === 0) {
    return ordered.filter((m) => LEGACY_REPORT_MEAL_KEYS.includes(m.key));
  }
  return ordered.filter((m) => m.key in splits);
}
