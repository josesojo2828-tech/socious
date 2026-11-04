import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import type { ProductScope } from "../product.service";
import { NAME_MAX, NOTES_MAX, SKU_MAX, SKU_PATTERN } from "../dto/product.dto";
import {
  IMPORT_TIPOS,
  ImportPreviewRow,
  ImportProductsDto,
  ImportFieldError,
  ImportRowValues,
  ImportTipo,
  ImportValidateResult,
} from "./product-import.dto";
import { normalizeHeader, normalizeNumber, parseCsv } from "./product-import.parser";

/** S2: the downloaded template must keep exactly these columns, in order. */
export const TEMPLATE_COLUMNS = [
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

const TEMPLATE_HEADER = TEMPLATE_COLUMNS.join(",");

/**
 * Two importable examples: a product with stock and a service with no stock.
 * Decimal values use a point, the delimiter is a comma and the SKU values
 * follow the same pattern the DTO enforces.
 */
const TEMPLATE_EXAMPLES = [
  "ARROZ-1KG,Arroz blanco 1 kg,producto,7790001000011,Arroz de grano largo,1.20,1.80,50,UND,Almacén,Distribuidora del Sur,true",
  "CONSULT-01,Consulta nutricional,servicio,,Sesión de 45 minutos,0.00,25.00,0,UND,Servicios,,false",
];

/** S1: hard limits measured on the raw request content. */
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_DATA_ROWS = 500;
const REQUIRED_COLUMNS = ["sku", "nombre", "tipo"] as const;

const BARCODE_MAX = 60;
const UNIT_MAX = 20;

const PUBLIC_TRUE = new Set(["true", "1", "si"]);
const PUBLIC_FALSE = new Set(["false", "0", "no"]);

@Injectable()
export class ProductImportService {
  constructor(private readonly prisma: PrismaService) {}

  /** CSV text with a UTF-8 BOM so Excel renders accents correctly. */
  template(): string {
    return `\uFEFF${[TEMPLATE_HEADER, ...TEMPLATE_EXAMPLES].join("\r\n")}\r\n`;
  }

  /**
   * Pure dry-run (S3/S4): parses and validates the whole file, reading only.
   * It never creates a Product or a StockMovement.
   */
  async validate(
    scope: ProductScope,
    dto: ImportProductsDto,
  ): Promise<ImportValidateResult> {
    const content = typeof dto.content === "string" ? dto.content : "";

    // S1: limits before any parsing work.
    if (Buffer.byteLength(content, "utf8") > MAX_FILE_BYTES) {
      throw new BadRequestException("El archivo supera el límite de 2 MB.");
    }
    if (content.trim() === "") {
      throw new BadRequestException("No se recibió contenido para importar.");
    }

    const parsed = parseCsv(content);
    if (parsed.rows.length === 0) {
      throw new BadRequestException("No se recibió contenido para importar.");
    }
    if (parsed.rows.length > MAX_DATA_ROWS) {
      throw new BadRequestException("El archivo supera el límite de 500 filas.");
    }

    // S2: tolerant headers. Unknown columns are ignored and a repeated column
    // keeps its first occurrence.
    const columnIndex = new Map<string, number>();
    parsed.header.forEach((raw, index) => {
      const key = normalizeHeader(raw);
      if (key !== "" && !columnIndex.has(key)) columnIndex.set(key, index);
    });

    const missingColumns = REQUIRED_COLUMNS.filter(
      (column) => !columnIndex.has(column),
    );
    if (missingColumns.length > 0) {
      throw new BadRequestException(
        `Faltan columnas obligatorias: ${missingColumns.join(", ")}.`,
      );
    }

    const cellOf = (cells: string[], column: string): string => {
      const index = columnIndex.get(column);
      return index === undefined ? "" : (cells[index] ?? "");
    };

    // S3/S7: one read per collection, never one query per row.
    const skuCells = parsed.rows
      .map((row) => cellOf(row.cells, "sku").trim())
      .filter((sku) => sku !== "");
    const uniqueSkus = [...new Set(skuCells)];

    const [existingProducts, categories, suppliers] = await Promise.all([
      uniqueSkus.length > 0
        ? this.prisma.product.findMany({
            where: {
              sku: { in: uniqueSkus },
              organizationId: scope.organizationId,
              deletedAt: null,
            },
            select: { sku: true },
          })
        : Promise.resolve([] as { sku: string }[]),
      this.prisma.category.findMany({
        where: {
          deletedAt: null,
          OR: scope.organizationId
            ? [{ organizationId: null }, { organizationId: scope.organizationId }]
            : [{ organizationId: null }],
        },
        select: { id: true, name: true },
      }),
      this.prisma.supplier.findMany({
        where: { organizationId: scope.organizationId, deletedAt: null },
        select: { id: true, name: true },
      }),
    ]);

    const existingSkus = new Set(existingProducts.map((product) => product.sku));

    const categoryByName = new Map<string, string>();
    for (const category of categories) {
      const key = normalizeHeader(category.name);
      if (key !== "" && !categoryByName.has(key)) {
        categoryByName.set(key, category.id);
      }
    }

    const supplierByName = new Map<string, string>();
    for (const supplier of suppliers) {
      const key = normalizeHeader(supplier.name);
      if (key !== "" && !supplierByName.has(key)) {
        supplierByName.set(key, supplier.id);
      }
    }

    const rows: ImportPreviewRow[] = [];
    const fieldErrors: ImportFieldError[] = [];
    const seenSkus = new Set<string>();

    for (const row of parsed.rows) {
      const line = row.line;
      const errors: string[] = [];
      const warnings: string[] = [];

      const pushError = (field: string, text: string) => {
        const message = `Fila ${line}: ${text}`;
        errors.push(message);
        fieldErrors.push({ line, field, message });
      };

      const sku = cellOf(row.cells, "sku").trim();
      if (sku === "") {
        pushError("sku", "el SKU es obligatorio.");
      } else {
        if (sku.length > SKU_MAX) {
          pushError(
            "sku",
            `el SKU no puede superar los ${SKU_MAX} caracteres.`,
          );
        }
        if (!SKU_PATTERN.test(sku)) {
          pushError(
            "sku",
            "el SKU solo puede contener letras, números, puntos, guiones y guiones bajos.",
          );
        }
        if (seenSkus.has(sku)) {
          pushError(
            "sku",
            `el SKU "${sku}" está repetido en el archivo.`,
          );
        } else {
          seenSkus.add(sku);
          if (existingSkus.has(sku)) {
            pushError("sku", `el SKU "${sku}" ya existe en el catálogo.`);
          }
        }
      }

      const nombre = cellOf(row.cells, "nombre").trim();
      if (nombre === "") {
        pushError("nombre", "el nombre es obligatorio.");
      } else if (nombre.length > NAME_MAX) {
        pushError(
          "nombre",
          `el nombre no puede superar los ${NAME_MAX} caracteres.`,
        );
      }

      const rawTipo = cellOf(row.cells, "tipo").trim().toLowerCase();
      let tipo: ImportTipo | null = null;
      if (rawTipo === "") {
        pushError("tipo", "el tipo es obligatorio.");
      } else if ((IMPORT_TIPOS as readonly string[]).includes(rawTipo)) {
        tipo = rawTipo as ImportTipo;
      } else {
        pushError("tipo", "el tipo debe ser producto, servicio o material.");
      }

      const barcode = cellOf(row.cells, "barcode").trim();
      if (barcode.length > BARCODE_MAX) {
        pushError(
          "barcode",
          `el código de barras no puede superar los ${BARCODE_MAX} caracteres.`,
        );
      }

      const descripcion = cellOf(row.cells, "descripcion").trim();
      if (descripcion.length > NOTES_MAX) {
        pushError(
          "descripcion",
          `la descripción no puede superar los ${NOTES_MAX} caracteres.`,
        );
      }

      const readNumber = (column: string, label: string): number => {
        const raw = cellOf(row.cells, column);
        const result = normalizeNumber(raw);
        if (!result.ok) {
          pushError(column, `${label} debe ser numérico.`);
          return 0;
        }
        const value = result.value ?? 0;
        if (value < 0) {
          pushError(column, `${label} no puede ser negativo.`);
        }
        if (result.ambiguous) {
          warnings.push(
            `Fila ${line}: el número ${raw.trim()} es ambiguo; se interpretó como ${value} sin decimales. Editalo en la vista previa si no es correcto.`,
          );
        }
        return value;
      };

      const costoUsd = readNumber("costo_usd", "el costo");
      const ventaUsd = readNumber("venta_usd", "el precio de venta");
      const stockInicial = readNumber("stock_inicial", "el stock inicial");

      let unidad = cellOf(row.cells, "unidad").trim().toUpperCase();
      if (unidad.length > UNIT_MAX) {
        pushError(
          "unidad",
          `la unidad no puede superar los ${UNIT_MAX} caracteres.`,
        );
      }
      if (unidad === "") unidad = "UND";

      const rawPublico = normalizeHeader(cellOf(row.cells, "publico"));
      let publico = false;
      if (rawPublico === "") {
        publico = false;
      } else if (PUBLIC_TRUE.has(rawPublico)) {
        publico = true;
      } else if (PUBLIC_FALSE.has(rawPublico)) {
        publico = false;
      } else {
        pushError("publico", "el campo público debe ser sí o no.");
      }

      const categoriaRaw = cellOf(row.cells, "categoria").trim();
      let categoriaId: string | null = null;
      if (categoriaRaw !== "") {
        categoriaId =
          categoryByName.get(normalizeHeader(categoriaRaw)) ?? null;
        if (!categoriaId) {
          warnings.push(
            `Fila ${line}: la categoría "${categoriaRaw}" no existe; se importará sin categoría.`,
          );
        }
      }

      const proveedorRaw = cellOf(row.cells, "proveedor").trim();
      let supplierId: string | null = null;
      if (proveedorRaw !== "") {
        supplierId =
          supplierByName.get(normalizeHeader(proveedorRaw)) ?? null;
        if (!supplierId) {
          warnings.push(
            `Fila ${line}: el proveedor "${proveedorRaw}" no existe; se importará sin proveedor.`,
          );
        }
      }

      const values: ImportRowValues = {
        sku,
        nombre,
        tipo: tipo ?? "producto",
        barcode,
        descripcion,
        costo_usd: costoUsd,
        venta_usd: ventaUsd,
        stock_inicial: stockInicial,
        unidad,
        categoria: categoriaId ? categoriaRaw : "",
        proveedor: supplierId ? proveedorRaw : "",
        publico,
      };

      rows.push({
        line,
        include: errors.length === 0,
        values,
        errors,
        warnings,
      });
    }

    const total = rows.length;
    const valid = rows.filter((row) => row.include).length;

    return {
      rows,
      errors: fieldErrors,
      summary: {
        total,
        valid,
        invalid: total - valid,
        warnings: rows.reduce((sum, row) => sum + row.warnings.length, 0),
      },
    };
  }
}
