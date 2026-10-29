/**
 * pediatric-history.schema.ts
 *
 * Validación Zod v4 del form de historia pediátrica del paciente.
 * Basado en la Anamnesis Nutricional Clínica Pediátrica (OMS/AAP).
 */
import { z } from "zod";

// Helper: convierte strings vacíos, nulls, NaN a undefined para campos numéricos opcionales
const optionalNumber = <T extends z.ZodType<number, any, any>>(schema: T) =>
  z.preprocess((val) => {
    if (val === "" || val === null || val === undefined || (typeof val === "number" && Number.isNaN(val))) {
      return undefined;
    }
    return val;
  }, schema.optional());

// Helper: convierte strings vacíos o null a undefined para enums opcionales
const optionalEnum = <T extends [string, ...string[]]>(values: T) =>
  z.preprocess((val) => {
    if (val === "" || val === null || val === undefined) return undefined;
    return val;
  }, z.enum(values).optional());

export const pediatricHistorySchema = z
  .object({
    // 1. Identificación y Contexto Familiar
    gender: optionalEnum(["MALE", "FEMALE", "OTHER"]),
    ageYears: z.coerce
      .number()
      .min(0, "La edad no puede ser negativa")
      .max(18, "Edad fuera del rango pediátrico"),
    ageMonths: optionalNumber(
      z.coerce
        .number()
        .min(0, "La edad en meses no puede ser negativa")
        .max(216, "Edad fuera de rango (máximo 216 meses)")
    ),
    schoolGrade: z.string().optional(),
    cityCountry: z.string().optional(),
    representativeName: z.string().optional(),
    representativePhone: z.string().optional(),
    representativeEmail: z.string().optional(),
    representativeRelationship: z.string().optional(),
    cohabitants: z.string().optional(),

    // 2. Antropometría Pediátrica
    weightKg: z.coerce.number().positive("El peso debe ser mayor a 0"),
    heightCm: z.coerce
      .number()
      .positive("La talla debe ser mayor a 0")
      .max(250, "Talla imposible (máximo 250 cm)"),
    sittingHeightCm: optionalNumber(
      z.coerce
        .number()
        .positive("La talla sentado debe ser mayor a 0")
        .max(250, "Talla imposible (máximo 250 cm)")
    ),
    headCircumferenceCm: optionalNumber(z.coerce.number().positive("El perímetro cefálico debe ser positivo")),
    midUpperArmCircumferenceCm: optionalNumber(z.coerce.number().positive("El perímetro braquial debe ser positivo")),
    tricepsSkinfoldMm: optionalNumber(z.coerce.number().positive("El pliegue tricipital debe ser positivo")),
    subscapularSkinfoldMm: optionalNumber(z.coerce.number().positive("El pliegue subescapular debe ser positivo")),
    activityFactor: z.coerce
      .number()
      .min(1.2, "Factor de actividad mínimo 1.2")
      .max(2.0, "Factor de actividad máximo 2.0"),
    growthClassification: z.string().optional(),
    growthChartType: optionalEnum(["ACOSTADO", "DE_PIE"]),
    mirwaldPhv: optionalNumber(z.coerce.number()),

    // 3. Antecedentes Perinatales y Desarrollo
    gestationalAgeWeeks: optionalNumber(z.coerce.number().min(20, "Mínimo 20 semanas").max(45, "Máximo 45 semanas")),
    birthWeightKg: optionalNumber(z.coerce.number().positive("El peso al nacer debe ser mayor a 0")),
    birthLengthCm: optionalNumber(z.coerce.number().positive("La talla al nacer debe ser mayor a 0")),
    birthHeadCircumferenceCm: optionalNumber(z.coerce.number().positive("El perímetro cefálico debe ser mayor a 0")),
    apgarScore: z.string().optional(),
    birthComplications: z.string().optional(),
    developmentalMilestones: z.string().optional(),

    // 4. Historia de Alimentación y Lactancia
    breastfeedingDurationMonths: optionalNumber(z.coerce.number().min(0, "Los meses no pueden ser negativos")),
    breastfeedingType: optionalEnum(["EXCLUSIVE", "MIXED", "WEANED", "NONE"]),
    complementaryFeedingStartMonths: optionalNumber(z.coerce.number().min(0, "Los meses no pueden ser negativos")),
    allergenIntroductionDetails: z.string().optional(),
    foodPreferences: z.string().optional(),
    foodRejections: z.string().optional(),

    // 5. Conducta Alimentaria y Estilo de Vida
    eatsWithFamily: z.boolean().optional(),
    eatsWithScreens: z.boolean().optional(),
    mealDurationMinutes: optionalNumber(z.coerce.number().min(0, "La duración no puede ser negativa")),
    sleepHours: optionalNumber(z.coerce.number().min(0, "Mínimo 0").max(24, "Máximo 24")),
    screenTimeHoursPerDay: optionalNumber(z.coerce.number().min(0, "Mínimo 0").max(24, "Máximo 24")),
    structuredPhysicalActivity: z.string().optional(),

    // 6. Síntomas Gastrointestinales & Hábito Intestinal
    giSymptoms: z.array(z.string()).optional(),
    bristolStoolType: optionalNumber(z.coerce.number().min(1, "Tipo Bristol entre 1 y 7").max(7, "Tipo Bristol entre 1 y 7")),
    bowelFrequency: z.string().optional(),

    // 7. Evaluación Clínica Orientada a Nutrición (NFPE) & Diagnóstico PES
    clinicalFindings: z.string().optional(),
    pesDiagnosis: z.string().optional(),
    nutritionalRiskLevel: optionalEnum(["BAJO", "MODERADO", "ALTO"]),
    interventionPriorities: z.string().optional(),
  })
  .refine(
    (data) => !data.sittingHeightCm || data.sittingHeightCm <= data.heightCm,
    {
      message: "La talla sentado no puede superar la talla total",
      path: ["sittingHeightCm"],
    }
  );

export type PediatricHistoryFormData = z.infer<typeof pediatricHistorySchema>;