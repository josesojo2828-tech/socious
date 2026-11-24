import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class CreateMeatDeconstructionItemDto {
  @IsNotEmpty({ message: "El ID del corte de producto es requerido." })
  @IsString({ message: "El ID del corte debe ser una cadena." })
  productId: string;

  @IsNotEmpty({ message: "La cantidad en kilogramos es requerida." })
  @Type(() => Number)
  @IsNumber({}, { message: "La cantidad debe ser un número." })
  @IsPositive({ message: "La cantidad en kilogramos debe ser mayor a cero." })
  quantityKg: number;

  @IsNotEmpty({ message: "El costo unitario es requerido." })
  @Type(() => Number)
  @IsNumber({}, { message: "El costo unitario debe ser un número." })
  @Min(0, { message: "El costo unitario no puede ser negativo." })
  unitCostUSD: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: "El costo total debe ser un número." })
  @Min(0, { message: "El costo total no puede ser negativo." })
  totalCostUSD?: number;

  @IsOptional()
  @IsBoolean({ message: "isByProduct debe ser un booleano." })
  isByProduct?: boolean;
}

export class CreateMeatDeconstructionDto {
  @IsOptional()
  @IsString({ message: "El ID de la pieza o animal debe ser una cadena." })
  carcassId?: string;

  @IsNotEmpty({ message: "El peso recibido en canal es requerido." })
  @Type(() => Number)
  @IsNumber({}, { message: "El peso recibido debe ser un número." })
  @IsPositive({ message: "El peso recibido debe ser mayor a cero." })
  incomingWeightKg: number;

  @IsNotEmpty({ message: "El costo unitario por kilogramo es requerido." })
  @Type(() => Number)
  @IsNumber({}, { message: "El costo por kg debe ser un número." })
  @Min(0, { message: "El costo por kg no puede ser negativo." })
  unitCostUSD: number;

  @IsOptional()
  @IsString({ message: "El ID del proveedor debe ser una cadena." })
  supplierId?: string;

  @IsOptional()
  @IsString({ message: "Las notas deben ser una cadena de texto." })
  notes?: string;

  @IsArray({ message: "Los cortes obtenidos deben ser una lista." })
  @ArrayMinSize(1, { message: "Debe registrar al menos un corte obtenido del despiece." })
  @ValidateNested({ each: true })
  @Type(() => CreateMeatDeconstructionItemDto)
  items: CreateMeatDeconstructionItemDto[];

  @IsOptional()
  @IsDateString({}, { message: "processedAt debe ser una fecha ISO válida." })
  processedAt?: string;
}
