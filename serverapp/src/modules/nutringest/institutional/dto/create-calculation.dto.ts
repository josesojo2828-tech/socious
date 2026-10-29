import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  IsArray,
  IsNumber,
  IsEnum,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { InstitutionalActivityLevel } from "@prisma/client";

export class MealConfigDto {
  @ApiProperty({ description: "Tipo de comida (ej: DESAYUNO, ALMUERZO, CENA)", example: "DESAYUNO" })
  @IsString()
  @IsNotEmpty()
  mealType: string;

  @ApiProperty({ description: "Porcentaje de calorías asignado a esta comida (ej: 35.0)", example: 35 })
  @IsNumber()
  @Min(0)
  percentage: number;

  @ApiProperty({ description: "Porcentaje de proteínas (ej: 25.0)", example: 25 })
  @IsNumber()
  @Min(0)
  proteinPercentage: number;

  @ApiProperty({ description: "Porcentaje de grasas (ej: 30.0)", example: 30 })
  @IsNumber()
  @Min(0)
  fatPercentage: number;

  @ApiProperty({ description: "Porcentaje de carbohidratos (ej: 45.0)", example: 45 })
  @IsNumber()
  @Min(0)
  carbsPercentage: number;
}

export class CreateInstitutionalCalculationDto {
  @ApiProperty({ description: "Título del cálculo o simulación", example: "Comedor Estudiantil - Winder" })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: "Descripción opcional", example: "Simulación base con 119 personas" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: "Cantidad total de personas a atender", example: 119 })
  @IsInt()
  @Min(1)
  totalPeople: number;

  @ApiProperty({ description: "Cantidad de personas de género masculino", example: 50 })
  @IsInt()
  @Min(0)
  maleCount: number;

  @ApiProperty({ description: "Cantidad de personas de género femenino", example: 69 })
  @IsInt()
  @Min(0)
  femaleCount: number;

  @ApiProperty({ description: "Muestra de pesos de la población para cálculo de promedio", example: [50, 60, 50, 51, 43, 51, 45, 50, 45] })
  @IsArray()
  @IsNumber({}, { each: true })
  sampleWeights: number[];

  @ApiProperty({ description: "Nivel de actividad física de la población", enum: InstitutionalActivityLevel, example: InstitutionalActivityLevel.MODERATE })
  @IsEnum(InstitutionalActivityLevel)
  activityLevel: InstitutionalActivityLevel;

  @ApiPropertyOptional({ description: "Factor de actividad física (requerido si es CUSTOM)", example: 30 })
  @IsOptional()
  @IsNumber()
  activityFactor?: number;

  @ApiPropertyOptional({ description: "Disciplina deportiva para el cálculo de gasto energético (METs)", example: "uuid-sport-discipline" })
  @IsOptional()
  @IsString()
  sportDisciplineId?: string;

  @ApiPropertyOptional({ description: "Minutos de entrenamiento por sesión", example: 240 })
  @IsOptional()
  @IsNumber()
  trainingMinutesPerSession?: number;

  @ApiPropertyOptional({ description: "Días de entrenamiento por semana", example: 6 })
  @IsOptional()
  @IsInt()
  trainingDaysPerWeek?: number;

  @ApiPropertyOptional({ description: "Sesiones de entrenamiento por día", example: 1 })
  @IsOptional()
  @IsInt()
  trainingSessionsPerDay?: number;

  @ApiProperty({ description: "Configuración de las comidas del día", type: [MealConfigDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MealConfigDto)
  meals: MealConfigDto[];
}
