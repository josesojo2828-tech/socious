import {
  IsString,
  IsOptional,
  IsNumber,
  IsUUID,
  Min,
  Max,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Prisma } from "@prisma/client";
import { Transform } from "class-transformer";

// Helper: convierte cadenas vacías/nulas en undefined y strings numéricos en number
const TransformNumber = () =>
  Transform(({ key, value }) => {
    if (
      value === "" ||
      value === null ||
      value === undefined ||
      value === "undefined" ||
      value === "null"
    ) {
      return undefined;
    }
    const num = Number(value);
    return Number.isNaN(num) ? value : num;
  });

// --- PRISMA TYPES ---
export type PEDIATRIC_HISTORY_CREATE = Prisma.PediatricHistoryCreateInput;
export type PEDIATRIC_HISTORY_UPDATE = Prisma.PediatricHistoryUpdateInput;
export type PEDIATRIC_HISTORY_WHERE = Prisma.PediatricHistoryWhereInput;
export type PEDIATRIC_HISTORY_INCLUDE = Prisma.PediatricHistoryInclude;

export const PEDIATRIC_HISTORY_DEFAULT_INCLUDE: PEDIATRIC_HISTORY_INCLUDE = {
  patient: { select: { id: true, firstName: true, lastName: true } },
  createdBy: {
    select: { id: true, firstName: true, lastName: true, username: true, email: true },
  },
  infantFormulas: { where: { isActive: true }, orderBy: { createdAt: "desc" } },
};

// --- DTO: CREAR HISTORIA PEDIÁTRICA ---
export class CreatePediatricHistoryDto {
  @ApiProperty({ description: "ID del Paciente", example: "uuid-patient" })
  @IsUUID()
  patientId: string;

