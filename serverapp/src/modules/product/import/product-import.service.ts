import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import { ProductService, type ProductScope } from "../product.service";
import { CreateProductDto } from "../dto/product.dto";
import { NAME_MAX, NOTES_MAX, SKU_MAX, SKU_PATTERN } from "../dto/product.dto";
import {
  IMPORT_TIPOS,
  ImportCommitResult,
  ImportCommitRowDto,
  ImportCommitRowValuesDto,
  ImportFieldError,
  ImportPreviewRow,
  ImportProductsDto,
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

/** S6: rows are committed in batches, one transaction per batch. */
const COMMIT_BATCH_SIZE = 100;
const COMMIT_TX_OPTIONS = { maxWait: 5_000, timeout: 30_000 };

const BARCODE_MAX = 60;
const UNIT_MAX = 20;

const PUBLIC_TRUE = new Set(["true", "1", "si"]);
const PUBLIC_FALSE = new Set(["false", "0", "no"]);

/** Text used when a create failure carries no readable message. */
const GENERIC_CREATE_ERROR = "no se pudo crear el producto.";

/** Shared state for one validation pass (S3), so validate/commit cannot drift. */
interface RowValidationContext {
  /** SKUs that already exist in the tenant. */
  existingSkus: Set<string>;
  /** SKUs seen earlier in this same request (first occurrence wins). */
  seenSkus: Set<string>;
  /** Normalized category name -> category id (tenant beats system). */
  categoryByName: Map<string, string>;
  /** Normalized supplier name -> supplier id (tenant only). */
  supplierByName: Map<string, string>;
  /** Flat error list filled while rows are validated. */
  fieldErrors: ImportFieldError[];
}

interface ValidatedRow {
  values: ImportRowValues;
  errors: string[];
  warnings: string[];
  categoryId: string | null;
  supplierId: string | null;
}

interface LookupMaps {
  existingSkus: Set<string>;
  categoryByName: Map<string, string>;
  supplierByName: Map<string, string>;
}

interface ValidCommitRow {
  line: number;
  values: ImportRowValues;
  categoryId: string | null;
  supplierId: string | null;
}

@Injectable()
export class ProductImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productService: ProductService,
  ) {}

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

    const lookups = await this.loadLookups(scope, uniqueSkus);

    const rows: ImportPreviewRow[] = [];
    const fieldErrors: ImportFieldError[] = [];
    const context: RowValidationContext = {
      ...lookups,
      seenSkus: new Set<string>(),
      fieldErrors,
    };

    for (const row of parsed.rows) {
      const validated = this.validateRow(
        (column) => cellOf(row.cells, column),
        row.line,
        context,
      );

      rows.push({
        line: row.line,
        include: validated.errors.length === 0,
        values: validated.values,
        errors: validated.errors,
        warnings: validated.warnings,
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

  /**
   * Creates the reviewed rows (S6): re-validates every included row, then
   * writes the valid ones through `ProductService.create()` in batches of 100,
   * one transaction per batch. Invalid included rows are reported in `skipped`.
   */
  async commit(
    scope: ProductScope,
    rows: ImportCommitRowDto[],
  ): Promise<ImportCommitResult> {
    const received = rows ?? [];

    // S6: the limits are enforced here too; never trust the transport alone.
    if (received.length > MAX_DATA_ROWS) {
      throw new BadRequestException("El archivo supera el límite de 500 filas.");
    }
    if (received.length === 0) {
      throw new BadRequestException("No se recibió contenido para importar.");
    }

    const excluded = received.filter((row) => row.include !== true).length;
    const included = received.filter((row) => row.include === true);

    const errors: ImportFieldError[] = [];
    let skipped = 0;
    let created = 0;

    if (included.length === 0) {
      return { created, skipped, excluded, errors };
    }

    const valueOf = (values: ImportCommitRowValuesDto, column: string): string => {
      const raw = (values as unknown as Record<string, unknown>)[column];
      if (raw === undefined || raw === null) return "";
      if (typeof raw === "boolean") return raw ? "true" : "false";
      return String(raw);
    };

    // S3/S7: same batch read as the dry-run.
    const uniqueSkus = [
      ...new Set(
        included
          .map((row) => valueOf(row.values, "sku").trim())
          .filter((sku) => sku !== ""),
      ),
    ];

    const lookups = await this.loadLookups(scope, uniqueSkus);

    const context: RowValidationContext = {
      ...lookups,
      seenSkus: new Set<string>(),
      fieldErrors: errors,
    };

    const valid: ValidCommitRow[] = [];
    included.forEach((row, index) => {
      const line = typeof row.line === "number" ? row.line : index + 1;
      const validated = this.validateRow(
        (column) => valueOf(row.values, column),
        line,
        context,
      );

      if (validated.errors.length > 0) {
        skipped += 1;
        return;
      }

      valid.push({
        line,
        values: validated.values,
        categoryId: validated.categoryId,
        supplierId: validated.supplierId,
      });
    });

    for (let start = 0; start < valid.length; start += COMMIT_BATCH_SIZE) {
      const batch = valid.slice(start, start + COMMIT_BATCH_SIZE);

      try {
        await this.prisma.$transaction(
          async (tx) => {
            for (const row of batch) {
              await this.productService.create(
                scope,
                this.toCreateDto(row),
                tx,
              );
            }
          },
          COMMIT_TX_OPTIONS,
        );
        created += batch.length;
      } catch {
        // S6: a failed batch rolls back as a whole; retry row by row so one
        // bad row does not sink the other 99.
        for (const row of batch) {
          try {
            await this.prisma.$transaction(
              async (tx) => {
                await this.productService.create(
                  scope,
                  this.toCreateDto(row),
                  tx,
                );
              },
              COMMIT_TX_OPTIONS,
            );
            created += 1;
          } catch (error) {
            skipped += 1;
            errors.push({
              line: row.line,
              field: "row",
              message: `Fila ${row.line}: ${createErrorMessage(error)}`,
            });
          }
        }
      }
    }

    return { created, skipped, excluded, errors };
  }

  /**
   * One read per collection for the whole import (S3/S7). Category resolution
   * prefers the tenant's row over a same-named system category
   * (`organizationId: null`).
   */
  private async loadLookups(
    scope: ProductScope,
    uniqueSkus: string[],
  ): Promise<LookupMaps> {
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
        select: { id: true, name: true, organizationId: true },
      }),
      this.prisma.supplier.findMany({
        where: { organizationId: scope.organizationId, deletedAt: null },
        select: { id: true, name: true },
      }),
    ]);

    return {
      existingSkus: new Set(existingProducts.map((product) => product.sku)),
      categoryByName: this.buildCategoryMap(categories),
      supplierByName: this.buildSupplierMap(suppliers),
    };
  }

  /** Normalized name -> id; a tenant category beats a system one. */
  private buildCategoryMap(
    categories: { id: string; name: string; organizationId: string | null }[],
  ): Map<string, string> {
    const categoryByName = new Map<string, string>();
    const tenantOwned = new Set<string>();

    for (const category of categories) {
      const key = normalizeHeader(category.name);
      if (key === "") continue;

      const isTenantCategory = category.organizationId !== null;
      const existingIsTenant = tenantOwned.has(key);

      if (!categoryByName.has(key) || (isTenantCategory && !existingIsTenant)) {
        categoryByName.set(key, category.id);
        if (isTenantCategory) tenantOwned.add(key);
      }
    }

    return categoryByName;
  }

  /** Suppliers are tenant-only, so the first occurrence wins. */
  private buildSupplierMap(
    suppliers: { id: string; name: string }[],
  ): Map<string, string> {
    const supplierByName = new Map<string, string>();

    for (const supplier of suppliers) {
      const key = normalizeHeader(supplier.name);
      if (key !== "" && !supplierByName.has(key)) {
        supplierByName.set(key, supplier.id);
      }
    }

    return supplierByName;
  }

  /**
   * The single source of truth for the per-row rules (S3), shared by the
   * dry-run and the commit. `cellOf` reads one column as text so both a CSV
   * row and a reviewed commit row go through the exact same checks.
   */
  private validateRow(
    cellOf: (column: string) => string,
    line: number,
    context: RowValidationContext,
  ): ValidatedRow {
    const errors: string[] = [];
    const warnings: string[] = [];

    const pushError = (field: string, text: string) => {
      const message = `Fila ${line}: ${text}`;
      errors.push(message);
      context.fieldErrors.push({ line, field, message });
    };

    const sku = cellOf("sku").trim();
    if (sku === "") {
      pushError("sku", "el SKU es obligatorio.");
    } else {
      if (sku.length > SKU_MAX) {
        pushError("sku", `el SKU no puede superar los ${SKU_MAX} caracteres.`);
      }
      if (!SKU_PATTERN.test(sku)) {
        pushError(
          "sku",
          "el SKU solo puede contener letras, números, puntos, guiones y guiones bajos.",
        );
      }
      if (context.seenSkus.has(sku)) {
        pushError("sku", `el SKU "${sku}" está repetido en el archivo.`);
      } else {
        context.seenSkus.add(sku);
        if (context.existingSkus.has(sku)) {
          pushError("sku", `el SKU "${sku}" ya existe en el catálogo.`);
        }
      }
    }

    const nombre = cellOf("nombre").trim();
    if (nombre === "") {
      pushError("nombre", "el nombre es obligatorio.");
    } else if (nombre.length > NAME_MAX) {
      pushError(
        "nombre",
        `el nombre no puede superar los ${NAME_MAX} caracteres.`,
      );
    }

    const rawTipo = cellOf("tipo").trim().toLowerCase();
    let tipo: ImportTipo | null = null;
    if (rawTipo === "") {
      pushError("tipo", "el tipo es obligatorio.");
    } else if ((IMPORT_TIPOS as readonly string[]).includes(rawTipo)) {
      tipo = rawTipo as ImportTipo;
    } else {
      pushError("tipo", "el tipo debe ser producto, servicio o material.");
    }

    const barcode = cellOf("barcode").trim();
    if (barcode.length > BARCODE_MAX) {
      pushError(
        "barcode",
        `el código de barras no puede superar los ${BARCODE_MAX} caracteres.`,
      );
    }

    const descripcion = cellOf("descripcion").trim();
    if (descripcion.length > NOTES_MAX) {
      pushError(
        "descripcion",
        `la descripción no puede superar los ${NOTES_MAX} caracteres.`,
      );
    }

    const readNumber = (column: string, label: string): number => {
      const raw = cellOf(column);
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

    let unidad = cellOf("unidad").trim().toUpperCase();
    if (unidad.length > UNIT_MAX) {
      pushError(
        "unidad",
        `la unidad no puede superar los ${UNIT_MAX} caracteres.`,
      );
    }
    if (unidad === "") unidad = "UND";

    const rawPublico = normalizeHeader(cellOf("publico"));
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

    const categoriaRaw = cellOf("categoria").trim();
    let categoriaId: string | null = null;
    if (categoriaRaw !== "") {
      categoriaId =
        context.categoryByName.get(normalizeHeader(categoriaRaw)) ?? null;
      if (!categoriaId) {
        warnings.push(
          `Fila ${line}: la categoría "${categoriaRaw}" no existe; se importará sin categoría.`,
        );
      }
    }

    const proveedorRaw = cellOf("proveedor").trim();
    let supplierId: string | null = null;
    if (proveedorRaw !== "") {
      supplierId =
        context.supplierByName.get(normalizeHeader(proveedorRaw)) ?? null;
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

    return { values, errors, warnings, categoryId: categoriaId, supplierId };
  }

  /**
   * Maps a validated row to the regular create DTO (S3/S6). `status` is left
   * out on purpose: `ProductService.create()` derives it from the stock/type.
   */
  private toCreateDto(row: ValidCommitRow): CreateProductDto {
    const { values } = row;

    return {
      sku: values.sku,
      name: values.nombre,
      barcode: values.barcode || undefined,
      description: values.descripcion || undefined,
      costPriceUSD: values.costo_usd,
      salePriceUSD: values.venta_usd,
      stock: values.stock_inicial,
      unit: values.unidad || "UND",
      isService: values.tipo === "servicio",
      isRawMaterial: values.tipo === "material",
      isPublic: values.publico,
      categoryId: row.categoryId ?? undefined,
      supplierId: row.supplierId ?? undefined,
    };
  }
}

/** Readable text for a failed create, wherever the error came from. */
function createErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  const message = (error as { message?: unknown } | null)?.message;
  if (typeof message === "string" && message) return message;
  return GENERIC_CREATE_ERROR;
}
