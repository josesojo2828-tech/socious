/**
 * Pure CSV parsing and value normalization for the product import (S2).
 * No Nest/Prisma imports: the same rules are mirrored by the webapp library.
 */

export type CsvRow = { line: number; cells: string[] };

export type ParsedCsv = { header: string[]; rows: CsvRow[] };

export type NormalizedNumber =
  | { ok: true; value: number | null; ambiguous: boolean }
  | { ok: false };

const COMBINING_MARKS = /[\u0300-\u036f]/g;

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
 * 1-based starting line so the caller can report the real file line.
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
    // thousands separator and let the UI warn the user.
    if (decimals === 3) {
      return toNumber(cleaned.replace(".", ""), true);
    }
    return toNumber(cleaned, false);
  }

  return toNumber(cleaned, false);
}
