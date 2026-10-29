import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreatePediatricHistoryDto } from "./pediatric-history.dto";

const VALID_UUID = "123e4567-e89b-12d3-a456-426614174000";

async function validatePediatricDto(overrides: Record<string, unknown> = {}) {
  const dto = plainToInstance(CreatePediatricHistoryDto, {
    patientId: VALID_UUID,
    ...overrides,
  });
  return validate(dto);
}

describe("CreatePediatricHistoryDto — rango de validación (F2.6)", () => {
  describe("mirwaldPhv (PHV Mirwald)", () => {
    it("acepta un PHV negativo (pre-pico, HASTA_PHV)", async () => {
      const errors = await validatePediatricDto({ mirwaldPhv: -3.2 });
      expect(errors.length).toBe(0);
    });

    it("acepta un PHV positivo (post-pico, DESDE_PHV)", async () => {
      const errors = await validatePediatricDto({ mirwaldPhv: 2.5 });
      expect(errors.length).toBe(0);
    });

    it("rechaza un PHV por encima de +10 años", async () => {
      const errors = await validatePediatricDto({ mirwaldPhv: 15 });
      expect(errors.length).toBeGreaterThan(0);
    });

    it("rechaza un PHV por debajo de −10 años", async () => {
      const errors = await validatePediatricDto({ mirwaldPhv: -15 });
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("campos numéricos clínicos", () => {
    it("acepta valores en rango válido (peso, tallas, FA, energéticos)", async () => {
      const errors = await validatePediatricDto({
        weightKg: 52,
        heightCm: 162,
        sittingHeightCm: 84,
        activityFactor: 1.6,
        schofieldTmb: 1380.4,
        harrisBenedictWoman: 1455.2,
        rct: 2208.64,
      });
      expect(errors.length).toBe(0);
    });

    it("rechaza talla mayor a 250 cm", async () => {
      const errors = await validatePediatricDto({ heightCm: 300 });
      expect(errors.length).toBeGreaterThan(0);
    });

    it("rechaza peso negativo", async () => {
      const errors = await validatePediatricDto({ weightKg: -5 });
      expect(errors.length).toBeGreaterThan(0);
    });

    it("acepta campos antropométricos y Frisancho válidos", async () => {
      const errors = await validatePediatricDto({
        headCircumferenceCm: 48.5,
        midUpperArmCircumferenceCm: 16.5,
        tricepsSkinfoldMm: 9.0,
        subscapularSkinfoldMm: 7.5,
        totalArmAreaCm2: 21.67,
        armMuscleAreaCm2: 15.11,
        correctedArmMuscleAreaCm2: 5.11,
        armFatAreaCm2: 6.56,
        armFatIndexPercent: 30.27,
        frisanchoMuscleClassification: "Masa muscular promedio / adecuada",
        frisanchoFatClassification: "Reserva grasa promedio / adecuada",
      });
      expect(errors.length).toBe(0);
    });
  });
});
