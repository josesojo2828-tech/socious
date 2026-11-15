import {
  detectDelimiter,
  normalizeHeader,
  normalizeName,
  normalizeNumber,
  parseCsv,
  parseFlexibleDate,
} from "./initial-load.parser";

const header = (names: string[]) => names.join(",");

describe("initial-load parser", () => {
  it("detects a semicolon delimiter and parses its rows", () => {
    const csv = "fecha;cliente_nombre;producto;cantidad;precio_unitario\n2024-01-15;Ana;Arroz;2;1,50";

    expect(detectDelimiter(csv.split("\n")[0])).toBe(";");

    const parsed = parseCsv(csv);
    expect(parsed.header).toEqual([
      "fecha",
      "cliente_nombre",
      "producto",
      "cantidad",
      "precio_unitario",
    ]);
    expect(parsed.rows[0].cells[4]).toBe("1,50");
  });

  it("normalizes accented headers to their plain spelling", () => {
    expect(normalizeHeader("Descripción")).toBe("descripcion");
    expect(normalizeHeader("FECHA")).toBe("fecha");
    expect(normalizeHeader("Vencimiento ")).toBe("vencimiento");
  });

  it("accepts both YYYY-MM-DD and DD/MM/YYYY dates", () => {
    const iso = parseFlexibleDate("2024-01-15");
    const ar = parseFlexibleDate("15/01/2024");

    expect(iso).toEqual(ar);
    expect(iso).toEqual({
      iso: "2024-01-15T12:00:00.000Z",
      dateOnly: "2024-01-15",
    });
  });

  it("rejects impossible calendar dates", () => {
    expect(parseFlexibleDate("2024-02-30")).toBeNull();
    expect(parseFlexibleDate("31/04/2024")).toBeNull();
    expect(parseFlexibleDate("no-es-fecha")).toBeNull();
  });

  it("normalizes comma decimals and currency symbols", () => {
    expect(normalizeNumber("12,50")).toMatchObject({ ok: true, value: 12.5 });
    expect(normalizeNumber("$ 1.234,56")).toMatchObject({ ok: true, value: 1234.56 });
  });

  it("normalizes a client or product name for matching", () => {
    expect(normalizeName("  José   PÉREZ ")).toBe("jose perez");
    expect(normalizeName("Arroz Blanco")).toBe(normalizeName("arroz    blanco"));
  });

  it("ignores unknown columns when mapping by header name", () => {
    const unknownHeader = header([
      "fecha",
      "cliente_nombre",
      "producto",
      "cantidad",
      "precio_unitario",
      "columna_rara",
    ]);
    const parsed = parseCsv(
      `${unknownHeader}\n2024-01-15,Ana,Arroz,2,1.50,ignorame`,
    );

    const index = new Map(
      parsed.header.map((raw, position) => [normalizeHeader(raw), position]),
    );

    expect(index.has("columna_rara")).toBe(true);
    expect(index.get("producto")).toBe(2);
    expect(parsed.rows[0].cells[index.get("producto")!]).toBe("Arroz");
  });
});
