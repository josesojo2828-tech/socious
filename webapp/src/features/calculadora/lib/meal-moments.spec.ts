import { describe, expect, it } from "vitest";
import {
  MEAL_MOMENTS,
  MEAL_MOMENTS_GRID_CLASS,
  defaultSplits,
  emptyMealDistribution,
  mealKeys,
  reportMealMoments,
  sumMealSplits,
  visibleReportMealMoments,
  type MealClinicalCategory,
} from "./meal-moments";

describe("meal-moments", () => {
  it("exposes exactly the five moments in chronological order", () => {
    expect(mealKeys()).toEqual([
      "breakfast",
      "morningSnack",
      "lunch",
      "snack",
      "dinner",
    ]);
  });

  it("keeps the canonical Spanish labels", () => {
    expect(MEAL_MOMENTS.map((m) => m.label)).toEqual([
      "Desayuno",
      "Media Mañana",
      "Almuerzo",
      "Media Tarde",
      "Cena",
    ]);
  });

  it("calculator default splits sum to 100", () => {
    expect(sumMealSplits(defaultSplits())).toBe(100);
  });

  it("report fallback splits sum to 100", () => {
    const total = reportMealMoments().reduce((acc, m) => acc + m.reportFallbackSplit, 0);
    expect(total).toBe(100);
  });

  it("keeps calculator defaults and report fallbacks as separate values", () => {
    expect(defaultSplits()).toEqual({
      breakfast: 25,
      morningSnack: 10,
      lunch: 35,
      snack: 15,
      dinner: 15,
    });
    const reportFallbacks = Object.fromEntries(
      reportMealMoments().map((m) => [m.key, m.reportFallbackSplit])
    );
    expect(reportFallbacks).toEqual({
      breakfast: 25,
      morningSnack: 5,
      lunch: 35,
      snack: 15,
      dinner: 20,
    });
  });

  it("clinical factors sum to 1 per category", () => {
    const categories: MealClinicalCategory[] = [
      "protein",
      "carbs",
      "fats",
      "vegetables",
      "fruits",
      "dairy",
    ];
    for (const cat of categories) {
      const total = MEAL_MOMENTS.reduce((acc, m) => acc + m.clinicalFactor[cat], 0);
      expect(total).toBeCloseTo(1, 5);
    }
  });

  it("builds an empty distribution keyed by every moment", () => {
    expect(emptyMealDistribution()).toEqual({
      breakfast: {},
      morningSnack: {},
      lunch: {},
      snack: {},
      dinner: {},
    });
  });

  it("orders report cards by reportCardOrder", () => {
    expect(reportMealMoments().map((m) => m.key)).toEqual([
      "breakfast",
      "morningSnack",
      "lunch",
      "snack",
      "dinner",
    ]);
  });

  it("pins the summary-cards grid class as a Tailwind literal", () => {
    expect(MEAL_MOMENTS_GRID_CLASS).toBe("md:grid-cols-3 xl:grid-cols-5");
  });

  it("builds one WhatsApp/email Tiempos segment per moment (5 segments)", () => {
    const splits = defaultSplits();
    const line = MEAL_MOMENTS.map((m) => `${m.label} ${splits[m.key]}%`).join(" | ");
    expect(line.split(" | ")).toHaveLength(5);
    expect(line).toContain("Media Mañana 10%");
    expect(line).toContain("Media Tarde 15%");
  });
});

describe("visibleReportMealMoments - backward compatibility", () => {
  // The exact blob shape persisted by pre-5th-slot plans inside
  // NutritionalPlan.recommendations:
  // <!--NUTRINGEST_DISTRIBUTION:{"splits":{...},"distribution":{...}}-->
  const OLD_PLAN_SPLITS = { breakfast: 25, lunch: 35, snack: 15, dinner: 25 };

  it("renders exactly the four cards of a persisted 4-key plan, no phantom Media Mañana", () => {
    const cards = visibleReportMealMoments(OLD_PLAN_SPLITS);

    expect(cards.map((m) => m.key)).toEqual([
      "breakfast",
      "lunch",
      "snack",
      "dinner",
    ]);
    expect(cards.map((m) => m.label)).toEqual([
      "Desayuno",
      "Almuerzo",
      "Media Tarde",
      "Cena",
    ]);
    expect(cards.some((m) => m.key === "morningSnack")).toBe(false);
  });

  it("keeps the stored pct values of an old 4-key plan unchanged", () => {
    const cards = visibleReportMealMoments(OLD_PLAN_SPLITS);

    // Mirrors the pct expression in app/patient/shared/[id]/page.tsx
    // (reconciled in the eating-moments vocabulary PR: the old `|| 25` is gone).
    const pct = (mk: (typeof cards)[number]["key"]) =>
      OLD_PLAN_SPLITS[mk as keyof typeof OLD_PLAN_SPLITS] ??
      cards.find((m) => m.key === mk)!.reportFallbackSplit;

    expect(cards.map((m) => pct(m.key))).toEqual([25, 35, 15, 25]);
  });

  it("still renders a card whose stored split is present with value 0", () => {
    const newPlanSplits = {
      breakfast: 25,
      morningSnack: 0,
      lunch: 35,
      snack: 15,
      dinner: 25,
    };
    const cards = visibleReportMealMoments(newPlanSplits);

    expect(cards.map((m) => m.key)).toEqual([
      "breakfast",
      "morningSnack",
      "lunch",
      "snack",
      "dinner",
    ]);
    expect(cards.find((m) => m.key === "morningSnack")).toBeDefined();

    // Same mirror as above: a stored 0 must render as 0, not as the old
    // `|| 25` fallback of 25.
    const pct = (mk: (typeof cards)[number]["key"]) =>
      newPlanSplits[mk as keyof typeof newPlanSplits] ??
      cards.find((m) => m.key === mk)!.reportFallbackSplit;
    expect(pct("morningSnack")).toBe(0);
  });

  it("renders all five cards of a persisted 5-key plan", () => {
    const cards = visibleReportMealMoments(defaultSplits());
    expect(cards.map((m) => m.key)).toEqual([
      "breakfast",
      "morningSnack",
      "lunch",
      "snack",
      "dinner",
    ]);
  });

  it("falls back to the legacy four moments when no splits blob exists", () => {
    const legacyKeys = ["breakfast", "lunch", "snack", "dinner"];
    expect(visibleReportMealMoments(undefined).map((m) => m.key)).toEqual(legacyKeys);
    expect(visibleReportMealMoments(null).map((m) => m.key)).toEqual(legacyKeys);
    expect(visibleReportMealMoments({}).map((m) => m.key)).toEqual(legacyKeys);
  });
});
