import "reflect-metadata";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { INITIAL_LOAD_COLUMNS } from "./initial-load.dto";
import { normalizeHeader, parseCsv } from "./initial-load.parser";

/**
 * The initial-load fixtures live outside `serverapp` (they are samples for the
 * merchant, not runtime assets). These tests keep the promise that the CSV
 * reader maps columns by HEADER, never by position: the three formats must
 * produce the same parsed table.
 */
const DIR = join(__dirname, "../../../../odd/fixtures/import");

const FILES = [
  "cobros-formato-a.csv",
  "cobros-formato-b.csv",
  "cobros-formato-c.csv",
];

const KNOWN = new Set<string>(INITIAL_LOAD_COLUMNS);

function readFile(name: string): string {
  return readFileSync(join(DIR, name), "utf8").replace(/^\uFEFF/, "");
}

/** The known initial-load columns found in a file, normalized by header. */
function knownHeader(name: string): string[] {
  const { header } = parseCsv(readFile(name));
  return header
    .map(normalizeHeader)
    .filter((key) => KNOWN.has(key));
}

/** The file as a table projected onto the known initial-load columns. */
function asTable(name: string): Record<string, string>[] {
  const { header, rows } = parseCsv(readFile(name));
  const keys = header.map(normalizeHeader);
  return rows.map((row) => {
    const record = Object.fromEntries(
      keys.map((key, index) => [key, row.cells[index] ?? ""]),
    );
    return Object.fromEntries(
      INITIAL_LOAD_COLUMNS.map((column) => [column, record[column] ?? ""]),
    );
  });
}

describe("initial-load fixtures", () => {
  it("normalizes the same known column set in every format", () => {
    for (const file of FILES) {
      expect(knownHeader(file).sort()).toEqual(
        [...INITIAL_LOAD_COLUMNS].sort(),
      );
    }
  });

  it("maps every format to the same rows and values", () => {
    const [first, ...rest] = FILES.map(asTable);

    for (const table of rest) {
      expect(table).toHaveLength(first.length);
      expect(table).toEqual(first);
    }
  });

  it("parses the chosen row identically across the three formats", () => {
    const chosen = FILES.map((file) => asTable(file)[0]);

    expect(chosen[0]).toMatchObject({
      venta: "V-001",
      cliente_nombre: "Ana Pérez",
      producto: "Cemento gris 42.5 kg",
      sku: "CEM-425",
      cantidad: "10",
      precio_unitario: "6.50",
      vencimiento: "2024-02-15",
      monto_pagado: "65.00",
    });
    expect(chosen[1]).toEqual(chosen[0]);
    expect(chosen[2]).toEqual(chosen[0]);
  });

  it("carries the expected mix of rows", () => {
    const rows = asTable(FILES[0]);

    expect(rows.length).toBeGreaterThanOrEqual(4);
    expect(rows.some((row) => row.venta === "")).toBe(true);
    expect(rows.some((row) => row.venta !== "")).toBe(true);
    expect(rows.some((row) => row.vencimiento === "")).toBe(true);
    expect(rows.some((row) => row.vencimiento !== "")).toBe(true);
    expect(rows.some((row) => row.cadencia === "CADA_N_DIAS")).toBe(true);
    expect(
      rows.some((row) => row.monto_pagado !== "" && row.monto_pagado !== "0"),
    ).toBe(true);
  });
});
