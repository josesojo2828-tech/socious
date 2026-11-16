import {
  INITIAL_LOAD_COLUMNS,
  INITIAL_LOAD_REQUIRED,
  type InitialLoadColumn,
  type InitialLoadPreviewRow,
  type InitialLoadProductMapping,
  type InitialLoadRowStatus,
  type InitialLoadValidateResult,
} from "../services/initial-load.service";

/**
 * Pure helpers for the initial accounts-receivable import. No React, no fetch:
 * every rule here is a deterministic projection of the validate response, so
 * the same functions run in the panel and under vitest/node.
 */

/** Neutral Spanish label for each row status. */
export const STATUS_LABELS: Record<InitialLoadRowStatus, string> = {
  ok: "Lista",
  error: "Con errores",
  "already-imported": "Ya importada",
  "duplicate-in-file": "Duplicada en el archivo",
};

/** Tailwind text tone for each row status. */
const STATUS_TONES: Record<InitialLoadRowStatus, string> = {
  ok: "text-emerald-600 dark:text-emerald-400",
  error: "text-red-600 dark:text-red-400",
  "already-imported": "text-slate-500 dark:text-slate-400",
  "duplicate-in-file": "text-amber-600 dark:text-amber-400",
};

export function statusTone(status: InitialLoadRowStatus): string {
  return STATUS_TONES[status];
}

/** Counts the preview rows per status, zero-filling the missing keys. */
export function countByStatus(
  rows: InitialLoadPreviewRow[],
): Record<InitialLoadRowStatus, number> {
  const counts: Record<InitialLoadRowStatus, number> = {
    ok: 0,
    error: 0,
    "already-imported": 0,
    "duplicate-in-file": 0,
  };

  for (const row of rows) {
    counts[row.status] += 1;
  }

  return counts;
}

/**
 * Confirmation is allowed only when the dry-run succeeded, produced rows and
 * none of them is an error. Already-imported and in-file duplicates are safe:
 * the backend skips them.
 */
export function canConfirm(
  result: InitialLoadValidateResult | null,
): boolean {
  if (!result || !result.ok) return false;
  if (result.rows.length === 0) return false;
  return result.rows.every((row) => row.status !== "error");
}

/** Joins the per-row error messages into a single inline line. */
export function formatRowErrors(row: InitialLoadPreviewRow): string {
  return row.errors.join(" · ");
}

function distinctNames(
  rows: InitialLoadPreviewRow[],
  flag: "willCreateProduct" | "willCreateClient",
  name: "productName" | "clientName",
): string[] {
  const seen = new Set<string>();
  const names: string[] = [];

  for (const row of rows) {
    if (!row[flag]) continue;
    const value = row[name].trim();
    if (value === "" || seen.has(value)) continue;
    seen.add(value);
    names.push(value);
  }

  return names;
}

/** A decision to reuse an existing product, keyed by the preview product name. */
export interface ProductDecisionRef {
  productId: string;
}

function isDecided(
  decisions: Readonly<Record<string, ProductDecisionRef | undefined>>,
  productName: string,
): boolean {
  return Boolean(decisions[productName]?.productId);
}

/**
 * Distinct products the commit will create (no stock), in file order. Names the
 * merchant already mapped to an existing product are excluded.
 */
export function groupProductsToCreate(
  rows: InitialLoadPreviewRow[],
  decisions: Readonly<Record<string, ProductDecisionRef | undefined>> = {},
): string[] {
  return distinctNames(rows, "willCreateProduct", "productName").filter(
    (name) => !isDecided(decisions, name),
  );
}

/** Unions product names without duplicates, preserving the first-seen order. */
export function unionProductNames(...groups: string[][]): string[] {
  const seen = new Set<string>();
  const names: string[] = [];

  for (const group of groups) {
    for (const name of group) {
      if (name.trim() === "" || seen.has(name)) continue;
      seen.add(name);
      names.push(name);
    }
  }

  return names;
}

/** How many of the given product names will reuse an existing product. */
export function countReused(
  names: string[],
  decisions: Readonly<Record<string, ProductDecisionRef | undefined>>,
): number {
  return names.filter((name) => isDecided(decisions, name)).length;
}

/** Turns the panel decisions into the payload's `mapping`, skipping blanks. */
export function mappingFromDecisions(
  decisions: Readonly<Record<string, ProductDecisionRef | undefined>>,
): InitialLoadProductMapping[] {
  const mapping: InitialLoadProductMapping[] = [];

  for (const [productName, decision] of Object.entries(decisions)) {
    if (!decision?.productId || productName.trim() === "") continue;
    mapping.push({ productName, productId: decision.productId });
  }

  return mapping;
}

/** Distinct clients the commit will create, in file order. */
export function groupClientsToCreate(
  rows: InitialLoadPreviewRow[],
): string[] {
  return distinctNames(rows, "willCreateClient", "clientName");
}

export interface ExpectedColumn {
  column: InitialLoadColumn;
  required: boolean;
}

/** The CSV columns, flagging which ones the backend requires. */
export function expectedColumns(): ExpectedColumn[] {
  const required = new Set<string>(INITIAL_LOAD_REQUIRED);
  return INITIAL_LOAD_COLUMNS.map((column) => ({
    column,
    required: required.has(column),
  }));
}
