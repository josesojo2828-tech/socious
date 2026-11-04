import { describe, expect, it } from "vitest";
import {
  applyEdit,
  buildCommitPayload,
  decodeCsvBytes,
  detectDelimiter,
  findDuplicateSkus,
  normalizeHeader,
  normalizeNumber,
  parseCsv,
  rowErrors,
  type ImportPreviewRow,
  type ImportRowValues,
} from "./product-import";

function bytes(...values: number[]): ArrayBuffer {
  return Uint8Array.from(values).buffer;
}

function values(overrides: Partial<ImportRowValues> = {}): ImportRowValues {
  return {
    sku: "ABC-1",
    nombre: "Producto",
    tipo: "producto",
    barcode: "",
    descripcion: "",
    costo_usd: 0,
    venta_usd: 0,
    stock_inicial: 0,
    unidad: "UND",
    categoria: "",
    proveedor: "",
    publico: false,
    ...overrides,
  };
}

function row(
  overrides: Partial<ImportPreviewRow> = {},
): ImportPreviewRow {
  return {
    line: 2,
    include: true,
    values: values(),
    errors: [],
    warnings: [],
    ...overrides,
  };
}

describe("product-import decodeCsvBytes", () => {
  it("decodes strict UTF-8 and reports the encoding", () => {
    const encoded = new TextEncoder().encode("Descripción");
    expect(decodeCsvBytes(encoded.buffer as ArrayBuffer)).toEqual({
      text: "Descripción",
      encoding: "utf-8",
    });
  });

  it("falls back to Windows-1252 when the bytes are not valid UTF-8", () => {
    // 0xf3 is a lone Latin-1 accented vowel: invalid as UTF-8.
    expect(decodeCsvBytes(bytes(0x4f, 0x6c, 0xe1))).toEqual({
      text: "Olá",
      encoding: "windows-1252",
    });
  });

  it("strips a leading UTF-8 BOM from the decoded text", () => {
    const bom = new TextEncoder().encode("\uFEFFsku");
    expect(decodeCsvBytes(bom.buffer as ArrayBuffer).text).toBe("sku");
  });
});

describe("product-import detectDelimiter", () => {
  it("picks the comma when it is the most frequent delimiter", () => {
    expect(detectDelimiter("sku,nombre,tipo")).toBe(",");
  });

  it("picks the semicolon when it is the most frequent delimiter", () => {
    expect(detectDelimiter("sku;nombre;tipo")).toBe(";");
  });

  it("falls back to a comma on a tie or no delimiter", () => {
    expect(detectDelimiter("sku,nombre;tipo")).toBe(",");
    expect(detectDelimiter("skunombre")).toBe(",");
  });

  it("ignores delimiters inside quoted fields", () => {
    expect(detectDelimiter('"a,b;c";nombre')).toBe(";");
  });
});

describe("product-import parseCsv", () => {
  it("handles quoted commas, embedded newlines and escaped quotes", () => {
    const csv =
      'sku,nombre\r\n"a,b","line1\nline2"\r\n"quote ""x""",plain\r\n\r\n';
    const parsed = parseCsv(csv);

    expect(parsed.header).toEqual(["sku", "nombre"]);
    expect(parsed.rows).toEqual([
      { line: 2, cells: ["a,b", "line1\nline2"] },
      { line: 4, cells: ['quote "x"', "plain"] },
    ]);
  });

  it("drops trailing empty lines and keeps real 1-based line numbers", () => {
    const parsed = parseCsv("sku,nombre\nA,B\nC,D\n\n\n");
    expect(parsed.rows).toEqual([
      { line: 2, cells: ["A", "B"] },
      { line: 3, cells: ["C", "D"] },
    ]);
  });

  it("strips a leading BOM before parsing the header", () => {
    const parsed = parseCsv("\uFEFFsku,nombre\nA,B");
    expect(parsed.header).toEqual(["sku", "nombre"]);
  });

  it("uses the detected semicolon delimiter", () => {
    const parsed = parseCsv("sku;nombre\nA;B");
    expect(parsed.rows).toEqual([{ line: 2, cells: ["A", "B"] }]);
  });
});

describe("product-import normalizeHeader", () => {
  it("trims, lowercases and strips accents and the BOM", () => {
    expect(normalizeHeader("Descripción")).toBe("descripcion");
    expect(normalizeHeader("\uFEFF  Nombre  ")).toBe("nombre");
    expect(normalizeHeader("CÓDIGO")).toBe("codigo");
  });
});

