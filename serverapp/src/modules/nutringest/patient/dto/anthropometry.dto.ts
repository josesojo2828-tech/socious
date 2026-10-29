import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsDateString,
  Min,
  Max,
  IsUUID,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Prisma } from "@prisma/client";
import { Transform } from "class-transformer";
import { Logger } from "@nestjs/common";
const logger = new Logger("anthropometry.dto");


// Helper to transform empty strings or null/undefined to undefined, and convert numeric strings to number
const TransformNumber = () =>
  Transform(({ key, value }) => {
    logger.log(`[TransformNumber] key: ${key}, value: ${JSON.stringify(value)}`);
    if (
      value === "" ||
      value === null ||
      value === undefined ||
      value === "undefined" ||
      value === "null"
    ) {
      logger.log(`[TransformNumber] returning undefined for key: ${key}`);
      return undefined;
    }
    const num = Number(value);
    const result = Number.isNaN(num) ? value : num;
    logger.log(`[TransformNumber] returning: ${result} for key: ${key}`);
    return result;
  });

// --- PRISMA TYPES ---
export type ANTHRO_WHERE = Prisma.AnthropometryWhereInput;
export type ANTHRO_CREATE = Prisma.AnthropometryCreateInput;
export type ANTHRO_UPDATE = Prisma.AnthropometryUpdateInput;
export type ANTHRO_INCLUDE = Prisma.AnthropometryInclude;
export type ANTHRO_ORDER = Prisma.AnthropometryOrderByWithRelationInput;

// --- DEFAULT INCLUDE ---
export const ANTHRO_DEFAULT_INCLUDE: ANTHRO_INCLUDE = {
  patient: { select: { firstName: true, lastName: true } },
  createdBy: {
    select: { id: true, firstName: true, lastName: true, username: true, email: true },
  },
};

// --- DTO: CREAR MEDICIÓN ---
export class CreateAnthropometryDto {
  @ApiProperty({ description: "ID del Paciente", example: "uuid-patient" })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiPropertyOptional({
    description: "ID de la consulta asociada (si aplica)",
  })
  @IsOptional()
  @IsUUID()
  consultationId?: string;

  @ApiProperty({
    description: "Fecha de la medición",
    example: "2023-10-25T10:00:00Z",
  })
  @IsDateString()
  @IsNotEmpty()
  date: string | Date;

  // --- BÁSICOS ---
  @ApiProperty({ description: "Peso en Kg", example: 75.5 })
  @TransformNumber()
  @IsNumber()
  @Min(0)
  weight: number;

