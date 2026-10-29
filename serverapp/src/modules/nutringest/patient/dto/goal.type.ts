import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsDateString,
  IsEnum,
  IsBoolean,
  IsUUID,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Prisma, GoalType } from "@prisma/client";

// --- PRISMA TYPES ---
export type GOAL_WHERE = Prisma.GoalWhereInput;
export type GOAL_CREATE = Prisma.GoalCreateInput;
export type GOAL_UPDATE = Prisma.GoalUpdateInput;
export type GOAL_INCLUDE = Prisma.GoalInclude;

// --- DEFAULT INCLUDE ---
export const GOAL_DEFAULT_INCLUDE: GOAL_INCLUDE = {
  createdBy: {
    select: { id: true, firstName: true, lastName: true, username: true, email: true },
  },
};

// --- DTO: CREAR META ---
export class CreateGoalDto {
  @ApiProperty({ description: "ID del Paciente" })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ description: "Título de la meta", example: "Bajar a 70kg" })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    enum: GoalType,
    description: "Tipo de meta",
    example: GoalType.WEIGHT,
  })
  @IsEnum(GoalType)
  @IsNotEmpty()
  type: GoalType;

  @ApiPropertyOptional({ description: "Valor inicial", example: 85 })
  @IsOptional()
  @IsNumber()
  startValue?: number;

  @ApiPropertyOptional({ description: "Valor objetivo", example: 70 })
  @IsOptional()
  @IsNumber()
  targetValue?: number;

  @ApiPropertyOptional({ description: "Fecha límite", example: "2023-12-31" })
  @IsOptional()
  @IsDateString()
  deadline?: string | Date;

  @ApiPropertyOptional({ description: "Descripción detallada", example: "Beber 2 litros de agua por día" })
  @IsOptional()
  @IsString()
  description?: string;
}

// --- DTO: ACTUALIZAR META (PROGRESO) ---
export class UpdateGoalDto {
  @ApiPropertyOptional({ description: "Valor actual (Progreso)", example: 78 })
  @IsOptional()
  @IsNumber()
  currentValue?: number;

  @ApiPropertyOptional({ description: "¿Meta alcanzada?", example: false })
  @IsOptional()
  @IsBoolean()
  isAchieved?: boolean;

  @ApiPropertyOptional({ description: "Descripción detallada", example: "Nueva descripción..." })
  @IsOptional()
  @IsString()
  description?: string;
}
