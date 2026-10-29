import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsDateString,
  IsArray,
  ValidateNested,
  IsEnum,
  Min,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Prisma, PlanStatus } from "@prisma/client";
import { EXCHANGE_LIST_DEFAULT_INCLUDE } from "../../exchange-list/dto/exchange-list.type";
import { MENU_DEFAULT_INCLUDE } from "../../menu/dto/menu.type";

// --- PRISMA TYPES ---
export type PLAN_WHERE = Prisma.NutritionalPlanWhereInput;
export type PLAN_INCLUDE = Prisma.NutritionalPlanInclude;
export type PLAN_CREATE = Prisma.NutritionalPlanCreateInput;
export type PLAN_UPDATE = Prisma.NutritionalPlanUpdateInput;

export const PLAN_DEFAULT_INCLUDE: PLAN_INCLUDE = {
  _count: {
    select: {
      assignedLists: true,
      assignedMenus: true,
      supplements: true,
      days: true,
    },
  },
  patient: true,
  createdBy: {
    select: { id: true, firstName: true, lastName: true, username: true, email: true },
  },
  // Archived/deleted menus and exchange lists stay assigned in the database but
  // are never rendered in a plan, so patients cannot see them.
  assignedLists: {
    where: { exchangeList: { archivedAt: null, deletedAt: null } },
    include: { exchangeList: { include: EXCHANGE_LIST_DEFAULT_INCLUDE } },
  },
  supplements: true,
  assignedMenus: {
    where: { menu: { archivedAt: null, deletedAt: null } },
    include: { menu: { include: MENU_DEFAULT_INCLUDE } },
  },
};

// --- SUB-DTOs PARA ASIGNACIONES ---

export class AssignMenuDto {
  @ApiProperty({ description: "ID del Menú a asignar" })
  @IsString()
  @IsNotEmpty()
  menuId: string;

  @ApiPropertyOptional({
    description: "Momento de consumo",
    example: "Desayuno",
  })
  @IsOptional()
  @IsString()
  eatingMoment?: string;

  @ApiPropertyOptional({
    description: "Notas específicas",
    example: "Solo días de entreno",
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class AssignExchangeListDto {
  @ApiProperty({ description: "ID de la Lista de Intercambio" })
  @IsString()
  @IsNotEmpty()
  exchangeListId: string;

  @ApiProperty({
    description: "Cantidad de porciones/intercambios",
    example: 2.5,
  })
  @IsNumber()
  @Min(0)
  portions: number;

  @ApiPropertyOptional({ description: "Momento de consumo", example: "Cena" })
  @IsOptional()
  @IsString()
  eatingMoment?: string;
}

export class AssignSupplementDto {
  @ApiProperty({
    description: "Nombre del suplemento",
    example: "Creatina Monohidratada",
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: "Dosis", example: "5g" })
  @IsString()
  @IsNotEmpty()
  dose: string;

  @ApiProperty({ description: "Frecuencia", example: "Diario post-entreno" })
  @IsString()
  @IsNotEmpty()
  frequency: string;

  @ApiPropertyOptional({ description: "Marca sugerida" })
  @IsOptional()
  @IsString()
  brand?: string;
}

// --- DTO PRINCIPAL: CREAR PLAN ---

export class CreateNutritionalPlanDto {
  @ApiProperty({ description: "ID del Paciente" })
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({
    description: "Nombre del plan",
    example: "Plan Déficit Mes 1",
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: "Estado", default: PlanStatus.ACTIVE })
  @IsOptional()
  @IsEnum(PlanStatus)
  status?: PlanStatus;

  @ApiPropertyOptional({ description: "Fecha de inicio del plan" })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  // --- OBJETIVOS NUTRICIONALES ---
  @ApiProperty({ description: "Objetivo Calórico", example: 2000 })
  @IsNumber()
  @Min(0)
  kcalTarget: number;

  @ApiProperty({ description: "Objetivo Proteína (g)", example: 150 })
  @IsNumber()
  @Min(0)
  proteinTarget: number;

  @ApiProperty({ description: "Objetivo Carbohidratos (g)", example: 250 })
  @IsNumber()
  @Min(0)
  carbsTarget: number;

  @ApiProperty({ description: "Objetivo Grasas (g)", example: 60 })
  @IsNumber()
  @Min(0)
  fatsTarget: number;

  @ApiPropertyOptional({
    description: "Recomendaciones generales (Texto plano)",
  })
  @IsOptional()
  @IsString()
  recommendations?: string;

  @ApiPropertyOptional({
    description: "Meta de agua diaria (ml)",
    example: 2500,
  })
  @IsOptional()
  @IsNumber()
  waterIntake?: number;

  @ApiPropertyOptional({
    description: "Recomendaciones de agua",
  })
  @IsOptional()
  @IsString()
  waterRecommendation?: string;

  @ApiPropertyOptional({
    description: "Recomendaciones de actividad física",
  })
  @IsOptional()
  @IsString()
  activityRecommendation?: string;

  @ApiPropertyOptional({
    description: "Recomendaciones de sueño y descanso",
  })
  @IsOptional()
  @IsString()
  sleepRecommendation?: string;

  // --- ASIGNACIONES ---

  @ApiPropertyOptional({ type: [AssignMenuDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssignMenuDto)
  assignedMenus?: AssignMenuDto[];

  @ApiPropertyOptional({ type: [AssignExchangeListDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssignExchangeListDto)
  assignedLists?: AssignExchangeListDto[];

  @ApiPropertyOptional({ type: [AssignSupplementDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssignSupplementDto)
  supplements?: AssignSupplementDto[];
}
