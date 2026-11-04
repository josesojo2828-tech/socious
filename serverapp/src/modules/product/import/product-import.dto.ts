import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { NAME_MAX, NOTES_MAX, SKU_MAX, SKU_PATTERN } from "../dto/product.dto";

export const IMPORT_TIPOS = ["producto", "servicio", "material"] as const;
export type ImportTipo = (typeof IMPORT_TIPOS)[number];

/** `POST /api/products/import/validate` body (S1): the decoded CSV text. */
export class ImportProductsDto {
  @IsString({ message: "No se recibió contenido para importar." })
  @IsNotEmpty({ message: "No se recibió contenido para importar." })
  content: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  filename?: string;
}

/** One normalized, editable row from the preview. */
export class ImportRowValuesDto {
  @IsString({ message: "El SKU es obligatorio." })
  @Matches(SKU_PATTERN, {
    message:
      "El SKU solo puede contener letras, números, puntos, guiones y guiones bajos.",
  })
  @MaxLength(SKU_MAX)
  sku: string;

  @IsString({ message: "El nombre es obligatorio." })
  @MaxLength(NAME_MAX)
  nombre: string;

  @IsIn(IMPORT_TIPOS, {
    message: "El tipo debe ser producto, servicio o material.",
  })
  tipo: ImportTipo;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  barcode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(NOTES_MAX)
  descripcion?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: "El costo debe ser numérico." })
  @Min(0)
  costo_usd?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: "El precio de venta debe ser numérico." })
  @Min(0)
  venta_usd?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: "El stock inicial debe ser numérico." })
  @Min(0)
  stock_inicial?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  unidad?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  categoria?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  proveedor?: string;

  @IsOptional()
  @IsBoolean()
  publico?: boolean;
}

/** One reviewed row as sent to `POST /api/products/import` (S6). */
export class ImportRowDto {
  @IsInt({ message: "La línea debe ser un número entero." })
  @Min(1)
  line: number;

  @IsBoolean()
  include: boolean;

  @ValidateNested()
  @Type(() => ImportRowValuesDto)
  values: ImportRowValuesDto;
}
