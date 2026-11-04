/**
 * Pure product-import library (S2/S5/S8): byte decoding, delimiter detection,
 * RFC 4180 parsing, decimal normalization, per-row validation, editable preview
 * state and the commit payload.
 *
 * No React, no fetch and no DOM globals: the caller hands in the decoded text,
 * so the same rules run in the browser and under vitest/node. The rules mirror
 * `serverapp/src/modules/product/import/product-import.parser.ts` and
 * `product-import.service.ts`; when one side changes, the other must follow.
 */

export const IMPORT_COLUMNS = [
  "sku",
  "nombre",
  "tipo",
  "barcode",
  "descripcion",
  "costo_usd",
  "venta_usd",
  "stock_inicial",
  "unidad",
  "categoria",
  "proveedor",
  "publico",
] as const;

export type ImportColumn = (typeof IMPORT_COLUMNS)[number];

export const IMPORT_TIPOS = ["producto", "servicio", "material"] as const;
export type ImportTipo = (typeof IMPORT_TIPOS)[number];

/** S1/S2: the downloaded template keeps exactly these columns, in order. */
export const IMPORT_TEMPLATE_FILENAME = "plantilla-productos.csv";

export const SKU_MAX = 60;
export const NAME_MAX = 200;
export const NOTES_MAX = 2000;
export const BARCODE_MAX = 60;
export const UNIT_MAX = 20;
export const SKU_PATTERN = /^[A-Za-z0-9._-]+$/;

const NUMERIC_FIELDS = ["costo_usd", "venta_usd", "stock_inicial"] as const;
type NumericField = (typeof NUMERIC_FIELDS)[number];

const PUBLIC_TRUE = new Set(["true", "1", "si"]);
const PUBLIC_FALSE = new Set(["false", "0", "no"]);

const COMBINING_MARKS = /[\u0300-\u036f]/g;

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

/** One field-level note the server returned that the client cannot recompute. */
export interface ServerNote {
  line: number;
  field: string;
  message: string;
  kind: "error" | "warning";
}

export interface ImportPreviewRow {
  line: number;
  include: boolean;
  values: ImportRowValues;
  errors: string[];
  warnings: string[];
  /**
   * Server notes kept from the validate response. `applyEdit` drops only the
   * notes whose `field` was edited; the rest stay until the user fixes them.
   */
  serverNotes?: ServerNote[];
  /** Raw text last typed into each numeric cell, kept to re-derive ambiguity. */
  rawNumbers?: Partial<Record<NumericField, string>>;
}

/** Shape of `POST /api/products/import/validate`. */
export interface ImportValidateResponse {
  rows: ImportPreviewRow[];
  errors: { line: number; field: string; message: string }[];
  summary: { total: number; valid: number; invalid: number; warnings: number };
}

/** Shape of `POST /api/products/import`. */
export interface ImportCommitResult {
  created: number;
  skipped: number;
  excluded: number;
  errors: { line: number; field: string; message: string }[];
}

export interface ImportCommitPayloadRow {
  line: number;
  include: boolean;
  values: ImportRowValues;
}

export interface ImportSummary {
  total: number;
  included: number;
  includedValid: number;
  includedInvalid: number;
  excluded: number;
  warnings: number;
}

export type CsvRow = { line: number; cells: string[] };
export type ParsedCsv = { header: string[]; rows: CsvRow[] };

export type NormalizedNumber =
  | { ok: true; value: number | null; ambiguous: boolean }
  | { ok: false };

export interface RowErrorContext {
  line: number;
  /** SKUs that appear more than once in the file (trimmed, exact match). */
  duplicateSkus?: Set<string>;
  /** Raw text last typed into numeric cells; enables the ambiguity warning. */
  rawNumbers?: Partial<Record<NumericField, string>>;
}

// ---------------------------------------------------------------------------
// Decoding and parsing (S2)
// ---------------------------------------------------------------------------

/**
 * S2: try strict UTF-8; fall back to Windows-1252 (Latin-1). The leading BOM
 * that Excel writes is stripped from the decoded text.
 */
