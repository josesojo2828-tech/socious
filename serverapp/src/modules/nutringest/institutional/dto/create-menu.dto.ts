import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsNumber,
  Min,
  IsOptional,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class InstitutionalMenuItemDto {
  @ApiProperty({ description: "ID del alimento (FoodItem)", example: "uuid-food-item" })
  @IsString()
  @IsNotEmpty()
  foodId: string;

  @ApiProperty({ description: "Tiempo de comida (ej: DESAYUNO, ALMUERZO, CENA)", example: "DESAYUNO" })
  @IsString()
  @IsNotEmpty()
  mealType: string;

  @ApiProperty({ description: "Tamaño de la porción en gramos/unidades por persona", example: 150 })
  @IsNumber()
  @Min(0)
  portionGrams: number;

  @ApiPropertyOptional({ description: "Precio unitario manual (sobrescribe el actual)", example: 8.00 })
  @IsOptional()
  @IsNumber()
  unitPrice?: number;
}

export class CreateInstitutionalMenuDto {
  @ApiProperty({ description: "Nombre del menú", example: "Menú Estudiantil - Día 1" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: "Lista de ingredientes del menú", type: [InstitutionalMenuItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InstitutionalMenuItemDto)
  items: InstitutionalMenuItemDto[];
}
