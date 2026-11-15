import { apiClient } from "@/shared/api/api.client";

/**
 * Initial accounts-receivable load (S3/S5): typed wrappers over the backend
 * endpoints. The response shapes mirror
 * `serverapp/src/modules/initial-load/initial-load.dto.ts`; when one side
 * changes, the other must follow.
 */

/** CSV columns of the import, in template order. */
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

/** Columns the backend refuses to import when empty. */
export const INITIAL_LOAD_REQUIRED = [
  "fecha",
  "cliente_nombre",
  "producto",
  "cantidad",
  "precio_unitario",
] as const;

export type InitialLoadRowStatus =
  | "ok"
  | "error"
  | "already-imported"
  | "duplicate-in-file";

/** One field-level error reported by the backend. */
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

/** `POST /api/initial-load/validate` response. */
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

/** Body shared by validate and commit. */
export interface InitialLoadPayload {
  content: string;
  filename?: string;
}

export const InitialLoadEndpoints = {
  template: "/api/initial-load/template",
  validate: "/api/initial-load/validate",
  commit: "/api/initial-load/commit",
} as const;

/** Filename the backend serves through `Content-Disposition`. */
export const INITIAL_LOAD_TEMPLATE_FILENAME =
  "plantilla-cuentas-por-cobrar.csv";

/**
 * The endpoint answers raw CSV text, so axios must not try to parse it as
 * JSON. Mirrors the product and sales template downloads.
 */
export async function fetchInitialLoadTemplate(): Promise<string> {
  const { data } = await apiClient.get<string>(InitialLoadEndpoints.template, {
    responseType: "text",
    transformResponse: [(raw) => raw],
  });
  return typeof data === "string" ? data : String(data ?? "");
}

/** Downloads the CSV template through the same blob flow as the product import. */
export async function downloadInitialLoadTemplate(): Promise<void> {
  const csv = await fetchInitialLoadTemplate();
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = INITIAL_LOAD_TEMPLATE_FILENAME;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** Dry-run: parses and resolves the CSV without writing anything. */
export async function validateInitialLoad(
  payload: InitialLoadPayload,
): Promise<InitialLoadValidateResult> {
  const { data } = await apiClient.post<InitialLoadValidateResult>(
    InitialLoadEndpoints.validate,
    payload,
  );
  return data;
}

/** Commit: creates the clients, products and unpaid historical sales. */
export async function commitInitialLoad(
  payload: InitialLoadPayload,
): Promise<InitialLoadCommitResult> {
  const { data } = await apiClient.post<InitialLoadCommitResult>(
    InitialLoadEndpoints.commit,
    payload,
  );
  return data;
}