export function decodeCsvBytes(bytes: ArrayBuffer): {
  text: string;
  encoding: "utf-8" | "windows-1252";
} {
  let text: string;
  let encoding: "utf-8" | "windows-1252";

  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    encoding = "utf-8";
  } catch {
    // Windows-1252 maps every byte, so this branch never throws.
    text = new TextDecoder("windows-1252").decode(bytes);
    encoding = "windows-1252";
  }

  return {
    text: text.startsWith("\uFEFF") ? text.slice(1) : text,
    encoding,
  };
}

function firstLine(text: string): string {
  const index = text.indexOf("\n");
  const line = index === -1 ? text : text.slice(0, index);
  return line.replace(/\r$/, "");
}

/**
 * Counts commas and semicolons outside double quotes on the header line.
 * The most frequent wins; a tie or no delimiter falls back to a comma.
 */
export function detectDelimiter(headerLine: string): "," | ";" {
  let commas = 0;
  let semicolons = 0;
  let inQuotes = false;

  for (let i = 0; i < headerLine.length; i++) {
    const char = headerLine[i];
    if (char === '"') {
      if (inQuotes && headerLine[i + 1] === '"') {
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (inQuotes) continue;
    if (char === ",") commas++;
    else if (char === ";") semicolons++;
  }

  return semicolons > commas ? ";" : ",";
}

/**
 * RFC 4180 parser: quoted fields, `""` escapes, embedded delimiters and
 * newlines, CRLF or LF. A leading BOM is stripped. Rows keep their original
 * 1-based starting line so the preview can report the real file line.
 */
export function parseCsv(text: string): ParsedCsv {
  const input = text.startsWith("\uFEFF") ? text.slice(1) : text;
  const delimiter = detectDelimiter(firstLine(input));

  const records: CsvRow[] = [];
  let cells: string[] = [];
  let field = "";
  let inQuotes = false;
  let line = 1;
  let rowLine = 1;

  const flushRecord = () => {
    cells.push(field);
    records.push({ line: rowLine, cells });
    cells = [];
    field = "";
  };

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else if (char === "\r") {
        if (input[i + 1] === "\n") {
          field += "\r\n";
          i++;
        } else {
          field += "\r";
        }
        line++;
      } else if (char === "\n") {
        field += "\n";
        line++;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === delimiter) {
      cells.push(field);
      field = "";
      continue;
    }
    if (char === "\r" || char === "\n") {
      if (char === "\r" && input[i + 1] === "\n") i++;
      flushRecord();
      line++;
      rowLine = line;
      continue;
    }
    field += char;
  }

  if (field !== "" || cells.length > 0) {
    flushRecord();
  }

  // A blank file still produces one empty record; ignore it and any trailing
  // blank line so the caller only sees real data rows.
  while (records.length > 0) {
    const last = records[records.length - 1];
    const blank = last.cells.every((cell) => cell.trim() === "");
    if (!blank) break;
    records.pop();
  }

  const [headerRecord, ...rows] = records;
  return { header: headerRecord?.cells ?? [], rows };
}

/** Trim, lowercase and strip accents/BOM so `Descripción` === `descripcion`. */
export function normalizeHeader(name: string): string {
  return name
    .replace(/\uFEFF/g, "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(COMBINING_MARKS, "");
}

function toNumber(
  normalized: string,
  ambiguous: boolean,
): NormalizedNumber {
  if (normalized.trim() === "") {
    return { ok: true, value: null, ambiguous };
  }
  const value = Number(normalized);
  if (!Number.isFinite(value)) return { ok: false };
  return { ok: true, value, ambiguous };
}

/**
 * Deterministic decimal normalization (S2). Order matters: both separators,
 * then repeated separators as grouping, then a single separator.
 */
export function normalizeNumber(raw: string): NormalizedNumber {
  const cleaned = raw
    .replace(/[\s\u00A0]/g, "")
    .replace(/[$€%]/g, "")
    .replace(/USD/gi, "")
    .replace(/Bs/gi, "");

  if (cleaned === "") {
    return { ok: true, value: null, ambiguous: false };
  }

  const dots = (cleaned.match(/\./g) ?? []).length;
  const commas = (cleaned.match(/,/g) ?? []).length;

  if (dots > 0 && commas > 0) {
    const lastDot = cleaned.lastIndexOf(".");
    const lastComma = cleaned.lastIndexOf(",");
    const normalized =
      lastComma > lastDot
        ? cleaned.replace(/\./g, "").replace(",", ".")
        : cleaned.replace(/,/g, "");
    return toNumber(normalized, false);
  }

  if (dots > 1) {
    return toNumber(cleaned.replace(/\./g, ""), false);
  }
  if (commas > 1) {
    return toNumber(cleaned.replace(/,/g, ""), false);
  }

  if (commas === 1) {
    return toNumber(cleaned.replace(",", "."), false);
  }

  if (dots === 1) {
    const decimals = cleaned.length - cleaned.indexOf(".") - 1;
    // Exactly three digits after a lone dot is ambiguous: interpret it as a
    // thousands separator and let the preview warn the user.
    if (decimals === 3) {
      return toNumber(cleaned.replace(".", ""), true);
    }
    return toNumber(cleaned, false);
  }

  return toNumber(cleaned, false);
}

// ---------------------------------------------------------------------------
// Per-row field rules (S3)
// ---------------------------------------------------------------------------

/**
 * Field-level rules only, mirroring the server wording. Tenant lookups
 * (existing SKUs, categories, suppliers) are server-only and arrive as
 * `ServerNote`s; `duplicateSkus` is the in-file duplicate set.
 */
export function rowErrors(
  values: ImportRowValues,
  context: RowErrorContext,
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const push = (text: string) => errors.push(`Fila ${context.line}: ${text}`);

  const sku = values.sku.trim();
  if (sku === "") {
    push("el SKU es obligatorio.");
  } else {
    if (sku.length > SKU_MAX) {
      push(`el SKU no puede superar los ${SKU_MAX} caracteres.`);
    }
    if (!SKU_PATTERN.test(sku)) {
      push(
        "el SKU solo puede contener letras, números, puntos, guiones y guiones bajos.",
      );
    }
    if (context.duplicateSkus?.has(sku)) {
      push(`el SKU "${sku}" está repetido en el archivo.`);
    }
  }

  const nombre = values.nombre.trim();
  if (nombre === "") {
    push("el nombre es obligatorio.");
  } else if (nombre.length > NAME_MAX) {
    push(`el nombre no puede superar los ${NAME_MAX} caracteres.`);
  }

  const tipo = String(values.tipo ?? "").trim().toLowerCase();
  if (tipo === "") {
    push("el tipo es obligatorio.");
  } else if (!(IMPORT_TIPOS as readonly string[]).includes(tipo)) {
    push("el tipo debe ser producto, servicio o material.");
  }

  if (values.barcode.trim().length > BARCODE_MAX) {
    push(`el código de barras no puede superar los ${BARCODE_MAX} caracteres.`);
  }

  if (values.descripcion.trim().length > NOTES_MAX) {
    push(`la descripción no puede superar los ${NOTES_MAX} caracteres.`);
  }

  const readNumber = (field: NumericField, label: string) => {
    const value = values[field];
    if (!Number.isFinite(value)) {
      push(`${label} debe ser numérico.`);
      return;
    }
    if (value < 0) {
      push(`${label} no puede ser negativo.`);
    }
    const raw = context.rawNumbers?.[field];
    if (raw !== undefined) {
      const parsed = normalizeNumber(raw);
      if (parsed.ok && parsed.ambiguous) {
        warnings.push(
          `Fila ${context.line}: el número ${raw.trim()} es ambiguo; se interpretó como ${parsed.value ?? 0} sin decimales. Editalo en la vista previa si no es correcto.`,
        );
      }
    }
  };

  readNumber("costo_usd", "el costo");
  readNumber("venta_usd", "el precio de venta");
  readNumber("stock_inicial", "el stock inicial");

  if (values.unidad.trim().toUpperCase().length > UNIT_MAX) {
    push(`la unidad no puede superar los ${UNIT_MAX} caracteres.`);
  }

  if (typeof values.publico !== "boolean") {
    push("el campo público debe ser sí o no.");
  }

  return { errors, warnings };
}

// ---------------------------------------------------------------------------
// Editable preview state (S5)
// ---------------------------------------------------------------------------

/** Maps a note/message to the column it is about, for per-cell feedback. */
const FIELD_BY_FRAGMENT: readonly [string, ImportColumn][] = [
  ["el SKU", "sku"],
  ["el nombre", "nombre"],
  ["el tipo", "tipo"],
  ["el código de barras", "barcode"],
  ["la descripción", "descripcion"],
  ["el costo", "costo_usd"],
  ["el precio de venta", "venta_usd"],
  ["el stock inicial", "stock_inicial"],
  ["la unidad", "unidad"],
  ["el campo público", "publico"],
  ["la categoría", "categoria"],
  ["el proveedor", "proveedor"],
];

export function fieldOfMessage(message: string): ImportColumn | null {
  for (const [fragment, field] of FIELD_BY_FRAGMENT) {
    if (message.includes(fragment)) return field;
  }
  return null;
}

/**
 * Infers the column a server warning is about. The ambiguity warning does not
 * name the column, so it is matched against the normalized numeric values.
 */
export function inferNoteField(
  message: string,
  values?: ImportRowValues,
): ImportColumn | "numeric" | "" {
  if (message.includes("categoría")) return "categoria";
  if (message.includes("proveedor")) return "proveedor";
  if (message.includes("es ambiguo")) {
    const match = message.match(/se interpretó como (-?\d+(?:\.\d+)?)/);
    if (match && values) {
      const target = Number(match[1]);
      const hits = NUMERIC_FIELDS.filter((field) => values[field] === target);
      if (hits.length === 1) return hits[0];
    }
    return "numeric";
  }
  return fieldOfMessage(message) ?? "";
}

/**
 * Turns a validate response into preview rows that keep the server notes on
 * the row, so an edit can drop exactly the notes for the edited column.
 */
export function previewRowsFromValidate(
  result: ImportValidateResponse,
): ImportPreviewRow[] {
  return result.rows.map((row) => {
    const notes: ServerNote[] = [];

    for (const error of result.errors) {
      if (error.line !== row.line) continue;
      notes.push({
        line: error.line,
        field: error.field,
        message: error.message,
        kind: "error",
      });
    }

    for (const warning of row.warnings) {
      notes.push({
        line: row.line,
        field: inferNoteField(warning, row.values),
        message: warning,
        kind: "warning",
      });
    }

    return { ...row, serverNotes: notes };
  });
}

/** SKUs that appear more than once in the file (first occurrence wins). */
export function findDuplicateSkus(
  rows: { values: ImportRowValues }[],
): Set<string> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const sku = row.values.sku.trim();
    if (sku === "") continue;
    counts.set(sku, (counts.get(sku) ?? 0) + 1);
  }

  const duplicates = new Set<string>();
  for (const [sku, count] of counts) {
    if (count > 1) duplicates.add(sku);
  }
  return duplicates;
}

