import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  ArrayNotEmpty,
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
export type SPORTS_HISTORY_CREATE = Prisma.SportsHistoryCreateInput;
export type SPORTS_HISTORY_UPDATE = Prisma.SportsHistoryUpdateInput;
export type SPORTS_HISTORY_WHERE = Prisma.SportsHistoryWhereInput;
export type SPORTS_HISTORY_INCLUDE = Prisma.SportsHistoryInclude;

export const SPORTS_HISTORY_DEFAULT_INCLUDE: SPORTS_HISTORY_INCLUDE = {
  patient: { select: { id: true, firstName: true, lastName: true } },
  createdBy: {
    select: { id: true, firstName: true, lastName: true, username: true, email: true },
  },
  disciplines: { include: { sportDiscipline: true } },
};

// --- DTO: CREAR HISTORIA DEPORTIVA ---
export class CreateSportsHistoryDto {
  @ApiProperty({ description: "ID del Paciente", example: "uuid-patient" })
  @IsUUID()
  patientId: string;

  @ApiProperty({ description: "IDs de disciplinas deportivas", type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID("4", { each: true })
  disciplineIds: string[];

  @ApiPropertyOptional({
    description: "Minutos por sesión de entrenamiento",
    example: 60,
  })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  @Min(0)
  trainingMinutesPerSession?: number;

  @ApiPropertyOptional({ description: "Días de entrenamiento por semana", example: 5 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  @Min(0)
  @Max(7)
  trainingDaysPerWeek?: number;

  @ApiPropertyOptional({ description: "Sesiones de entrenamiento por día", example: 1 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  @Min(0)
  trainingSessionsPerDay?: number;

  @ApiPropertyOptional({ description: "Nivel competitivo", example: "PROFESIONAL" })
  @IsOptional()
  @IsString()
  competitionLevel?: string;

  @ApiPropertyOptional({ description: "Antecedentes deportivos (texto)", example: "Deportista desde los 8 años..." })
  @IsOptional()
  @IsString()
  background?: string;

  @ApiPropertyOptional({ description: "Objetivos (lista de strings)", type: [String], example: ["Mejora del rendimiento"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  goals?: string[];

  @ApiPropertyOptional({ description: "Valoración RED-S/EA/macros (texto)", example: "RMR Cunningham: 1700 kcal/día..." })
  @IsOptional()
  @IsString()
  assessment?: string;

  @ApiPropertyOptional({ description: "Peso del paciente en kg", example: 70 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  @Min(0)
  @Max(1000)
  weightKg?: number;

  @ApiPropertyOptional({ description: "Porcentaje de grasa corporal", example: 15 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  @Min(0)
  @Max(100)
  fatPercentage?: number;

  @ApiPropertyOptional({ description: "FFM manual kg (fallback AD5)", example: 55 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  @Min(0)
  @Max(10000)
  ffmKg?: number;

  @ApiPropertyOptional({ description: "TMB Cunningham (kcal)", example: 1700 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  @Min(0)
  @Max(10000)
  cunninghamRmr?: number;

  @ApiPropertyOptional({ description: "Gasto energético METs (kcal)", example: 1347.4 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  @Min(0)
  @Max(10000)
  metsExpenditure?: number;
}

// --- DTO: ACTUALIZAR HISTORIA DEPORTIVA ---
export class UpdateSportsHistoryDto extends PartialType(CreateSportsHistoryDto) {}