  @ApiPropertyOptional({ description: "Altura en cm", example: 175 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  @Min(0)
  height?: number;

  @ApiPropertyOptional({ description: "Talla Sentado en cm", example: 90 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  sittingHeight?: number;

  @ApiPropertyOptional({ description: "Peso Habitual en Kg", example: 74.0 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  usualWeight?: number;

  @ApiPropertyOptional({ description: "Peso Ideal en Kg", example: 70.0 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  idealWeight?: number;

  @ApiPropertyOptional({ description: "Peso Ajustado en Kg", example: 72.5 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  adjustedWeight?: number;

  @ApiPropertyOptional({ description: "IMC", example: 24.6 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  bmi?: number;

  @ApiPropertyOptional({ description: "Género del Paciente", example: "MALE" })
  @IsOptional()
  @IsString()
  patientGender?: string;

  // --- CIRCUNFERENCIAS (Opcionales) ---
  @ApiPropertyOptional({ description: "Cintura en cm", example: 80 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  waist?: number;

  @ApiPropertyOptional({ description: "Cadera en cm", example: 95 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  hip?: number;

  @ApiPropertyOptional({ description: "Brazo en cm (legacy/compatible)", example: 30 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  arm?: number;

  @ApiPropertyOptional({ description: "Brazo relajado en cm", example: 30 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  c_arm_relaxed?: number;

  @ApiPropertyOptional({ description: "Brazo flexionado en cm", example: 32 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  c_arm_flexed?: number;

  @ApiPropertyOptional({ description: "Muñeca en cm", example: 16.5 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  c_wrist?: number;

  @ApiPropertyOptional({ description: "Pecho en cm", example: 90 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  c_chest?: number;

  @ApiPropertyOptional({ description: "Abdomen en cm", example: 85 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  c_abdomen?: number;

  @ApiPropertyOptional({ description: "Pantorrilla en cm", example: 35 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  c_calf?: number;

  // --- PLIEGUES (Opcionales) ---
  @ApiPropertyOptional({ description: "Pliegue Tricipital (mm)", example: 12 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  tricipital?: number;

  @ApiPropertyOptional({ description: "Pliegue Bicipital (mm)", example: 5 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  bicipital?: number;

  @ApiPropertyOptional({
    description: "Pliegue Subescapular (mm)",
    example: 15,
  })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  subscapular?: number;

  @ApiPropertyOptional({ description: "Pliegue Suprailiaco (mm)", example: 20 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  suprailiac?: number;

  @ApiPropertyOptional({ description: "Pliegue Abdominal (mm)", example: 18 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  abdominal?: number;

  @ApiPropertyOptional({ description: "Pliegue del Muslo (mm)", example: 14 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  thigh?: number;

  @ApiPropertyOptional({ description: "Pliegue de la Pierna Medial (mm)", example: 10 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  calf?: number;

  // --- COMPOSICIÓN CORPORAL (Bioimpedancia) ---
  @ApiPropertyOptional({ description: "Porcentaje de Grasa", example: 18.5 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  @Min(0)
  @Max(100)
  fatPercentage?: number;

  @ApiPropertyOptional({ description: "Masa Muscular (kg)", example: 35 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  muscleMass?: number;

  @ApiPropertyOptional({ description: "Grasa Visceral (Nivel)", example: 4 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  visceralFat?: number;

  @ApiPropertyOptional({ description: "Masa Ósea (kg)", example: 3.2 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  boneMass?: number;

  @ApiPropertyOptional({ description: "Edad Metabólica", example: 28 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  metabolicAge?: number;

  @ApiPropertyOptional({ description: "Porcentaje de Agua", example: 60 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  waterPercentage?: number;

  @ApiPropertyOptional({ description: "Envergadura de brazos (cm)", example: 178 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  armSpan?: number;

  @ApiPropertyOptional({ description: "Pliegue Supraespinal (mm)", example: 12 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  skinfoldSupraspinale?: number;

  @ApiPropertyOptional({ description: "Perímetro Muslo Medio (cm)", example: 55 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  girthThighMid?: number;

  @ApiPropertyOptional({ description: "Diámetro Húmero (cm)", example: 6.5 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  diameterHumeral?: number;

  @ApiPropertyOptional({ description: "Diámetro Biestiloideo (cm)", example: 5.2 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  diameterBiestiloid?: number;

  @ApiPropertyOptional({ description: "Diámetro Fémur (cm)", example: 9.5 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  diameterFemoral?: number;

  @ApiPropertyOptional({ description: "Masa Adiposa (kg)", example: 15.2 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  adiposeMass?: number;

  @ApiPropertyOptional({ description: "Masa Residual (kg)", example: 10.5 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  residualMass?: number;

  @ApiPropertyOptional({ description: "Endomorfia", example: 3.5 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  endomorphy?: number;

  @ApiPropertyOptional({ description: "Mesomorfia", example: 4.2 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  mesomorphy?: number;

  @ApiPropertyOptional({ description: "Ectomorfia", example: 2.1 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  ectomorphy?: number;

  @ApiPropertyOptional({ description: "Índice de Conicidad", example: 1.15 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  conicityIndex?: number;

  @ApiPropertyOptional({ description: "Índice Córmico", example: 52.5 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  cormicIndex?: number;

  @ApiPropertyOptional({ description: "Índice de Manouvrier", example: 85.5 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  manouvrierIndex?: number;

  @ApiPropertyOptional({ description: "Índice de Pérdida de Calor", example: 200 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  heatLossIndex?: number;

  @ApiPropertyOptional({ description: "Envergadura Relativa", example: 1.02 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  relativeArmSpan?: number;

  @ApiPropertyOptional({ description: "Relación Adiposo/Muscular", example: 0.5 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  adiposeMuscleIndex?: number;

  @ApiPropertyOptional({ description: "Relación Músculo/Ósea", example: 4.2 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  muscleBoneIndex?: number;
}

// --- DTO: ACTUALIZAR MEDICIÓN ---
export class UpdateAnthropometryDto extends PartialType(CreateAnthropometryDto) {}