function parsePublico(value: string | number | boolean): boolean {
  if (typeof value === "boolean") return value;
  const normalized = normalizeHeader(String(value));
  return PUBLIC_TRUE.has(normalized);
}

function dedupe(messages: string[]): string[] {
  return [...new Set(messages)];
}

function noteMatchesField(note: ServerNote, field: ImportColumn): boolean {
  if (note.field === field) return true;
  return (
    note.field === "numeric" &&
    (NUMERIC_FIELDS as readonly string[]).includes(field)
  );
}

/**
 * Returns a new row with `field` updated. Field rules are recomputed against
 * every row (so a SKU edit updates in-file duplicates), and only the server
 * notes for the edited field are dropped: the value they described is gone.
 */
export function applyEdit(
  row: ImportPreviewRow,
  field: ImportColumn,
  value: string | number | boolean,
  allRows: ImportPreviewRow[],
): ImportPreviewRow {
  const values: ImportRowValues = { ...row.values };
  let rawNumbers = row.rawNumbers ? { ...row.rawNumbers } : undefined;

  const assign = (next: string | number | boolean) => {
    (
      values as unknown as Record<ImportColumn, string | number | boolean>
    )[field] = next;
  };

  if (field === "publico") {
    assign(parsePublico(value));
  } else if ((NUMERIC_FIELDS as readonly string[]).includes(field)) {
    const numericField = field as NumericField;
    const raw = String(value);
    const parsed = normalizeNumber(raw);
    assign(parsed.ok ? (parsed.value ?? 0) : Number.NaN);
    rawNumbers = { ...(rawNumbers ?? {}), [numericField]: raw };
  } else if (field === "unidad") {
    assign(String(value).trim().toUpperCase());
  } else {
    assign(String(value));
  }

  const replaced = allRows.map((candidate) =>
    candidate.line === row.line ? { ...candidate, values } : candidate,
  );
  const duplicateSkus = findDuplicateSkus(replaced);
  const local = rowErrors(values, {
    line: row.line,
    duplicateSkus,
    rawNumbers,
  });
  const keptNotes = (row.serverNotes ?? []).filter(
    (note) => !noteMatchesField(note, field),
  );

  const errors = dedupe([
    ...local.errors,
    ...keptNotes
      .filter((note) => note.kind === "error")
      .map((note) => note.message),
  ]);
  const warnings = dedupe([
    ...local.warnings,
    ...keptNotes
      .filter((note) => note.kind === "warning")
      .map((note) => note.message),
  ]);

  return {
    ...row,
    values,
    errors,
    warnings,
    serverNotes: keptNotes,
    rawNumbers,
  };
}

