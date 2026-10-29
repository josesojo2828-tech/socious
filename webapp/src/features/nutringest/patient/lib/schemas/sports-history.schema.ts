/**
 * sports-history.schema.ts
 *
 * Validación Zod v4 del form de historia deportiva del paciente.
 * Basado en el Cuestionario Integral para Atletas/Deportistas (EVANUTDEP).
 */
import { z } from "zod";

export const disciplinePracticeSchema = z.object({
  disciplineId: z.string().min(1, "Debes seleccionar una disciplina"),
  disciplineName: z.string().optional(),
  metValue: z.number().optional(),
  category: z.string().optional(),
  trainingMinutesPerSession: z.coerce
    .number()
    .positive("Los minutos por sesión deben ser mayores a 0"),
  trainingDaysPerWeek: z.coerce
    .number()
    .int("Los días por semana deben ser enteros")
    .min(1, "Debe entrenar al menos 1 día por semana")
    .max(7, "Máximo 7 días por semana"),
  trainingSessionsPerDay: z.coerce
    .number()
    .int("Las sesiones por día deben ser enteras")
    .min(1, "Debe haber al menos 1 sesión por día"),
  goal: z.string().optional(),
  competitionLevel: z.string().optional(),
});

export const sportsHistorySchema = z.object({
  // 1. Datos Básicos & Antecedentes
  background: z.string().optional(),
  occupation: z.string().optional(),

  // 2. Disciplinas & Datos del Deporte
  practices: z
    .array(disciplinePracticeSchema)
    .optional()
    .default([]),
  specificModalities: z.string().optional(),
  upcomingEvents: z.string().optional(),

  // 3. Evaluación Antropométrica
  heightCm: z.coerce.number().positive().optional(),
  weightKg: z.coerce.number().positive("El peso debe ser mayor a 0").optional(),
  previousWeightKg: z.coerce.number().positive().optional(),
  recurrentWeightKg: z.coerce.number().positive().optional(),
  fatPercentage: z.coerce
    .number()
    .min(0, "El porcentaje de grasa no puede ser negativo")
    .max(100, "El porcentaje de grasa no puede superar 100")
    .optional(),
  ffmKg: z.coerce
    .number()
    .min(0, "La masa libre de grasa no puede ser negativa")
    .optional(),
  hasRecentAnthropometry: z.boolean().optional(),
  anthropometryResults: z.string().optional(),

  // 4. Etapa e Intensidad del Entrenamiento
  trainingStage: z
    .enum(["PREPARACION_GENERAL", "COMPETENCIA", "MANTENIMIENTO", "RECUPERACION"])
    .optional(),
  trainingIntensity: z
    .enum(["MUY_BAJA", "BAJA", "MODERADA", "ALTA", "MUY_ALTA"])
    .optional(),
  recoveryCapacity: z
    .enum(["MUY_BUENA", "BUENA", "REGULAR", "MALA"])
    .optional(),
  crossTrainingFrequency: z
    .enum(["NUNCA", "OCASIONAL", "REGULAR"])
    .optional(),
  crossTrainingDescription: z.string().optional(),

  // 5. Antecedentes Médicos & Lesiones
  hasMedicalCondition: z.boolean().optional(),
  medicalConditionDetails: z.string().optional(),
  hasPastInjuries: z.boolean().optional(),
  injuryType: z.string().optional(),
  injuryDate: z.string().optional(),
  injuryTreatment: z.string().optional(),
  injuryTrainingChanges: z.boolean().optional(),

  // 6. Signos y Síntomas Clínicos
  symptoms: z.array(z.string()).optional(),
  physicalChangesNoticed: z.string().optional(),

  // 7. Hábitos Psicobiológicos
  stressManagementFrequency: z
    .enum(["NUNCA", "RARA_VEZ", "ALGUNAS_VECES", "FRECUENTEMENTE", "SIEMPRE"])
    .optional(),
  emotionalWellbeingScore: z.coerce.number().min(1).max(5).optional(),
  hasPerformancePressure: z.boolean().optional(),
  pressureManagementDetails: z.string().optional(),

  // 8. Hábitos Hídricos
  dailyFluidLiters: z.coerce.number().min(0).optional(),
  frequentFluidTypes: z.array(z.string()).optional(),
  isHydratedDuringExercise: z.boolean().optional(),
  exerciseHydrationDetails: z.string().optional(),

  // 9. Hábitos Alimentarios & Peso
  weightGoal: z
    .enum(["PERDER_PESO", "MANTENER_PESO", "GANAR_MASA", "SIN_OBJETIVO"])
    .optional(),
  weightControlMethod: z
    .enum(["BALANZA", "MEDIDAS_CORPORALES", "COMPOSICION_CORPORAL", "NO_CONTROLA"])
    .optional(),
  hasRecentWeightChange: z.boolean().optional(),
  recentWeightChangeDetails: z.string().optional(),
  eatingOutFrequency: z
    .enum(["NUNCA", "1_2_VECES", "3_4_VECES", "5_O_MAS"])
    .optional(),

  // 10. Suplementación & Día Típico
  usesSupplements: z.boolean().optional(),
  supplementDetails: z.string().optional(),
  dailyMeals: z
    .object({
      breakfast: z.string().optional(),
      lunch: z.string().optional(),
      dinner: z.string().optional(),
      snacks: z.string().optional(),
    })
    .optional(),

  // 11. Bioquímica & Laboratorios
  hasRecentBloodTest: z.boolean().optional(),
  labHemoglobin: z.string().optional(),
  labGlucose: z.string().optional(),
  labTotalCholesterol: z.string().optional(),
  labTriglycerides: z.string().optional(),
  labOthers: z.string().optional(),
  hasAccessToPastLabs: z.boolean().optional(),
  isReviewedByProfessional: z.boolean().optional(),

  // Compatibilidad legacy
  goals: z.array(z.string()).optional(),
  competitionLevel: z.string().optional(),
});

export type SportsHistoryFormData = z.infer<typeof sportsHistorySchema>;