import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  Min,
  Max,
} from "class-validator";
import { ApiPropertyOptional, PartialType } from "@nestjs/swagger";
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
export type INFANT_FORMULA_CREATE = Prisma.InfantFormulaHistoryCreateInput;
export type INFANT_FORMULA_UPDATE = Prisma.InfantFormulaHistoryUpdateInput;
export type INFANT_FORMULA_WHERE = Prisma.InfantFormulaHistoryWhereInput;
export type INFANT_FORMULA_INCLUDE = Prisma.InfantFormulaHistoryInclude;

export const INFANT_FORMULA_DEFAULT_INCLUDE: INFANT_FORMULA_INCLUDE = {
  pediatricHistory: { select: { id: true, patientId: true } },
  createdBy: {
    select: { id: true, firstName: true, lastName: true, username: true, email: true },
  },
};

// --- DTO: CREAR FÓRMULA LÁCTEA ---
export class CreateInfantFormulaDto {
  @ApiPropertyOptional({ description: "Capacidad del biberón (ml)", example: 180 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  @Min(0)
  @Max(10000)
  capacityMl?: number;

  @ApiPropertyOptional({ description: "Volumen diario (ml)", example: 600 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  @Min(0)
  @Max(10000)
  dailyVolumeMl?: number;

  @ApiPropertyOptional({ description: "Densidad calórica (kcal/ml)", example: 0.67 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  @Min(0)
  @Max(10000)
  densityKcalPerMl?: number;

  @ApiPropertyOptional({ description: "Frecuencia de alimentación diaria", example: 4 })
  @IsOptional()
  @TransformNumber()
  @IsNumber()
  @Min(0)
  @Max(10000)
  feedingFrequency?: number;

  @ApiPropertyOptional({ description: "Tipo de fórmula", example: "INICIO" })
  @IsOptional()
  @IsString()
  formulaType?: string;

  @ApiPropertyOptional({ description: "Fecha", example: "2026-01-15T10:00:00Z" })
  @IsOptional()
  @IsDateString()
  date?: string | Date;
}

// --- DTO: ACTUALIZAR FÓRMULA LÁCTEA ---
export class UpdateInfantFormulaDto extends PartialType(CreateInfantFormulaDto) {}