describe("product-import normalizeNumber", () => {
  it("reads a comma as the decimal separator", () => {
    expect(normalizeNumber("12,50")).toEqual({
      ok: true,
      value: 12.5,
      ambiguous: false,
    });
  });

  it("reads a lone dot with one or two decimals as decimal", () => {
    expect(normalizeNumber("12.5")).toEqual({
      ok: true,
      value: 12.5,
      ambiguous: false,
    });
  });

  it("flags exactly three digits after a lone dot as ambiguous grouping", () => {
    expect(normalizeNumber("1.234")).toEqual({
      ok: true,
      value: 1234,
      ambiguous: true,
    });
  });

  it("reads the last separator as decimal when both appear", () => {
    expect(normalizeNumber("1.234,56")).toEqual({
      ok: true,
      value: 1234.56,
      ambiguous: false,
    });
    expect(normalizeNumber("1,234.56")).toEqual({
      ok: true,
      value: 1234.56,
      ambiguous: false,
    });
  });

  it("treats repeated separators as grouping", () => {
    expect(normalizeNumber("1.234.567")).toEqual({
      ok: true,
      value: 1234567,
      ambiguous: false,
    });
  });

  it("reads four or more digits after a lone dot as decimal", () => {
    expect(normalizeNumber("1.2345")).toEqual({
      ok: true,
      value: 1.2345,
      ambiguous: false,
    });
  });

  it("strips currency and spaces before normalizing", () => {
    expect(normalizeNumber("Bs 1.234,56")).toEqual({
      ok: true,
      value: 1234.56,
      ambiguous: false,
    });
  });

  it("returns ok:false for a non-numeric value", () => {
    expect(normalizeNumber("abc")).toEqual({ ok: false });
  });

  it("returns a null value for an empty string", () => {
    expect(normalizeNumber("")).toEqual({
      ok: true,
      value: null,
      ambiguous: false,
    });
  });
});

describe("product-import rowErrors", () => {
  it("requires the SKU and prefixes the line", () => {
    expect(rowErrors(values({ sku: "   " }), { line: 4 }).errors).toEqual([
      "Fila 4: el SKU es obligatorio.",
    ]);
  });

  it("caps the SKU length and validates its pattern", () => {
    expect(
      rowErrors(values({ sku: "A".repeat(61) }), { line: 1 }).errors,
    ).toContain("Fila 1: el SKU no puede superar los 60 caracteres.");
    expect(
      rowErrors(values({ sku: "con espacio" }), { line: 1 }).errors,
    ).toContain(
      "Fila 1: el SKU solo puede contener letras, números, puntos, guiones y guiones bajos.",
    );
  });

  it("reports an in-file duplicate SKU from the context set", () => {
    const errors = rowErrors(values({ sku: "DUP" }), {
      line: 9,
      duplicateSkus: new Set(["DUP"]),
    }).errors;
    expect(errors).toContain('Fila 9: el SKU "DUP" está repetido en el archivo.');
  });

  it("requires the name and caps its length", () => {
    expect(
      rowErrors(values({ nombre: " " }), { line: 3 }).errors,
    ).toContain("Fila 3: el nombre es obligatorio.");
    expect(
      rowErrors(values({ nombre: "N".repeat(201) }), { line: 3 }).errors,
    ).toContain("Fila 3: el nombre no puede superar los 200 caracteres.");
  });

  it("requires a valid tipo", () => {
    expect(
      rowErrors(values({ tipo: "" as ImportRowValues["tipo"] }), { line: 2 })
        .errors,
    ).toContain("Fila 2: el tipo es obligatorio.");
    expect(
      rowErrors(values({ tipo: "otro" as ImportRowValues["tipo"] }), {
        line: 2,
      }).errors,
    ).toContain("Fila 2: el tipo debe ser producto, servicio o material.");
  });

  it("caps barcode, description and unit lengths", () => {
    expect(
      rowErrors(values({ barcode: "B".repeat(61) }), { line: 5 }).errors,
    ).toContain(
      "Fila 5: el código de barras no puede superar los 60 caracteres.",
    );
    expect(
      rowErrors(values({ descripcion: "D".repeat(2001) }), { line: 5 }).errors,
    ).toContain(
      "Fila 5: la descripción no puede superar los 2000 caracteres.",
    );
    expect(
      rowErrors(values({ unidad: "U".repeat(21) }), { line: 5 }).errors,
    ).toContain("Fila 5: la unidad no puede superar los 20 caracteres.");
  });

  it("rejects non-numeric and negative amounts", () => {
    expect(
      rowErrors(values({ costo_usd: Number.NaN }), { line: 6 }).errors,
    ).toContain("Fila 6: el costo debe ser numérico.");
    expect(
      rowErrors(values({ costo_usd: -1 }), { line: 6 }).errors,
    ).toContain("Fila 6: el costo no puede ser negativo.");
    expect(
      rowErrors(values({ venta_usd: -1 }), { line: 6 }).errors,
    ).toContain("Fila 6: el precio de venta no puede ser negativo.");
    expect(
      rowErrors(values({ stock_inicial: -1 }), { line: 6 }).errors,
    ).toContain("Fila 6: el stock inicial no puede ser negativo.");
  });

  it("rejects a non-boolean publico", () => {
    expect(
      rowErrors(values({ publico: "si" as unknown as boolean }), {
        line: 7,
      }).errors,
    ).toContain("Fila 7: el campo público debe ser sí o no.");
  });

  it("emits the ambiguity warning from the raw numeric text", () => {
    const result = rowErrors(values({ costo_usd: 1234 }), {
      line: 8,
      rawNumbers: { costo_usd: "1.234" },
    });
    expect(result.warnings).toEqual([
      "Fila 8: el número 1.234 es ambiguo; se interpretó como 1234 sin decimales. Editalo en la vista previa si no es correcto.",
    ]);
  });

  it("accepts a fully valid row", () => {
    expect(rowErrors(values(), { line: 1 })).toEqual({
      errors: [],
      warnings: [],
    });
  });
});