/**
 * Recomputes the in-file duplicate errors for every row after an edit, so
 * fixing one duplicate clears the stale error on its sibling too.
 */
export function refreshDuplicateErrors(
  rows: ImportPreviewRow[],
): ImportPreviewRow[] {
  const duplicateSkus = findDuplicateSkus(rows);

  return rows.map((row) => {
    const keptNotes = (row.serverNotes ?? []).filter(
      (note) => !note.message.includes("está repetido en el archivo"),
    );
    const local = rowErrors(row.values, {
      line: row.line,
      duplicateSkus,
      rawNumbers: row.rawNumbers,
    });
    const errors = dedupe([
      ...local.errors,
      ...keptNotes
        .filter((note) => note.kind === "error")
        .map((note) => note.message),
    ]);
    const warnings = dedupe([
      ...local.warnings,
      ...keptNotes
        .filter((note) => note.kind === "warning")
        .map((note) => note.message),
    ]);

    return { ...row, errors, warnings, serverNotes: keptNotes };
  });
}

/** Flips one row's include flag, leaving the rest untouched. */
export function setInclude(
  rows: ImportPreviewRow[],
  line: number,
  include: boolean,
): ImportPreviewRow[] {
  return rows.map((row) => (row.line === line ? { ...row, include } : row));
}

