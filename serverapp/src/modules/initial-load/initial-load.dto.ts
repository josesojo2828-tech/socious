import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

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
