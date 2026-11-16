import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

const NOTES_MAX = 300;
const CODE_MAX = 60;

/** Carga de un rollo/partida (S3): entra stock por el lote. */
export class CreateProductLotDto {
  @IsString({ message: "El producto es obligatorio." })
  productId: string;

  @IsOptional()
  @IsString()
  presentationId?: string;

  /** Nombre físico del rollo: "Rollo 3", "Partida A". */
  @IsOptional()
  @IsString()
  @MaxLength(CODE_MAX)
  code?: string;

  /** Ancho de la tela en centímetros. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: "El ancho debe ser numérico." })
  @Min(0, { message: "El ancho no puede ser negativo." })
  widthCm?: number;

  @Type(() => Number)
  @IsNumber({}, { message: "La cantidad debe ser numérica." })
  @Min(0.0001, { message: "La cantidad debe ser mayor que cero." })
  quantity: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: "El costo debe ser numérico." })
  @Min(0, { message: "El costo no puede ser negativo." })
  unitCostUSD?: number;

  @IsOptional()
  @IsDateString()
  receivedAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(NOTES_MAX)
  notes?: string;
}

/** Datos descriptivos del rollo. Los metros se mueven con `adjust`. */
export class UpdateProductLotDto {
  @IsOptional()
  @IsString()
  @MaxLength(CODE_MAX)
  code?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: "El ancho debe ser numérico." })
  @Min(0)
  widthCm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: "El costo debe ser numérico." })
  @Min(0)
  unitCostUSD?: number;

  @IsOptional()
  @IsString()
  @MaxLength(NOTES_MAX)
  notes?: string;

  /** Desactivar exige que el rollo quede en cero. */
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

/** Ajuste de metros restantes (merma, conteo físico, corrección). */
export class AdjustProductLotDto {
  @Type(() => Number)
  @IsNumber({}, { message: "La cantidad restante debe ser numérica." })
  @Min(0, { message: "La cantidad restante no puede ser negativa." })
  remainingQuantity: number;

  @IsOptional()
  @IsString()
  @MaxLength(NOTES_MAX)
  notes?: string;
}

export class ListProductLotsQueryDto {
  @IsString({ message: "Indica el producto." })
  productId: string;

  @IsOptional()
  @IsString()
  presentationId?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === "true" || value === "1")
  @IsBoolean()
  includeInactive?: boolean;
}
