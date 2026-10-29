import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsEnum,
  IsNumber,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Prisma, DietStatus } from "@prisma/client";

// --- PRISMA TYPES ---
export type DIET_LEGACY_WHERE = Prisma.DietPlanWhereInput;
export type DIET_LEGACY_INCLUDE = Prisma.DietPlanInclude;

export const DIET_LEGACY_DEFAULT_INCLUDE: DIET_LEGACY_INCLUDE = {
  days: {
    include: {
      meals: {
        include: {
          foods: { include: { food: true } },
        },
      },
    },
  },
};

// --- DTO ---
export class CreateLegacyDietPlanDto {
  @ApiProperty({ description: "ID del Paciente" })
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({
    description: "Nombre de la dieta",
    example: "Dieta Keto Estricta",
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: "Fecha Inicio" })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiPropertyOptional({ description: "Fecha Fin" })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ enum: DietStatus, default: DietStatus.ACTIVE })
  @IsOptional()
  @IsEnum(DietStatus)
  status?: DietStatus;

  @ApiPropertyOptional({ description: "Kcal Totales Calculadas" })
  @IsOptional()
  @IsNumber()
  totalKcal?: number;

  // Nota: La creación anidada de días/comidas/alimentos
  // suele ser compleja para un solo DTO, se recomienda manejarla
  // en endpoints separados o con un JSON 'macroSplit' si es estructura libre.
}
