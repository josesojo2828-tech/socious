import {
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { Transform, Type } from "class-transformer";

/**
 * CSV contract of the initial accounts-receivable import. The header is mapped
 * by name (normalized like the product import), so the column order does not
 * matter. `venta`, `cliente_telefono`, `cliente_email`, `sku`, `vencimiento`,
 * `cadencia`, `dias`, `monto_pagado` and `notas` are optional.
 */
export const INITIAL_LOAD_COLUMNS = [
  "venta",
  "fecha",
  "cliente_nombre",
  "cliente_telefono",
  "cliente_email",
  "producto",
  "sku",
  "cantidad",
  "precio_unitario",
  "vencimiento",
  "cadencia",
  "dias",
  "monto_pagado",
  "notas",
] as const;

export type InitialLoadColumn = (typeof INITIAL_LOAD_COLUMNS)[number];

export const INITIAL_LOAD_REQUIRED = [
  "fecha",
  "cliente_nombre",
  "producto",
  "cantidad",
  "precio_unitario",
] as const;

/** `POST /api/initial-load/validate` and `/commit` body. */
export class ImportInitialLoadDto {
  @IsString({ message: "No se recibió contenido para importar." })
  @IsNotEmpty({ message: "No se recibió contenido para importar." })
  content: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  filename?: string;
}

/**
 * Trims every optional string of the manual entry before validation. An empty
 * string becomes `undefined` so a blank field means "not provided", matching
 * the client DTO.
 */
const trimString = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
};

const MANUAL_CADENCES = ["QUINCENAL", "MENSUAL", "CADA_N_DIAS"] as const;

export type ManualCadence = (typeof MANUAL_CADENCES)[number];

/**
 * `POST /api/initial-load/manual` body: one historical opening balance
 * captured by hand. The client and the product are each given by id or by the
 * fields the CSV import already resolves; `unitPriceUSD` is always explicit
 * because the historical price is the merchant's, not today's catalog price.
 */
export class CreateManualInitialLoadDto {
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(60)
  clientId?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(200)
  clientName?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(40)
  clientPhone?: string;

  @IsOptional()
  @Transform(trimString)
  @IsEmail({}, { message: "El correo no tiene un formato válido." })
  clientEmail?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(60)
  productId?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(200)
  productName?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(60)
  productSku?: string;

  @Type(() => Number)
  @IsNumber({}, { message: "La cantidad debe ser numérica." })
  @Min(0.0001, { message: "La cantidad debe ser mayor que cero." })
  quantity: number;

  @Type(() => Number)
  @IsNumber({}, { message: "El precio unitario debe ser numérico." })
  @Min(0.0001, { message: "El precio unitario debe ser mayor que cero." })
  unitPriceUSD: number;

  @IsOptional()
  @Transform(trimString)
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: "La fecha debe tener el formato AAAA-MM-DD.",
  })
  issueDate?: string;

  @IsOptional()
  @Transform(trimString)
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: "El vencimiento debe tener el formato AAAA-MM-DD.",
  })
  dueDate?: string;

  @IsOptional()
  @Transform(trimString)
  @IsIn([...MANUAL_CADENCES], {
    message: "La cadencia debe ser QUINCENAL, MENSUAL o CADA_N_DIAS.",
  })
  cadence?: ManualCadence;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "Los días deben ser un entero entre 1 y 365." })
  @Min(1, { message: "Los días deben ser un entero entre 1 y 365." })
  @Max(365, { message: "Los días deben ser un entero entre 1 y 365." })
  everyNDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "El día de cobro debe ser un entero entre 1 y 28." })
  @Min(1, { message: "El día de cobro debe ser un entero entre 1 y 28." })
  @Max(28, { message: "El día de cobro debe ser un entero entre 1 y 28." })
  monthlyDay?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: "El monto pagado debe ser numérico." })
  @Min(0, { message: "El monto pagado no puede ser negativo." })
  paidAmount?: number;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

/** `POST /api/initial-load/manual` response. */
export interface ManualInitialLoadResult {
  saleId: string;
  saleNumber: string;
  client: { id: string; name: string; created: boolean };
  product: { id: string; name: string; sku: string; created: boolean };
}

export type InitialLoadRowStatus =
  | "ok"
  | "error"
  | "already-imported"
  | "duplicate-in-file";

/** Flat error list for the per-line detail in the preview. */
export interface InitialLoadFieldError {
  line: number;
  field: string;
  message: string;
}

/** One preview row: its real file line, what will happen and why. */
export interface InitialLoadPreviewRow {
  line: number;
  saleNumber: string;
  clientName: string;
  productName: string;
  quantity: number;
  unitPriceUSD: number;
  totalUSD: number;
  dueDate: string | null;
  cadence: string | null;
  status: InitialLoadRowStatus;
  willCreateClient: boolean;
  willCreateProduct: boolean;
  errors: string[];
  warnings: string[];
}

/** Full `POST /api/initial-load/validate` response. */
export interface InitialLoadValidateResult {
  ok: boolean;
  totalRows: number;
  errors: InitialLoadFieldError[];
  rows: InitialLoadPreviewRow[];
}

/** `POST /api/initial-load/commit` response. */
export interface InitialLoadCommitResult {
  created: { sales: number; clients: number; products: number };
  skipped: number;
  errors: InitialLoadFieldError[];
}
