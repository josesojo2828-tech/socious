import { describe, expect, it } from "vitest";
import { pediatricHistorySchema } from "./pediatric-history.schema";

describe("pediatric-history.schema", () => {
  it("acepta un form válido", () => {
    const parsed = pediatricHistorySchema.safeParse({
      gender: "MALE",
      ageYears: 8,
      weightKg: 25,
      heightCm: 128,
      sittingHeightCm: 72,
      activityFactor: 1.6,
    });
    expect(parsed.success).toBe(true);
  });

  it("rechaza peso negativo", () => {
    const parsed = pediatricHistorySchema.safeParse({
      ageYears: 8,
      weightKg: -3,
      heightCm: 128,
      sittingHeightCm: 72,
      activityFactor: 1.6,
    });
    expect(parsed.success).toBe(false);
  });

  it("rechaza talla > 250 cm", () => {
    const parsed = pediatricHistorySchema.safeParse({
      ageYears: 8,
      weightKg: 25,
      heightCm: 260,
      sittingHeightCm: 72,
      activityFactor: 1.6,
    });
    expect(parsed.success).toBe(false);
  });

  it("rechaza talla sentado > talla total", () => {
    const parsed = pediatricHistorySchema.safeParse({
      ageYears: 8,
      weightKg: 25,
      heightCm: 128,
      sittingHeightCm: 140,
      activityFactor: 1.6,
    });
    expect(parsed.success).toBe(false);
  });

  it("rechaza edad fuera de rango pediátrico", () => {
    const parsed = pediatricHistorySchema.safeParse({
      ageYears: 25,
      weightKg: 70,
      heightCm: 175,
      sittingHeightCm: 90,
      activityFactor: 1.6,
    });
    expect(parsed.success).toBe(false);
  });

  it("rechaza factor de actividad fuera de 1.2-2.0", () => {
    const base = {
      ageYears: 8,
      weightKg: 25,
      heightCm: 128,
      sittingHeightCm: 72,
    };
    expect(
      pediatricHistorySchema.safeParse({ ...base, activityFactor: 1.1 }).success,
    ).toBe(false);
    expect(
      pediatricHistorySchema.safeParse({ ...base, activityFactor: 2.1 }).success,
    ).toBe(false);
  });
});