/** S5 bulk action: include every row without errors. */
export function includeAllValid(
  rows: ImportPreviewRow[],
): ImportPreviewRow[] {
  return rows.map((row) =>
    row.errors.length === 0 ? { ...row, include: true } : row,
  );
}

/** S5 bulk action: exclude every row with errors. */
export function excludeInvalid(rows: ImportPreviewRow[]): ImportPreviewRow[] {
  return rows.map((row) =>
    row.errors.length > 0 ? { ...row, include: false } : row,
  );
}

/** S5 live counters. `warnings` sums every row's warnings. */
export function summarize(rows: ImportPreviewRow[]): ImportSummary {
  let included = 0;
  let includedValid = 0;
  let includedInvalid = 0;
  let warnings = 0;

  for (const row of rows) {
    if (row.include) {
      included++;
      if (row.errors.length > 0) includedInvalid++;
      else includedValid++;
    }
    warnings += row.warnings.length;
  }

  return {
    total: rows.length,
    included,
    includedValid,
    includedInvalid,
    excluded: rows.length - included,
    warnings,
  };
}

/** S5: confirm needs at least one included row and none of them invalid. */
export function canConfirm(rows: ImportPreviewRow[]): boolean {
  const summary = summarize(rows);
  return summary.included > 0 && summary.includedInvalid === 0;
}

/** Short reason shown next to a disabled confirm button, or null when ready. */
export function confirmBlockedReason(
  rows: ImportPreviewRow[],
): string | null {
  const summary = summarize(rows);
  if (summary.included === 0) {
    return "Incluye al menos una fila para importar.";
  }
  if (summary.includedInvalid > 0) {
    return "Hay filas incluidas con errores; corrígelas o exclúyelas.";
  }
  return null;
}

/** S6 transport shape: the reviewed rows, with `include` preserved. */
export function buildCommitPayload(rows: ImportPreviewRow[]): {
  rows: ImportCommitPayloadRow[];
} {
  return {
    rows: rows.map(({ line, include, values }) => ({
      line,
      include,
      values,
    })),
  };
}
