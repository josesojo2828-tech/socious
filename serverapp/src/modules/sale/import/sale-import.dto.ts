/** CSV shape of the historical sales import (one row per sale line). */
export const SALE_IMPORT_COLUMNS = [
  "venta",
  "fecha",
  "cliente_nombre",
  "cliente_telefono",
  "cliente_email",
  "sku",
  "cantidad",
  "metodo_pago",
  "moneda",
  "monto_pagado",
  "notas",
] as const;

export const SALE_IMPORT_REQUIRED = [
  "venta",
  "fecha",
  "cliente_nombre",
  "sku",
  "cantidad",
  "metodo_pago",
] as const;

export const SALE_IMPORT_EXAMPLE = [
  "V-001,2026-11-03,Ana Pérez,584241000001,ana@example.com,CAM-ROJA-M,2,PAGO_MOVIL,VES,32.00,Retira en tienda",
  "V-001,2026-11-03,Ana Pérez,584241000001,ana@example.com,MED-100,3,PAGO_MOVIL,VES,9.00,",
].join("\r\n");

export interface ImportSalesDto {
  content: string;
  filename?: string;
}

export interface SaleImportFieldError {
  line: number;
  field: string;
  message: string;
}

/** One grouped sale, ready to review before committing. */
export interface SaleImportPreview {
  venta: string;
  line: number;
  customer: string;
  lines: number;
  totalUSD: number;
  paidUSD: number;
  paymentMethod: string | null;
  currency: string | null;
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface SaleValidateResult {
  sales: SaleImportPreview[];
  errors: SaleImportFieldError[];
  summary: { sales: number; lines: number; valid: number; invalid: number };
}

export interface SaleCommitResult {
  created: number;
  skipped: number;
  errors: SaleImportFieldError[];
}
