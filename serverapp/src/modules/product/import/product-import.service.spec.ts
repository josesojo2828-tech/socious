import { normalizeHeader, parseCsv } from "./product-import.parser";
import { ProductImportService } from "./product-import.service";
import { IMPORT_TIPOS } from "./product-import.dto";

const TEMPLATE_COLUMNS = [
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
];

describe("ProductImportService.template", () => {
  const service = new ProductImportService();
  const csv = service.template();

  it("starts with a UTF-8 BOM", () => {
    expect(csv.startsWith("\uFEFF")).toBe(true);
  });

  it("keeps the exact header order", () => {
    const parsed = parseCsv(csv);

    expect(parsed.header.map(normalizeHeader)).toEqual(TEMPLATE_COLUMNS);
  });

  it("ships at least two parseable example rows with a valid tipo", () => {
    const parsed = parseCsv(csv);

    expect(parsed.rows.length).toBeGreaterThanOrEqual(2);
    for (const row of parsed.rows) {
      expect(row.cells).toHaveLength(TEMPLATE_COLUMNS.length);
      expect(IMPORT_TIPOS).toContain(
        row.cells[TEMPLATE_COLUMNS.indexOf("tipo")],
      );
    }
  });
});
