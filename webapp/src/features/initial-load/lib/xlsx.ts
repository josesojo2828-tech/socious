/**
 * Browser-only .xlsx reader for the initial accounts-receivable import.
 *
 * An .xlsx workbook is a ZIP of XML parts. We read the central directory
 * ourselves (stored and deflated entries), extract the lowest-numbered
 * `xl/worksheets/sheet*.xml` plus the optional `xl/sharedStrings.xml`, and turn
 * the first worksheet into `{ headers, rows }` — the same shape
 * `parseCsv` produces — so the existing CSV text writer and the untouched
 * `POST /api/initial-load/validate` contract keep doing the real work.
 *
 * No runtime dependency and no `DOMParser`: the XML is scanned with small
 * explicit regular expressions, which run the same under vitest/node and in the
 * browser. Only the platform `DecompressionStream("deflate-raw")` is used.
 */

import { normalizeHeader } from "@/features/products/lib/product-import";

/** MIME type Excel registers for .xlsx files. */
export const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export interface ParsedSheet {
  headers: string[];
  rows: string[][];
}

/** Columns whose Excel serial numbers become `YYYY-MM-DD`. */
const DATE_COLUMNS = new Set(["fecha", "vencimiento"]);

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;

const MAX_SERIAL = 2_958_465; // 9999-12-31 in the 1900 date system
const DAY_MS = 86_400_000;
const UTC_MIDNIGHT_SERIAL = 25_569; // 1970-01-01
const PRE_BUG_OFFSET_SERIAL = 25_568; // serial 1 = 1900-01-01

const SHEET_ENTRY = /^xl\/worksheets\/sheet(\d*)\.xml$/;
const SHARED_STRINGS_ENTRY = "xl/sharedStrings.xml";

const utf8 = new TextDecoder("utf-8");

function corruptFile(): Error {
  return new Error("El archivo no es un archivo .xlsx válido o está dañado.");
}

/** Extension and the official MIME type; either one is enough. */
export function isXlsxFile(file: File): boolean {
  const name = (file.name ?? "").toLowerCase();
  const type = (file.type ?? "").toLowerCase();
  return name.endsWith(".xlsx") || type === XLSX_MIME;
}

// ---------------------------------------------------------------------------
// ZIP reader (central directory + local header)
// ---------------------------------------------------------------------------

interface ZipEntry {
  name: string;
  method: number;
  flags: number;
  compressedSize: number;
  localOffset: number;
}

function findEndOfCentralDirectory(view: DataView): number {
  const lowest = Math.max(0, view.byteLength - 22 - 0xffff);
  for (let offset = view.byteLength - 22; offset >= lowest; offset--) {
    if (view.getUint32(offset, true) === EOCD_SIGNATURE) return offset;
  }
  return -1;
}

