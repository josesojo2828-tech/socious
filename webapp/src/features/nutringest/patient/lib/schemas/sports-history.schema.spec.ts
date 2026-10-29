import { describe, expect, it } from "vitest";
import { disciplinePracticeSchema, sportsHistorySchema } from "./sports-history.schema";

describe("sports-history.schema", () => {
  it("acepta un form válido", () => {
    const parsed = sportsHistorySchema.safeParse({
      practices: [
        {
          disciplineId: "discipline-1",
          trainingMinutesPerSession: 120,
          trainingDaysPerWeek: 3,
          trainingSessionsPerDay: 1,
        },
      ],
      weightKg: 75,
      fatPercentage: 20,
      ffmKg: 60,
      goals: ["aumentar masa muscular"],
      competitionLevel: "REGIONAL",
    });
    expect(parsed.success).toBe(true);
  });

  it("valida disciplinePracticeSchema correctamente", () => {
    const invalidPractice = disciplinePracticeSchema.safeParse({
      disciplineId: "",
      trainingMinutesPerSession: 120,
      trainingDaysPerWeek: 3,
      trainingSessionsPerDay: 1,
    });
    expect(invalidPractice.success).toBe(false);

    const validPractice = disciplinePracticeSchema.safeParse({
      disciplineId: "disc-1",
      trainingMinutesPerSession: 60,
      trainingDaysPerWeek: 4,
      trainingSessionsPerDay: 1,
    });
    expect(validPractice.success).toBe(true);
  });

  it("rechaza peso negativo", () => {
    const parsed = sportsHistorySchema.safeParse({
      weightKg: -5,
    });
    expect(parsed.success).toBe(false);
  });

  it("rechaza FFM negativa", () => {
    const parsed = sportsHistorySchema.safeParse({
      weightKg: 75,
      ffmKg: -10,
    });
    expect(parsed.success).toBe(false);
  });

  it("rechaza carga inválida (días fuera de 1-7, minutos ≤ 0)", () => {
    expect(
      disciplinePracticeSchema.safeParse({
        disciplineId: "discipline-1",
        trainingDaysPerWeek: 8,
        trainingMinutesPerSession: 120,
        trainingSessionsPerDay: 1,
      }).success,
    ).toBe(false);

    expect(
      disciplinePracticeSchema.safeParse({
        disciplineId: "discipline-1",
        trainingDaysPerWeek: 3,
        trainingMinutesPerSession: 0,
        trainingSessionsPerDay: 1,
      }).success,
    ).toBe(false);
  });
});