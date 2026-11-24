import * as XLSX from "xlsx";
import { decodeCsvBytes, detectDelimiter } from "./product-import";

/**
 * Standard column order expected by the Socius product import endpoint.
 */
export const TARGET_COLUMNS = [
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
] as const;

export type TargetColumn = (typeof TARGET_COLUMNS)[number];

const COMBINING_MARKS = /[\u0300-\u036f]/g;

function cleanString(str: string): string {
  return str
    .replace(/\uFEFF/g, "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .replace(/[\s\-_]+/g, "_");
}

/**
 * Maps common Spanish and English spreadsheet headers to internal target columns.
 */
export function mapHeaderToTarget(header: string): TargetColumn | null {
  const cleaned = cleanString(header);
  if (!cleaned) return null;

  // SKU / Código
  if (
    /^(sku|codigo|cod|cod_prod|codigo_producto|referencia|ref|clave|item_id|id_producto|codigo_interno)$/.test(
      cleaned,
    )
  ) {
    return "sku";
  }

  // Nombre / Producto
  if (
    /^(nombre|producto|articulo|item|nombre_producto|nombre_del_producto|descripcion_producto|titulo)$/.test(
      cleaned,
    )
  ) {
    return "nombre";
  }

  // Tipo (producto / servicio / material)
  if (/^(tipo|type|clase|tipo_item|tipo_producto)$/.test(cleaned)) {
    return "tipo";
  }

  // Código de barras
  if (
    /^(barcode|codigo_barra|codigo_barras|codigo_de_barra|codigo_de_barras|cod_barra|barra|barras|ean|ean13|upc|gtin)$/.test(
      cleaned,
    )
  ) {
    return "barcode";
  }

  // Descripción
  if (
    /^(descripcion|detalle|concepto|observacion|observaciones|nota|notas)$/.test(
      cleaned,
    )
  ) {
    return "descripcion";
  }

  // Costo
  if (
    /^(costo|costo_usd|costousd|costo_unitario|precio_costo|precio_de_costo|cost|compra|precio_compra|p_costo)$/.test(
      cleaned,
    )
  ) {
    return "costo_usd";
  }

  // Precio de venta
  if (
    /^(venta|venta_usd|ventausd|precio|precio_venta|precio_de_venta|precio_unitario|pvp|pvp_usd|price|valor|importe)$/.test(
      cleaned,
    )
  ) {
    return "venta_usd";
  }

  // Stock inicial
  if (
    /^(stock|stock_inicial|stockinicial|cantidad|cant|existencia|existencias|saldo|unidades|qty|inventario|inventario_inicial)$/.test(
      cleaned,
    )
  ) {
    return "stock_inicial";
  }

  // Unidad de medida
  if (/^(unidad|unidades|unidad_medida|medida|uom|ud|unit)$/.test(cleaned)) {
    return "unidad";
  }

  // Categoría
  if (
    /^(categoria|rubro|departamento|familia|grupo|linea|clasificacion|category)$/.test(
      cleaned,
    )
  ) {
    return "categoria";
  }

  // Proveedor
  if (/^(proveedor|proveedores|suplidor|supplier|vendor)$/.test(cleaned)) {
    return "proveedor";
  }

  // Público / visible en catálogo
  if (
    /^(publico|catalogo|visible|publicar|mostrar_en_catalogo|web)$/.test(cleaned)
  ) {
    return "publico";
  }

  return null;
}

function escapeCsv(cell: unknown): string {
  if (cell === null || cell === undefined) return "";
  const str = String(cell).trim();
  if (
    str.includes(",") ||
    str.includes('"') ||
    str.includes("\n") ||
    str.includes("\r") ||
    str.includes(";")
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export interface ProcessFileResult {
  csvText: string;
  filename: string;
  isExcel: boolean;
  totalRows: number;
}

/**
 * Parses any spreadsheet file (.xlsx, .xls, .csv, .ods, etc.), maps columns
 * intelligently to Socius schema, defaults missing values (e.g. tipo=producto,
 * unidad=UND, publico=true, auto-generated SKU if missing), and returns
 * clean standard CSV string ready for the import endpoint.
 */
export async function processSpreadsheetFile(
  file: File,
): Promise<ProcessFileResult> {
  const isExcel = /\.(xlsx|xls|xlsm|xlsb|ods)$/i.test(file.name);
  const buffer = await file.arrayBuffer();

  let rawHeader: string[] = [];
  let rawRows: (string | number | boolean | null | undefined)[][] = [];

  if (isExcel) {
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error("El archivo de Excel no contiene hojas de datos.");
    }
    const worksheet = workbook.Sheets[firstSheetName];
    const rawData = XLSX.utils.sheet_to_json<(string | number | boolean | null | undefined)[]>(
      worksheet,
      { header: 1, defval: "" },
    );

    if (rawData.length === 0) {
      throw new Error("El archivo de Excel está vacío.");
    }

    // Locate header row: first row with at least 1 non-empty cell that looks like a header
    let headerIndex = -1;
    for (let i = 0; i < Math.min(rawData.length, 10); i++) {
      const row = rawData[i];
      if (!Array.isArray(row)) continue;
      const recognized = row.filter(
        (cell) => typeof cell === "string" && mapHeaderToTarget(cell) !== null,
      );
      if (recognized.length > 0) {
        headerIndex = i;
        break;
      }
    }

    if (headerIndex === -1) {
      // Fallback: first non-empty row
      headerIndex = rawData.findIndex(
        (row) => Array.isArray(row) && row.some((c) => String(c).trim() !== ""),
      );
      if (headerIndex === -1) {
        throw new Error("No se encontraron filas con datos en el archivo.");
      }
    }

    rawHeader = (rawData[headerIndex] || []).map((c) => String(c ?? "").trim());
    rawRows = rawData.slice(headerIndex + 1);
  } else {
    // CSV / text
    const { text } = decodeCsvBytes(buffer);
    const delimiter = detectDelimiter(text.slice(0, 500));
    const lines = text
      .split(/\r\n|\n|\r/)
      .map((l) => l.trim())
      .filter((l) => l !== "");

    if (lines.length === 0) {
      throw new Error("El archivo CSV está vacío.");
    }

    // Split lines by delimiter taking quotes into account
    const parseLine = (line: string): string[] => {
      const cells: string[] = [];
      let cell = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            cell += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === delimiter && !inQuotes) {
          cells.push(cell.trim());
          cell = "";
        } else {
          cell += char;
        }
      }
      cells.push(cell.trim());
      return cells;
    };

    rawHeader = parseLine(lines[0]);
    rawRows = lines.slice(1).map(parseLine);
  }

  // Filter out completely blank rows
  const cleanRows = rawRows.filter((r) =>
    r.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== ""),
  );

  if (cleanRows.length === 0) {
    throw new Error("El archivo no contiene filas de productos para importar.");
  }

  // Build column mapping: column index in rawHeader -> TargetColumn
  const colMap = new Map<number, TargetColumn>();
  const usedTargets = new Set<TargetColumn>();

  rawHeader.forEach((h, index) => {
    const target = mapHeaderToTarget(h);
    if (target && !usedTargets.has(target)) {
      colMap.set(index, target);
      usedTargets.add(target);
    }
  });

  // If no "nombre" matched, but "descripcion" was mapped, use it as "nombre"
  if (!usedTargets.has("nombre") && usedTargets.has("descripcion")) {
    for (const [idx, target] of colMap.entries()) {
      if (target === "descripcion") {
        colMap.set(idx, "nombre");
        usedTargets.delete("descripcion");
        usedTargets.add("nombre");
        break;
      }
    }
  }

  // Construct normalized rows with standard TARGET_COLUMNS
  const outputRows: string[] = [];

  // Header line
  outputRows.push(TARGET_COLUMNS.join(","));

  cleanRows.forEach((row, rowIndex) => {
    const record: Partial<Record<TargetColumn, string>> = {};

    colMap.forEach((target, colIndex) => {
      const val = row[colIndex];
      record[target] = val !== null && val !== undefined ? String(val).trim() : "";
    });

    // Defaults and fallbacks:
    // 1. Nombre: fallback if empty
    const nombre = record.nombre || `Producto ${rowIndex + 1}`;

    // 2. SKU: auto-generate if empty
    let sku = record.sku || "";
    if (!sku) {
      const cleanName = nombre
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 6);
      sku = cleanName ? `${cleanName}-${String(rowIndex + 1).padStart(3, "0")}` : `PROD-${String(rowIndex + 1).padStart(3, "0")}`;
    }

    // 3. Tipo: always default to "producto"
    let tipo = (record.tipo || "").toLowerCase();
    if (tipo !== "producto" && tipo !== "servicio" && tipo !== "material") {
      tipo = "producto";
    }

    // 4. Unidad: default to "UND"
    const unidad = record.unidad || "UND";

    // 5. Publico: default to "true"
    let publico = record.publico || "true";
    if (publico === "1" || publico.toLowerCase() === "si" || publico.toLowerCase() === "yes") {
      publico = "true";
    } else if (publico === "0" || publico.toLowerCase() === "no") {
      publico = "false";
    }

    const rowCells: string[] = [
      escapeCsv(sku),
      escapeCsv(nombre),
      escapeCsv(tipo),
      escapeCsv(record.barcode || ""),
      escapeCsv(record.descripcion || ""),
      escapeCsv(record.costo_usd || ""),
      escapeCsv(record.venta_usd || ""),
      escapeCsv(record.stock_inicial || ""),
      escapeCsv(unidad),
      escapeCsv(record.categoria || ""),
      escapeCsv(record.proveedor || ""),
      escapeCsv(publico),
    ];

    outputRows.push(rowCells.join(","));
  });

  return {
    csvText: outputRows.join("\n"),
    filename: file.name,
    isExcel,
    totalRows: cleanRows.length,
  };
}
