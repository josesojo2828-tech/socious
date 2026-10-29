import { describe, expect, it } from "vitest";
import {
  EATING_MOMENTS,
  categoryToEatingMoment,
  eatingMomentToCategory,
  resolveEatingMomentTime,
  type MenuCategory,
} from "./eating-moments";

describe("eating-moments - canonical vocabulary", () => {
  it("exposes exactly 8 ordered moments with the pinned persisted values", () => {
    expect(EATING_MOMENTS.map((m) => m.value)).toEqual([
      "Desayuno",
      "Media Mañana",
      "Almuerzo",
      "Media Tarde",
      "Cena",
      "Pre-Entreno",
      "Post-Entreno",
      "General",
    ]);
  });

  it("pins label === value and a stable sortOrder for every moment", () => {
    expect(EATING_MOMENTS.every((m) => m.value === m.label)).toBe(true);
    expect(EATING_MOMENTS.map((m) => m.sortOrder)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("covers every MenuCategory exactly once", () => {
    const categories = EATING_MOMENTS.map((m) => m.category);
    expect(new Set(categories).size).toBe(8);
  });

  it("pins the suggested report times", () => {
    expect(Object.fromEntries(EATING_MOMENTS.map((m) => [m.value, m.time]))).toEqual({
      "Desayuno": "07:30",
      "Media Mañana": "10:30",
      "Almuerzo": "13:00",
      "Media Tarde": "17:30",
      "Cena": "20:30",
      "Pre-Entreno": "06:30",
      "Post-Entreno": "22:00",
      "General": "12:00",
    });
  });
});

describe("eating-moments - ES → MenuCategory", () => {
  it("maps every canonical value to its enum value", () => {
    const expected: Record<string, MenuCategory> = {
      "Desayuno": "BREAKFAST",
      "Media Mañana": "MORNING_SNACK",
      "Almuerzo": "LUNCH",
      "Media Tarde": "SNACK",
      "Cena": "DINNER",
      "Pre-Entreno": "PRE_WORKOUT",
      "Post-Entreno": "POST_WORKOUT",
      "General": "OTHER",
    };
    for (const [value, category] of Object.entries(expected)) {
      expect(eatingMomentToCategory(value)).toBe(category);
    }
  });

  it("maps the legacy persisted strings to their true category", () => {
    expect(eatingMomentToCategory("Merienda")).toBe("SNACK");
    expect(eatingMomentToCategory("Snack")).toBe("SNACK");
    expect(eatingMomentToCategory("Colación")).toBe("SNACK");
    expect(eatingMomentToCategory("Colacion")).toBe("SNACK");
    expect(eatingMomentToCategory("Otro")).toBe("OTHER");
    expect(eatingMomentToCategory("Otros")).toBe("OTHER");
  });

  it("is case- and whitespace-insensitive", () => {
    expect(eatingMomentToCategory("  media MAÑANA ")).toBe("MORNING_SNACK");
    expect(eatingMomentToCategory("PRE-ENTRENO")).toBe("PRE_WORKOUT");
  });

  it("falls back to OTHER for unknown or empty input", () => {
    expect(eatingMomentToCategory("Plan Diario")).toBe("OTHER");
    expect(eatingMomentToCategory("Distribuir en comidas principales")).toBe("OTHER");
    expect(eatingMomentToCategory("")).toBe("OTHER");
    expect(eatingMomentToCategory(null)).toBe("OTHER");
    expect(eatingMomentToCategory(undefined)).toBe("OTHER");
  });
});

describe("eating-moments - MenuCategory → ES", () => {
  it("is total over the 8 enum values and never collapses a real moment to General", () => {
    expect(categoryToEatingMoment("BREAKFAST").value).toBe("Desayuno");
    expect(categoryToEatingMoment("MORNING_SNACK").value).toBe("Media Mañana");
    expect(categoryToEatingMoment("LUNCH").value).toBe("Almuerzo");
    expect(categoryToEatingMoment("SNACK").value).toBe("Media Tarde");
    expect(categoryToEatingMoment("DINNER").value).toBe("Cena");
    expect(categoryToEatingMoment("PRE_WORKOUT").value).toBe("Pre-Entreno");
    expect(categoryToEatingMoment("POST_WORKOUT").value).toBe("Post-Entreno");
    expect(categoryToEatingMoment("OTHER").value).toBe("General");
  });

  it("falls back to General for unknown or empty categories", () => {
    expect(categoryToEatingMoment("NOPE").value).toBe("General");
    expect(categoryToEatingMoment(null).value).toBe("General");
    expect(categoryToEatingMoment(undefined).value).toBe("General");
  });

  it("round-trips every canonical value through its category", () => {
    for (const m of EATING_MOMENTS) {
      expect(categoryToEatingMoment(eatingMomentToCategory(m.value)).value).toBe(m.value);
    }
  });
});

describe("eating-moments - resolveEatingMomentTime", () => {
  it("gives every canonical moment its pinned time", () => {
    expect(resolveEatingMomentTime("Desayuno")).toBe("07:30");
    expect(resolveEatingMomentTime("Media Mañana")).toBe("10:30");
    expect(resolveEatingMomentTime("Almuerzo")).toBe("13:00");
    expect(resolveEatingMomentTime("Media Tarde")).toBe("17:30");
    expect(resolveEatingMomentTime("Cena")).toBe("20:30");
    expect(resolveEatingMomentTime("Pre-Entreno")).toBe("06:30");
    expect(resolveEatingMomentTime("Post-Entreno")).toBe("22:00");
    expect(resolveEatingMomentTime("General")).toBe("12:00");
  });

  it("resolves legacy strings through their category instead of a silent fallback", () => {
    expect(resolveEatingMomentTime("Merienda")).toBe("17:30");
    expect(resolveEatingMomentTime("MERIENDA")).toBe("17:30");
    expect(resolveEatingMomentTime("Snack")).toBe("17:30");
    expect(resolveEatingMomentTime("SNACK")).toBe("17:30");
    expect(resolveEatingMomentTime("COLACION")).toBe("17:30");
  });

  it("lands unknown free text on General's 12:00", () => {
    expect(resolveEatingMomentTime("Plan Diario")).toBe("12:00");
    expect(resolveEatingMomentTime("Distribuir en comidas principales")).toBe("12:00");
    expect(resolveEatingMomentTime("")).toBe("12:00");
    expect(resolveEatingMomentTime(null)).toBe("12:00");
  });
});
