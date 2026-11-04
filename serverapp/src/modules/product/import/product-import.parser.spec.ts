import {
  detectDelimiter,
  normalizeHeader,
  normalizeNumber,
  parseCsv,
} from "./product-import.parser";

describe("detectDelimiter", () => {
  it("picks the comma when it is the most frequent", () => {
    expect(detectDelimiter("sku,nombre,tipo")).toBe(",");
  });

  it("picks the semicolon when it is the most frequent", () => {
    expect(detectDelimiter("sku;nombre;tipo")).toBe(";");
  });

  it("falls back to comma on a tie", () => {
    expect(detectDelimiter("sku,nombre;tipo")).toBe(",");
  });

  it("falls back to comma when there is no delimiter", () => {
    expect(detectDelimiter("sku")).toBe(",");
  });

  it("ignores delimiters inside quotes", () => {
    expect(detectDelimiter('"a,b,c";nombre;tipo')).toBe(";");
  });
});

describe("parseCsv", () => {
  it("parses a simple header and rows with 1-based line numbers", () => {
    const result = parseCsv("sku,nombre\nA,Arroz\nB,Fideo");

    expect(result.header).toEqual(["sku", "nombre"]);
    expect(result.rows).toEqual([
      { line: 2, cells: ["A", "Arroz"] },
      { line: 3, cells: ["B", "Fideo"] },
    ]);
  });

  it("honours quoted fields with embedded delimiter, newlines and escaped quotes", () => {
    const csv =
      'sku,descripcion\nA,"Arroz, blanco\nlinea 2 ""especial"""\nB,Simple';

    const result = parseCsv(csv);

    expect(result.rows).toEqual([
      { line: 2, cells: ["A", 'Arroz, blanco\nlinea 2 "especial"'] },
      { line: 4, cells: ["B", "Simple"] },
    ]);
  });

  it("accepts CRLF line endings", () => {
    const result = parseCsv("sku,nombre\r\nA,Arroz\r\nB,Fideo\r\n");

    expect(result.rows).toEqual([
      { line: 2, cells: ["A", "Arroz"] },
      { line: 3, cells: ["B", "Fideo"] },
    ]);
  });

  it("strips a leading BOM", () => {
    const result = parseCsv("\uFEFFsku,nombre\nA,Arroz");

    expect(result.header).toEqual(["sku", "nombre"]);
    expect(result.rows[0].cells).toEqual(["A", "Arroz"]);
  });

  it("uses the detected delimiter", () => {
    const result = parseCsv("sku;nombre\nA;Arroz");

    expect(result.header).toEqual(["sku", "nombre"]);
    expect(result.rows[0].cells).toEqual(["A", "Arroz"]);
  });

  it("drops fully empty trailing lines", () => {
    const result = parseCsv("sku,nombre\nA,Arroz\n\n");

    expect(result.rows).toEqual([{ line: 2, cells: ["A", "Arroz"] }]);
  });
});

describe("normalizeHeader", () => {
  it("trims, lowercases and strips accents", () => {
    expect(normalizeHeader(" Descripción ")).toBe("descripcion");
    expect(normalizeHeader("Costo_USD")).toBe("costo_usd");
  });

  it("strips a BOM", () => {
    expect(normalizeHeader("\uFEFFSKU")).toBe("sku");
  });
});

describe("normalizeNumber", () => {
  it.each([
    ["1000", 1000, false],
    ["12,50", 12.5, false],
    ["12.5", 12.5, false],
    ["1.234", 1234, true],
    ["1.234,56", 1234.56, false],
    ["1,234.56", 1234.56, false],
    ["1.234.567", 1234567, false],
    ["1.2345", 1.2345, false],
    ["Bs 1.234,56", 1234.56, false],
    ["USD 25.00", 25, false],
    ["€1.234,56", 1234.56, false],
    ["  1\u00A0234,56  ", 1234.56, false],
  ])("normalizes %s to %s", (raw, value, ambiguous) => {
    expect(normalizeNumber(raw)).toEqual({ ok: true, value, ambiguous });
  });

  it("treats an empty value as missing", () => {
    expect(normalizeNumber("   ")).toEqual({
      ok: true,
      value: null,
      ambiguous: false,
    });
  });

  it("signals invalid input", () => {
    expect(normalizeNumber("abc")).toEqual({ ok: false });
  });
});
