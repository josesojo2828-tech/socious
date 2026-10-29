import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  IsInt,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Prisma, Gender, ActivityLevel } from "@prisma/client";
import { MenuCategory } from "src/shared/types/schema.types";

// --- PRISMA TYPES ---
export type EXCHANGE_LIST_WHERE = Prisma.ExchangeListWhereInput;
export type EXCHANGE_LIST_WHERE_UNIQUE = Prisma.ExchangeListWhereUniqueInput;
export type EXCHANGE_LIST_CREATE = Prisma.ExchangeListCreateInput;
export type EXCHANGE_LIST_UPDATE = Prisma.ExchangeListUpdateInput;
export type EXCHANGE_LIST_WITH_ID = { id: string };
export type EXCHANGE_LIST_INCLUDE = Prisma.ExchangeListInclude;
export type EXCHANGE_LIST_ORDER = Prisma.ExchangeListOrderByWithRelationInput;

// --- SWAGGER RESPONSE TYPES ---

export interface ExchangeListResponseDto {
  id: string;
  nutritionistId?: string;
  name: string;
  description?: string;
  baseKcal: number;
  baseCarbs?: number;
  baseProtein?: number;
  baseFat?: number;
  organizationId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// --- DEFAULT INCLUDE ---
export const EXCHANGE_LIST_DEFAULT_INCLUDE: EXCHANGE_LIST_INCLUDE = {
  nutritionist: true,
  createdBy: {
    select: { id: true, firstName: true, lastName: true, username: true, email: true },
  },
  _count: {
    select: {
      items: true,
    },
  },
  items: {
    include: {
      foodExchangeList: true,
    },
  },
};

// DTO para cada ítem de la lista de intercambio
export class CreateExchangeListItemDto {
  @ApiProperty({ description: "ID del alimento", example: "uuid-food-1" })
  @IsString()
  @IsNotEmpty()
  foodId: string;

  @ApiProperty({
    description: "Cantidad que equivale a 1 intercambio",
    example: 30,
  })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({
    description: "Descripción visual de la porción",
    example: "1 rebanada",
  })
  @IsOptional()
  @IsString()
  servingLabel?: string;

  @ApiPropertyOptional({
    description:
      "Descripción del grupo de alimentos intercambiables. Null para items individuales.",
  })
  @IsOptional()
  @IsString()
  groupLabel?: string;

  @ApiPropertyOptional({
    description: "Estado de cocción: 'CRUDO' o 'COCIDO'. Null si no aplica.",
  })
  @IsOptional()
  @IsString()
  cookingState?: string;
}

// DTO Principal
export class CreateExchangeListDto {
  @ApiProperty({
    description: "Nombre de la lista",
    example: "Cereales y Tubérculos",
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  // --- PATRÓN NUTRICIONAL DEL GRUPO ---
  @ApiPropertyOptional({
    description: "Calorías promedio por intercambio",
    example: 70,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  baseKcal?: number;

  @ApiPropertyOptional({ description: "Carbohidratos promedio", example: 15 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  baseCarbs?: number;

  @ApiPropertyOptional({ description: "Proteína promedio", example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  baseProtein?: number;

  @ApiPropertyOptional({ description: "Grasa promedio", example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  baseFat?: number;

  @ApiPropertyOptional({
    description: "Indica si la lista es parte de la comunidad",
    default: false,
  })
  @IsOptional()
  isCommunity?: boolean;

  @ApiPropertyOptional({
    description: "ID de la lista original desde la cual fue importada",
  })
  @IsOptional()
  @IsString()
  importedFromId?: string;

  @ApiPropertyOptional({
    description: "Tipo de entidad desde la que se importó",
  })
  @IsOptional()
  @IsString()
  importedFromType?: string;

  // --- ARRAY DE ALIMENTOS ---
  @ApiProperty({ type: [CreateExchangeListItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateExchangeListItemDto)
  items?: CreateExchangeListItemDto[];
}

export class AddExchangeItemDto {
  @ApiProperty({
    description: "ID del alimento seleccionado de la base de datos (FoodItem)",
  })
  @IsString()
  @IsNotEmpty()
  foodId: string;

  @ApiProperty({
    description: "Cantidad numérica que representa 1 intercambio (ej: 100)",
    example: 100,
  })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({
    description: "Texto descriptivo de la porción (ej: '1 taza')",
    example: "1 taza",
  })
  @IsString()
  @IsNotEmpty()
  servingLabel: string;

  @ApiPropertyOptional({
    description:
      "Descripción del grupo de alimentos intercambiables (ej: 'Acelga, Ají, Tomate'). Null para items individuales.",
  })
  @IsOptional()
  @IsString()
  groupLabel?: string;

  @ApiPropertyOptional({
    description:
      "Estado de cocción del grupo: 'CRUDO' o 'COCIDO'. Null para items no vegetales.",
  })
  @IsOptional()
  @IsString()
  cookingState?: string;
}
