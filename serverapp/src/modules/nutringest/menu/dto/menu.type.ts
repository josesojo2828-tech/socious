import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Prisma, Gender, ActivityLevel } from "@prisma/client";
import { MenuCategory } from "src/shared/types/schema.types";

// --- PRISMA TYPES ---
export type MENU_WHERE = Prisma.MenuWhereInput;
export type MENU_WHERE_UNIQUE = Prisma.MenuWhereUniqueInput;
export type MENU_CREATE = Prisma.MenuCreateInput;
export type MENU_UPDATE = Prisma.MenuUpdateInput;
export type MENU_WITH_ID = { id: string };
export type MENU_INCLUDE = Prisma.MenuInclude;
export type MENU_ORDER = Prisma.MenuOrderByWithRelationInput;

// --- SWAGGER RESPONSE TYPES ---

export interface MenuResponseDto {
  id: string;
  nutritionistId: string;
  name: string;
  description?: string;
  totalKcal?: number;
  totalProtein?: number;
  totalCarbs?: number;
  totalFats?: number;
  category?: string;
  tags?: string;
  imageUrl?: string;
  organizationId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// --- DEFAULT INCLUDE ---
export const MENU_DEFAULT_INCLUDE: MENU_INCLUDE = {
  nutritionist: true,
  createdBy: {
    select: { id: true, firstName: true, lastName: true, username: true, email: true },
  },
  importedFrom: {
    select: {
      id: true,
      name: true,
      createdBy: {
        select: { id: true, firstName: true, lastName: true, username: true, email: true },
      },
    },
  },
  _count: {
    select: {
      items: true,
    },
  },
  items: {
    include: {
      food: true,
    },
  },
};
// DTO para cada ítem dentro del menú
export class CreateMenuItemDto {
  @ApiProperty({
    description: "ID del alimento (UUID)",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @IsString()
  @IsNotEmpty()
  foodId: string;

  @ApiProperty({ description: "Cantidad numérica", example: 150 })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiPropertyOptional({ description: "Unidad de medida", example: "g" })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({
    description: "Texto visual",
    example: "1 filete mediano",
  })
  @IsOptional()
  @IsString()
  portionLabel?: string;
}

// DTO Principal para crear el Menú
export class CreateMenuDto {
  @ApiProperty({
    description: "Nombre del menú",
    example: "Desayuno Alto en Proteína",
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: "Descripción opcional" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: MenuCategory, default: MenuCategory.OTHER })
  @IsOptional()
  @IsEnum(MenuCategory)
  category?: MenuCategory;

  @ApiPropertyOptional({
    description: "Tags para filtrar separados por comas",
    example: "vegano, rapido",
  })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiPropertyOptional({
    description: "URL de la imagen del menú",
    example: "https://image.pollinations.ai/prompt/...",
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({
    description: "Indica si el menú es parte de la comunidad",
    default: false,
  })
  @IsOptional()
  isCommunity?: boolean;

  @ApiPropertyOptional({
    description: "ID del menú original del cual fue importado",
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

  @ApiPropertyOptional({
    description: "Tiempo de preparación en minutos",
    example: 15,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  prepTime?: number;

  @ApiPropertyOptional({
    description: "Dificultad de preparación (Fácil, Media, Difícil)",
    example: "Media",
  })
  @IsOptional()
  @IsString()
  difficulty?: string;

  @ApiProperty({
    type: [CreateMenuItemDto],
    description: "Lista de alimentos y sus cantidades",
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true }) // Valida cada objeto dentro del array
  @Type(() => CreateMenuItemDto) // Transforma el JSON plano a instancias de la clase DTO
  items?: CreateMenuItemDto[];
}

export class AddMenuItemDto {
  @ApiProperty({
    description: "ID del alimento (UUID)",
  })
  @IsString()
  @IsNotEmpty()
  foodId: string;

  @ApiProperty({ description: "Cantidad numérica", example: 100 })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiPropertyOptional({ description: "Unidad de medida", example: "g" })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ description: "Texto visual", example: "1 taza" })
  @IsOptional()
  @IsString()
  portionLabel?: string;
}

export class AddMenuCondimentDto {
  @ApiProperty({
    description: "ID del condimento (UUID)",
  })
  @IsString()
  @IsNotEmpty()
  condimentId: string;

  @ApiPropertyOptional({ description: "Cantidad numérica", example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional({ description: "Unidad de medida", example: "g" })
  @IsOptional()
  @IsString()
  unit?: string;
}
