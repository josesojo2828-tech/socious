/**
 * Pure CSV, date and name helpers for the initial accounts-receivable import.
 *
 * The CSV rules (delimiter detection, RFC 4180 parsing, tolerant headers and
 * decimal normalization) are the exact ones the product import already uses,
 * so both imports cannot drift. This module only adds what is specific to the
 * initial load: flexible dates, person-name normalization and the stable
 * `ONB-<hash>` key used to deduplicate rows without a sale number.
 */

export {
  detectDelimiter,
  normalizeHeader,
  normalizeNumber,
  parseCsv,
} from "../product/import/product-import.parser";
export type {
  CsvRow,
  NormalizedNumber,
  ParsedCsv,
} from "../product/import/product-import.parser";

const COMBINING_MARKS = /[\u0300-\u036f]/g;

export interface ParsedDate {
  /** Noon UTC ISO string: the calendar day never shifts with the timezone. */
  iso: string;
  /** `YYYY-MM-DD`, the same day regardless of the server timezone. */
  dateOnly: string;
}

function pad(value: number, width: number): string {
  return String(value).padStart(width, "0");
}

/**
 * Accepts `YYYY-MM-DD` and `DD/MM/YYYY` and returns the same anchored day for
 * both. An impossible calendar day (2024-02-30) is rejected, not rolled over.
 */
export function parseFlexibleDate(raw: string): ParsedDate | null {
  const value = (raw ?? "").trim();
  if (value === "") return null;

  let year: number;
  let month: number;
  let day: number;

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (isoMatch) {
    year = Number(isoMatch[1]);
    month = Number(isoMatch[2]);
    day = Number(isoMatch[3]);
  } else {
    const shortMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
    if (!shortMatch) return null;
    day = Number(shortMatch[1]);
    month = Number(shortMatch[2]);
    year = Number(shortMatch[3]);
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return {
    iso: date.toISOString(),
    dateOnly: `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`,
  };
}

/** Calendar day in `YYYY-MM-DD` from an instant, read in UTC. */
export function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** The server's local calendar day, used for the "not in the future" check. */
export function localTodayDateOnly(now: Date = new Date()): string {
  return `${pad(now.getFullYear(), 4)}-${pad(now.getMonth() + 1, 2)}-${pad(
    now.getDate(),
    2,
  )}`;
}

export function isFutureDate(
  dateOnly: string,
  now: Date = new Date(),
): boolean {
  return dateOnly > localTodayDateOnly(now);
}

/** Lowercase, strip accents/diacritics, collapse whitespace and trim. */
export function normalizeName(value: string): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalNumber(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  return String(Math.round(value * 100) / 100);
}

/**
 * Deterministic, dependency-free key for a row with no sale number. Two rows
 * with the same normalized content produce the same key, so the second one is
 * reported as `duplicate-in-file` and a re-upload is recognized as
 * `already-imported`.
 */
export function stableRowHash(parts: {
  dateOnly: string;
  clientName: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}): string {
  const text = [
    parts.dateOnly,
    normalizeName(parts.clientName),
    normalizeName(parts.productName),
    canonicalNumber(parts.quantity),
    canonicalNumber(parts.unitPrice),
  ].join("|");

  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return `ONB-${hash.toString(16).toUpperCase().padStart(8, "0")}`;
}