  @ApiPropertyOptional({ description: "Peso kg", example: 32.5 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  @Min(0)
  @Max(10000)
  weightKg?: number;

  @ApiPropertyOptional({ description: "Talla cm", example: 140 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  @Min(0)
  @Max(250)
  heightCm?: number;

  @ApiPropertyOptional({ description: "Talla sentado cm", example: 75 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  @Min(0)
  @Max(250)
  sittingHeightCm?: number;

  @ApiPropertyOptional({ description: "Factor de actividad", example: 1.5 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  @Min(0)
  @Max(10000)
  activityFactor?: number;

  @ApiPropertyOptional({ description: "Costo de crecimiento (kcal)", example: 4.7 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  @Min(0)
  @Max(10000)
  growthCost?: number;

  @ApiPropertyOptional({ description: "TMB Schofield (kcal)", example: 1100 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  @Min(0)
  @Max(10000)
  schofieldTmb?: number;

  @ApiPropertyOptional({ description: "Harris-Benedict mujer (kcal)", example: 1250 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  @Min(0)
  @Max(10000)
  harrisBenedictWoman?: number;

  @ApiPropertyOptional({ description: "Requerimiento calórico total (kcal)", example: 1650 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  @Min(0)
  @Max(10000)
  rct?: number;

  @ApiPropertyOptional({ description: "PHV Mirwald (años). Negativo = antes del pico (HASTA_PHV), positivo = después (DESDE_PHV)", example: -1.2 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  @Min(-10)
  @Max(10)
  mirwaldPhv?: number;

  @ApiPropertyOptional({ description: "Clasificación de crecimiento (zona INN-SISVAN)", example: "NORMAL" })
  @IsOptional()
  @IsString()
  growthClassification?: string;

  @ApiPropertyOptional({ description: "Tipo de gráfica", example: "DE_PIE" })
  @IsOptional()
  @IsString()
  growthChartType?: string;

  @ApiPropertyOptional({ description: "Nombre del representante", example: "María Pérez" })
  @IsOptional()
  @IsString()
  representativeName?: string;

  @ApiPropertyOptional({ description: "Teléfono del representante", example: "+54 11 5555-1234" })
  @IsOptional()
  @IsString()
  representativePhone?: string;

  @ApiPropertyOptional({ description: "Email del representante", example: "maria@example.com" })
  @IsOptional()
  @IsString()
  representativeEmail?: string;

  @ApiPropertyOptional({ description: "Parentesco del representante", example: "Madre" })
  @IsOptional()
  @IsString()
  representativeRelationship?: string;

  // --- ANAMNESIS CLÍNICA PEDIÁTRICA ADICIONAL (Permitidos por ValidationPipe) ---
  @ApiPropertyOptional({ description: "Género del paciente", example: "MALE" })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({ description: "Edad en años", example: 5 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  ageYears?: number;

  @ApiPropertyOptional({ description: "Edad en meses", example: 60 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  ageMonths?: number;

  @ApiPropertyOptional({ description: "Grado escolar", example: "Preescolar" })
  @IsOptional()
  @IsString()
  schoolGrade?: string;

  @ApiPropertyOptional({ description: "Ciudad / País", example: "Caracas, Venezuela" })
  @IsOptional()
  @IsString()
  cityCountry?: string;

  @ApiPropertyOptional({ description: "Personas con las que convive", example: "Padres y hermano" })
  @IsOptional()
  @IsString()
  cohabitants?: string;

  @ApiPropertyOptional({ description: "Perímetro cefálico (cm)", example: 48 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  headCircumferenceCm?: number;

  @ApiPropertyOptional({ description: "Perímetro braquial (cm)", example: 15 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  midUpperArmCircumferenceCm?: number;

  @ApiPropertyOptional({ description: "Pliegue tricipital (mm)", example: 10 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  tricepsSkinfoldMm?: number;

  @ApiPropertyOptional({ description: "Pliegue subescapular (mm)", example: 8 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  subscapularSkinfoldMm?: number;

  @ApiPropertyOptional({ description: "Área Total del Brazo (cm2)", example: 25.4 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  totalArmAreaCm2?: number;

  @ApiPropertyOptional({ description: "Área Muscular del Brazo (cm2)", example: 18.2 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  armMuscleAreaCm2?: number;

  @ApiPropertyOptional({ description: "Área Muscular del Brazo Corregida (cm2)", example: 11.7 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  correctedArmMuscleAreaCm2?: number;

  @ApiPropertyOptional({ description: "Área Grasa del Brazo (cm2)", example: 7.2 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  armFatAreaCm2?: number;

  @ApiPropertyOptional({ description: "Índice de Grasa Braquial (%)", example: 28.3 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  armFatIndexPercent?: number;

  @ApiPropertyOptional({ description: "Clasificación Frisancho Músculo", example: "Masa muscular promedio / adecuada" })
  @IsOptional()
  @IsString()
  frisanchoMuscleClassification?: string;

  @ApiPropertyOptional({ description: "Clasificación Frisancho Grasa", example: "Reserva grasa promedio / adecuada" })
  @IsOptional()
  @IsString()
  frisanchoFatClassification?: string;

  @ApiPropertyOptional({ description: "Edad gestacional en semanas", example: 39 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  gestationalAgeWeeks?: number;

  @ApiPropertyOptional({ description: "Peso al nacer (kg)", example: 3.2 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  birthWeightKg?: number;

  @ApiPropertyOptional({ description: "Talla al nacer (cm)", example: 50 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  birthLengthCm?: number;

  @ApiPropertyOptional({ description: "Perímetro cefálico al nacer (cm)", example: 34 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  birthHeadCircumferenceCm?: number;

  @ApiPropertyOptional({ description: "Puntuación APGAR", example: "9/10" })
  @IsOptional()
  @IsString()
  apgarScore?: string;

  @ApiPropertyOptional({ description: "Complicaciones del parto", example: "Ninguna" })
  @IsOptional()
  @IsString()
  birthComplications?: string;

  @ApiPropertyOptional({ description: "Hitos del desarrollo", example: "Adecuados para la edad" })
  @IsOptional()
  @IsString()
  developmentalMilestones?: string;

  @ApiPropertyOptional({ description: "Duración de lactancia (meses)", example: 12 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  breastfeedingDurationMonths?: number;

  @ApiPropertyOptional({ description: "Tipo de lactancia", example: "EXCLUSIVE" })
  @IsOptional()
  @IsString()
  breastfeedingType?: string;

  @ApiPropertyOptional({ description: "Inicio de alimentación complementaria (meses)", example: 6 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  complementaryFeedingStartMonths?: number;

  @ApiPropertyOptional({ description: "Detalles de introducción de alérgenos" })
  @IsOptional()
  @IsString()
  allergenIntroductionDetails?: string;

  @ApiPropertyOptional({ description: "Preferencias alimentarias" })
  @IsOptional()
  @IsString()
  foodPreferences?: string;

  @ApiPropertyOptional({ description: "Rechazos alimentarios" })
  @IsOptional()
  @IsString()
  foodRejections?: string;

  @ApiPropertyOptional({ description: "Come en familia", example: true })
  @IsOptional()
  eatsWithFamily?: boolean;

  @ApiPropertyOptional({ description: "Come frente a pantallas", example: false })
  @IsOptional()
  eatsWithScreens?: boolean;

  @ApiPropertyOptional({ description: "Duración de comida en minutos", example: 25 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  mealDurationMinutes?: number;

  @ApiPropertyOptional({ description: "Horas de sueño", example: 10 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  sleepHours?: number;

  @ApiPropertyOptional({ description: "Horas de pantalla por día", example: 1 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  screenTimeHoursPerDay?: number;

  @ApiPropertyOptional({ description: "Actividad física estructurada" })
  @IsOptional()
  @IsString()
  structuredPhysicalActivity?: string;

  @ApiPropertyOptional({ description: "Síntomas gastrointestinales", example: [] })
  @IsOptional()
  giSymptoms?: any;

  @ApiPropertyOptional({ description: "Escala Bristol (1 a 7)", example: 4 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  bristolStoolType?: number;

  @ApiPropertyOptional({ description: "Frecuencia evacuatoria", example: "1 vez al día" })
  @IsOptional()
  @IsString()
  bowelFrequency?: string;

  @ApiPropertyOptional({ description: "Hallazgos clínicos NFPE" })
  @IsOptional()
  @IsString()
  clinicalFindings?: string;

  @ApiPropertyOptional({ description: "Diagnóstico PES" })
  @IsOptional()
  @IsString()
  pesDiagnosis?: string;

  @ApiPropertyOptional({ description: "Nivel de riesgo nutricional", example: "BAJO" })
  @IsOptional()
  @IsString()
  nutritionalRiskLevel?: string;

  @ApiPropertyOptional({ description: "Prioridades de intervención" })
  @IsOptional()
  @IsString()
  interventionPriorities?: string;
}

// --- DTO: ACTUALIZAR HISTORIA PEDIÁTRICA ---
export class UpdatePediatricHistoryDto extends PartialType(CreatePediatricHistoryDto) {}