function readCentralDirectory(bytes: Uint8Array, view: DataView): ZipEntry[] {
  const eocd = findEndOfCentralDirectory(view);
  if (eocd === -1) throw corruptFile();

  const count = view.getUint16(eocd + 10, true);
  const directoryOffset = view.getUint32(eocd + 16, true);
  if (directoryOffset >= bytes.byteLength) throw corruptFile();

  const entries: ZipEntry[] = [];
  let offset = directoryOffset;

  for (let index = 0; index < count; index++) {
    if (offset + 46 > bytes.byteLength) throw corruptFile();
    if (view.getUint32(offset, true) !== CENTRAL_SIGNATURE) throw corruptFile();

    const flags = view.getUint16(offset + 8, true);
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);

    if (compressedSize === 0xffffffff || localOffset === 0xffffffff) {
      throw new Error(
        "El archivo .xlsx es demasiado grande o usa una variante ZIP64 no compatible.",
      );
    }
    if (offset + 46 + nameLength > bytes.byteLength) throw corruptFile();

    const name = utf8.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    entries.push({ name, method, flags, compressedSize, localOffset });

    offset += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

async function inflateRaw(raw: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === "undefined") {
    throw new Error(
      "Este navegador no puede leer archivos .xlsx. Convierta el archivo a CSV o use un navegador actualizado.",
    );
  }

  try {
    const copy = new Uint8Array(raw);
    const stream = new Blob([copy.buffer])
      .stream()
      .pipeThrough(new DecompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch {
    throw corruptFile();
  }
}

async function readEntry(
  bytes: Uint8Array,
  view: DataView,
  entry: ZipEntry,
): Promise<Uint8Array> {
  if ((entry.flags & 0x1) !== 0) {
    throw new Error(
      "El archivo .xlsx está protegido con contraseña. Quite la protección y vuelva a intentarlo.",
    );
  }

  const local = entry.localOffset;
  if (local + 30 > bytes.byteLength) throw corruptFile();
  if (view.getUint32(local, true) !== LOCAL_SIGNATURE) throw corruptFile();

  const nameLength = view.getUint16(local + 26, true);
  const extraLength = view.getUint16(local + 28, true);
  const start = local + 30 + nameLength + extraLength;
  const end = start + entry.compressedSize;
  if (end > bytes.byteLength) throw corruptFile();

  const raw = bytes.subarray(start, end);
  if (entry.method === 0) return raw;
  if (entry.method === 8) return inflateRaw(raw);

  throw new Error(
    "El archivo .xlsx usa un método de compresión no compatible.",
  );
}

function pickWorksheet(entries: ZipEntry[]): ZipEntry {
  const sheets = entries
    .map((entry) => ({ entry, match: SHEET_ENTRY.exec(entry.name) }))
    .filter(
      (candidate): candidate is { entry: ZipEntry; match: RegExpExecArray } =>
        candidate.match !== null,
    )
    .sort((a, b) => Number(a.match[1]) - Number(b.match[1]));

  if (sheets.length === 0) {
    throw new Error("El archivo .xlsx no contiene ninguna hoja de cálculo.");
  }

  return sheets[0].entry;
}

// ---------------------------------------------------------------------------
// XML scanning
// ---------------------------------------------------------------------------

function decodeXmlEntities(value: string): string {
  return value.replace(
    /&(#x[0-9a-fA-F]+|#[0-9]+|amp|lt|gt|quot|apos);/g,
    (match, entity: string) => {
      switch (entity) {
        case "amp":
          return "&";
        case "lt":
          return "<";
        case "gt":
          return ">";
        case "quot":
          return '"';
        case "apos":
          return "'";
        default:
          break;
      }

      const code =
        entity.startsWith("#x") || entity.startsWith("#X")
          ? Number.parseInt(entity.slice(2), 16)
          : Number.parseInt(entity.slice(1), 10);
      if (!Number.isFinite(code)) return match;
      return String.fromCodePoint(code);
    },
  );
}

/** Every `<t>` run inside an `<si>`/`<is>` fragment, concatenated. */
function inlineText(fragment: string): string {
  const parts: string[] = [];
  for (const match of fragment.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)) {
    parts.push(match[1]);
  }
  return decodeXmlEntities(parts.join(""));
}

function parseSharedStrings(xml: string): string[] {
  const strings: string[] = [];

  for (const match of xml.matchAll(
    /<si\b[^>]*?(?:\/>|>([\s\S]*?)<\/si>)/g,
  )) {
    strings.push(inlineText(match[1] ?? ""));
  }

  return strings;
}

function attribute(attrs: string, name: string): string | null {
  const match = new RegExp(`\\b${name}="([^"]*)"`).exec(attrs);
  return match ? match[1] : null;
}

function columnOf(reference: string | null): number | null {
  if (!reference) return null;

  const letters = /^([A-Za-z]+)/.exec(reference);
  if (!letters) return null;

  let column = 0;
  for (const letter of letters[1].toUpperCase()) {
    column = column * 26 + (letter.charCodeAt(0) - 64);
  }
  return column - 1;
}

function valueOf(content: string): string {
  const match = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(content);
  return match ? decodeXmlEntities(match[1]).trim() : "";
}

interface RawCell {
  column: number;
  text: string;
  numeric: number | null;
}

/**
 * Reads one `<c>` element. `numeric` is set only for genuine number cells (no
 * type, `t="n"` or a formula's cached number), so date columns know when a
 * value is an Excel serial instead of a text date.
 */
function parseCell(
  attrs: string,
  content: string,
  shared: string[],
  fallbackColumn: number,
): RawCell {
  const reference = attribute(attrs, "r");
  const column = columnOf(reference) ?? fallbackColumn;
  const type = attribute(attrs, "t") ?? "n";

  if (type === "s") {
    const index = Number.parseInt(valueOf(content), 10);
    const text = Number.isFinite(index) ? (shared[index] ?? "") : "";
    return { column, text, numeric: null };
  }

  if (type === "inlineStr") {
    const inline = /<is\b[^>]*>([\s\S]*?)<\/is>/.exec(content);
    return {
      column,
      text: inline ? inlineText(inline[1]) : "",
      numeric: null,
    };
  }

  if (type === "str") {
    return { column, text: valueOf(content), numeric: null };
  }

  if (type === "b") {
    const raw = valueOf(content);
    return { column, text: raw === "1" ? "true" : "false", numeric: null };
  }

  // Number cells (default `t="n"`) and formula cells: the cached `<v>` is the
  // value Excel itself computed.
  const raw = valueOf(content);
  const numeric = raw === "" ? null : Number(raw);
  return {
    column,
    text: raw,
    numeric: Number.isFinite(numeric) ? numeric : null,
  };
}

/** Excel serial (1900 date system) -> `YYYY-MM-DD`, leap-year bug included. */
function serialToDateOnly(serial: number): string {
  // 1900 is not a leap year, but Excel keeps a fake 1900-02-29 as serial 60.
  const adjusted = serial === 60 ? 59 : serial;
  const epochDay =
    adjusted >= 61
      ? adjusted - UTC_MIDNIGHT_SERIAL
      : adjusted - PRE_BUG_OFFSET_SERIAL;

  const date = new Date(epochDay * DAY_MS);
  const year = String(date.getUTCFullYear()).padStart(4, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function renderCell(cell: RawCell, isDateColumn: boolean): string {
  if (
    isDateColumn &&
    cell.numeric !== null &&
    cell.numeric >= 1 &&
    cell.numeric <= MAX_SERIAL
  ) {
    return serialToDateOnly(Math.floor(cell.numeric));
  }
  return cell.text;
}

function parseWorksheet(xml: string, shared: string[]): ParsedSheet {
  const grid: RawCell[][] = [];

  for (const rowMatch of xml.matchAll(
    /<row\b[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g,
  )) {
    const content = rowMatch[1] ?? "";
    const cells: RawCell[] = [];
    let nextColumn = 0;

    for (const cellMatch of content.matchAll(
      /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g,
    )) {
      const cell = parseCell(cellMatch[1], cellMatch[2] ?? "", shared, nextColumn);
      nextColumn = cell.column + 1;
      cells.push(cell);
    }

    grid.push(cells);
  }

  const isBlank = (row: RawCell[]) => row.every((cell) => cell.text.trim() === "");

  const first = grid.findIndex((row) => !isBlank(row));
  if (first === -1) {
    throw new Error("La hoja de cálculo está vacía.");
  }

  let last = grid.length - 1;
  while (last > first && isBlank(grid[last])) last--;

  const headerRow = grid[first];
  const width = Math.max(
    headerRow.reduce((max, cell) => Math.max(max, cell.column + 1), 0),
    ...grid.map((row) =>
      row.reduce((max, cell) => Math.max(max, cell.column + 1), 0),
    ),
  );

  const headers: string[] = new Array(width).fill("");
  for (const cell of headerRow) headers[cell.column] = cell.text.trim();

  const dateColumns = new Set<number>();
  headers.forEach((header, index) => {
    if (header !== "" && DATE_COLUMNS.has(normalizeHeader(header))) {
      dateColumns.add(index);
    }
  });

  const rows = grid.slice(first + 1, last + 1).map((row) => {
    const values: string[] = new Array(width).fill("");
    for (const cell of row) {
      values[cell.column] = renderCell(cell, dateColumns.has(cell.column));
    }
    return values;
  });

  return { headers, rows };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Parses the first worksheet of an .xlsx file into headers and string rows. */
export async function parseXlsxToRows(
  buffer: ArrayBuffer,
): Promise<ParsedSheet> {
  const bytes = new Uint8Array(buffer);
  if (bytes.byteLength === 0) throw corruptFile();

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const entries = readCentralDirectory(bytes, view);

  const sharedEntry = entries.find((entry) => entry.name === SHARED_STRINGS_ENTRY);
  const shared = sharedEntry
    ? parseSharedStrings(utf8.decode(await readEntry(bytes, view, sharedEntry)))
    : [];

  const worksheet = pickWorksheet(entries);
  const sheetXml = utf8.decode(await readEntry(bytes, view, worksheet));

  return parseWorksheet(sheetXml, shared);
}

function escapeCsvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Serializes the parsed sheet as RFC 4180 CSV text (CRLF, quotes when needed). */
export function xlsxToCsvText(parsed: ParsedSheet): string {
  return [parsed.headers, ...parsed.rows]
    .map((cells) => cells.map(escapeCsvCell).join(","))
    .join("\r\n");
}
