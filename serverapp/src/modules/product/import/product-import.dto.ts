import {
  Allow,
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
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

/**
 * Commit transport (S6). The global `ValidationPipe` runs with
 * `whitelist` + `forbidNonWhitelisted`, so a strict nested DTO would answer
 * 400 for the whole request whenever the user left an invalid row included.
 * Every field is loose on purpose: the service owns the per-row rules and
 * reports invalid rows in `skipped`. `@Allow()` keeps the properties through
 * the whitelist without validating them here.
 */
export class ImportCommitRowValuesDto {
  @Allow()
  sku?: string;

  @Allow()
  nombre?: string;

  @Allow()
  tipo?: string;

  @Allow()
  barcode?: string;

  @Allow()
  descripcion?: string;

  @Allow()
  costo_usd?: number | string;

  @Allow()
  venta_usd?: number | string;

  @Allow()
  stock_inicial?: number | string;

  @Allow()
  unidad?: string;

  @Allow()
  categoria?: string;

  @Allow()
  proveedor?: string;

  @Allow()
  publico?: boolean | string;
}

/** One reviewed row as sent to `POST /api/products/import` (S6). */
export class ImportCommitRowDto {
  @Allow()
  line?: number;

  @Allow()
  include?: boolean;

  @IsObject()
  @ValidateNested()
  @Type(() => ImportCommitRowValuesDto)
  values: ImportCommitRowValuesDto;
}

/** `POST /api/products/import` body (S6): the reviewed, filtered rows. */
export class ImportCommitDto {
  @IsArray()
  @ArrayMaxSize(500, { message: "El archivo supera el límite de 500 filas." })
  @ValidateNested({ each: true })
  @Type(() => ImportCommitRowDto)
  rows: ImportCommitRowDto[];
}

/**
 * Normalized, editable row returned by the dry-run (S4). Optional text fields
 * use `""` (never `undefined`) so the webapp can render and resubmit them.
 */
export interface ImportRowValues {
  sku: string;
  nombre: string;
  tipo: ImportTipo;
  barcode: string;
  descripcion: string;
  costo_usd: number;
  venta_usd: number;
  stock_inicial: number;
  unidad: string;
  categoria: string;
  proveedor: string;
  publico: boolean;
}

/** One preview row: its real file line, whether it will be imported, and why. */
export interface ImportPreviewRow {
  line: number;
  include: boolean;
  values: ImportRowValues;
  errors: string[];
  warnings: string[];
}

/** Flat error list for the per-line detail in the preview (S4). */
export interface ImportFieldError {
  line: number;
  field: string;
  message: string;
}

/** Full `POST /api/products/import/validate` response (S4). */
export interface ImportValidateResult {
  rows: ImportPreviewRow[];
  errors: ImportFieldError[];
  summary: { total: number; valid: number; invalid: number; warnings: number };
}

/** `POST /api/products/import` response (S6). */
export interface ImportCommitResult {
  created: number;
  skipped: number;
  excluded: number;
  errors: ImportFieldError[];
}
