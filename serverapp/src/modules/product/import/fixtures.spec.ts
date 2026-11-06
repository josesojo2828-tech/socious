import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  detectDelimiter,
  normalizeHeader,
  normalizeNumber,
  parseCsv,
} from "./product-import.parser";

/**
 * The import fixtures live outside `serverapp` (they are samples for the
 * merchant, not runtime assets). These tests keep the promise that the CSV
 * reader maps columns by HEADER, never by position: the three orderings must
 * produce the same table.
 */
const DIR = join(__dirname, "../../../../../odd/fixtures/import");

function readFile(name: string) {
  return readFileSync(join(DIR, name), "utf8").replace(/^\uFEFF/, "");
}

function asTable(name: string): Record<string, string>[] {
  const text = readFile(name);
  const { header, rows } = parseCsv(text);
  const keys = header.map(normalizeHeader);
  return rows.map((row) =>
    Object.fromEntries(keys.map((key, index) => [key, row.cells[index] ?? ""])),
  );
}

function number(value: string): number | null {
  const parsed = normalizeNumber(value);
  return parsed.ok ? parsed.value : null;
}

const PRODUCT_FILES = [
  "productos-formato-a.csv",
  "productos-formato-b.csv",
  "productos-formato-c.csv",
];
const SALE_FILES = [
  "ventas-formato-a.csv",
  "ventas-formato-b.csv",
  "ventas-formato-c.csv",
];

describe("import fixtures", () => {
  it("detects the delimiter of each product file", () => {
    expect(detectDelimiter(readFile(PRODUCT_FILES[0]).split(/\r?\n/)[0])).toBe(",");
    expect(detectDelimiter(readFile(PRODUCT_FILES[1]).split(/\r?\n/)[0])).toBe(",");
    expect(detectDelimiter(readFile(PRODUCT_FILES[2]).split(/\r?\n/)[0])).toBe(";");
  });

  it("maps product columns by header regardless of their order", () => {
    const [first, ...rest] = PRODUCT_FILES.map(asTable);

    for (const table of rest) {
      expect(table).toHaveLength(first.length);
      expect(table.map((row) => row.sku)).toEqual(
        first.map((row) => row.sku),
      );
    }

    // The Spanish-locale file uses `16,00`; the canonical one `16.00`.
    const spanish = rest[rest.length - 1];
    expect(number(spanish[0].venta_usd)).toBe(number(first[0].venta_usd));
    expect(number(spanish[0].costo_usd)).toBe(number(first[0].costo_usd));
  });

  it("carries every product type in the sample", () => {
    const tipos = new Set(asTable(PRODUCT_FILES[0]).map((row) => row.tipo));
    expect([...tipos].sort()).toEqual(["material", "producto", "servicio"]);
  });

  it("maps sale columns by header and groups the same sales", () => {
    const tables = SALE_FILES.map((file) => {
      const rows = asTable(file);
      const grouped = new Map<string, string[]>();
      for (const row of rows) {
        grouped.set(row.venta, [
          ...(grouped.get(row.venta) ?? []),
          `${row.sku}x${row.cantidad}`,
        ]);
      }
      return grouped;
    });

    const [first, ...rest] = tables;
    for (const grouped of rest) {
      expect([...grouped.keys()].sort()).toEqual([...first.keys()].sort());
      for (const [sale, lines] of first) {
        expect(grouped.get(sale)).toEqual(lines);
      }
    }
  });

  it("keeps the expected number of sales and lines", () => {
    const rows = asTable(SALE_FILES[0]);
    const sales = new Set(rows.map((row) => row.venta));
    expect(sales.size).toBeGreaterThanOrEqual(8);
    expect(rows.length).toBeGreaterThanOrEqual(12);
  });
});