describe("product-import applyEdit", () => {
  it("updates the value and drops only the edited field's server note", () => {
    const original = row({
      errors: [
        "Fila 2: el nombre es obligatorio.",
        'Fila 2: el SKU "ABC-1" ya existe en el catálogo.',
      ],
      warnings: [
        'Fila 2: la categoría "Bebidas" no existe; se importará sin categoría.',
      ],
      serverNotes: [
        {
          line: 2,
          field: "nombre",
          message: "Fila 2: el nombre es obligatorio.",
          kind: "error",
        },
        {
          line: 2,
          field: "sku",
          message: 'Fila 2: el SKU "ABC-1" ya existe en el catálogo.',
          kind: "error",
        },
        {
          line: 2,
          field: "categoria",
          message:
            'Fila 2: la categoría "Bebidas" no existe; se importará sin categoría.',
          kind: "warning",
        },
      ],
    });

    const next = applyEdit(original, "nombre", "Producto corregido", [original]);

    expect(next.values.nombre).toBe("Producto corregido");
    expect(next.errors).not.toContain("Fila 2: el nombre es obligatorio.");
    expect(next.errors).toContain(
      'Fila 2: el SKU "ABC-1" ya existe en el catálogo.',
    );
    expect(next.warnings).toContain(
      'Fila 2: la categoría "Bebidas" no existe; se importará sin categoría.',
    );
    expect(next.serverNotes?.map((note) => note.field)).toEqual([
      "sku",
      "categoria",
    ]);
  });

  it("recomputes the SKU pattern error after an edit", () => {
    const original = row();
    const next = applyEdit(original, "sku", "con espacio", [original]);
    expect(next.errors).toContain(
      "Fila 2: el SKU solo puede contener letras, números, puntos, guiones y guiones bajos.",
    );
  });

  it("recomputes in-file duplicates against every row", () => {
    const first = row({ line: 2, values: values({ sku: "DUP" }) });
    const second = row({ line: 3, values: values({ sku: "DUP" }) });

    const next = applyEdit(first, "sku", "UNICO", [first, second]);
    expect(next.errors).toEqual([]);
    expect(findDuplicateSkus([next, second])).toEqual(new Set());
  });

  it("stores NaN and reports a numeric error for invalid text", () => {
    const original = row();
    const next = applyEdit(original, "costo_usd", "abc", [original]);
    expect(Number.isNaN(next.values.costo_usd)).toBe(true);
    expect(next.errors).toContain("Fila 2: el costo debe ser numérico.");
  });

  it("parses publico from its text form and keeps ambiguity raw text", () => {
    const original = row();
    const publico = applyEdit(original, "publico", "sí", [original]);
    expect(publico.values.publico).toBe(true);

    const amount = applyEdit(original, "costo_usd", "1.234", [original]);
    expect(amount.values.costo_usd).toBe(1234);
    expect(amount.warnings[0]).toContain("es ambiguo");
    expect(amount.rawNumbers?.costo_usd).toBe("1.234");
  });

  it("uppercases the unit on edit", () => {
    const original = row();
    const next = applyEdit(original, "unidad", " kg ", [original]);
    expect(next.values.unidad).toBe("KG");
  });
});

describe("product-import buildCommitPayload", () => {
  it("keeps only line, include and values", () => {
    const preview = [
      row({ line: 2, include: true }),
      row({ line: 3, include: false, values: values({ sku: "B-2" }) }),
    ];
    const payload = buildCommitPayload(preview);

    expect(payload).toEqual({
      rows: [
        { line: 2, include: true, values: values() },
        { line: 3, include: false, values: values({ sku: "B-2" }) },
      ],
    });
    expect(Object.keys(payload.rows[0])).toEqual(["line", "include", "values"]);
  });
});
