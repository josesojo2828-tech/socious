import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import {
  mapHeaderToTarget,
  processSpreadsheetFile,
} from "./spreadsheet-parser";

describe("spreadsheet-parser", () => {
  it("maps common Spanish headers correctly", () => {
    expect(mapHeaderToTarget("Código")).toBe("sku");
    expect(mapHeaderToTarget("cod")).toBe("sku");
    expect(mapHeaderToTarget("Nombre del Producto")).toBe("nombre");
    expect(mapHeaderToTarget("Artículo")).toBe("nombre");
    expect(mapHeaderToTarget("Precio")).toBe("venta_usd");
    expect(mapHeaderToTarget("PVP")).toBe("venta_usd");
    expect(mapHeaderToTarget("Costo")).toBe("costo_usd");
    expect(mapHeaderToTarget("Existencia")).toBe("stock_inicial");
    expect(mapHeaderToTarget("Cantidad")).toBe("stock_inicial");
    expect(mapHeaderToTarget("Categoría")).toBe("categoria");
    expect(mapHeaderToTarget("Rubro")).toBe("categoria");
    expect(mapHeaderToTarget("Código de barras")).toBe("barcode");
    expect(mapHeaderToTarget("Proveedor")).toBe("proveedor");
    expect(mapHeaderToTarget("Unidad")).toBe("unidad");
  });

  it("processes a real Excel workbook with custom headers and defaults missing tipo and sku", async () => {
    const wsData = [
      ["Código", "Descripción", "Precio Venta", "Costo", "Existencia", "Rubro"],
      ["A1", "Arroz blanco 1kg", "1.80", "1.10", "50", "Víveres"],
      ["", "Harina de maíz", "1.60", "0.90", "40", "Víveres"], // empty SKU
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Productos");
    const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });

    const file = new File([buffer], "catalogo_prueba.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const result = await processSpreadsheetFile(file);
    expect(result.isExcel).toBe(true);
    expect(result.totalRows).toBe(2);

    const lines = result.csvText.split("\n");
    expect(lines[0]).toBe(
      "sku,nombre,tipo,barcode,descripcion,costo_usd,venta_usd,stock_inicial,unidad,categoria,proveedor,publico",
    );
    // Line 1: Arroz
    expect(lines[1]).toContain("A1,Arroz blanco 1kg,producto");
    expect(lines[1]).toContain("Víveres");
    // Line 2: Harina with auto-generated SKU
    expect(lines[2]).toContain("Harina de maíz,producto");
    expect(lines[2]).toContain("UND"); // default unit
  });

  it("processes a CSV file with semicolon delimiter", async () => {
    const csvContent = "sku;nombre;venta_usd;stock_inicial\nSKU-1;Camisa;15.50;20\nSKU-2;Pantalon;25.00;10";
    const file = new File([csvContent], "items.csv", { type: "text/csv" });

    const result = await processSpreadsheetFile(file);
    expect(result.isExcel).toBe(false);
    expect(result.totalRows).toBe(2);

    const lines = result.csvText.split("\n");
    expect(lines[1]).toContain("SKU-1,Camisa,producto");
  });
});
