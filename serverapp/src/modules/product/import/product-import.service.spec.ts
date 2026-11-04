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

const HEADER = TEMPLATE_COLUMNS.join(",");
const SCOPE = { organizationId: "org-1" };

const makePrisma = () => ({
  product: {
    findMany: jest.fn().mockResolvedValue([]),
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  category: { findMany: jest.fn().mockResolvedValue([]) },
  supplier: { findMany: jest.fn().mockResolvedValue([]) },
  stockMovement: { create: jest.fn() },
});

const makeService = (prisma = makePrisma()) =>
  new ProductImportService(prisma as any);

/** Quotes a CSV cell when it contains the delimiter, a quote or a newline. */
const csvCell = (value: string): string =>
  /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

const rowOf = (
  overrides: Partial<
    Record<
      | "sku"
      | "nombre"
      | "tipo"
      | "barcode"
      | "descripcion"
      | "costo"
      | "venta"
      | "stock"
      | "unidad"
      | "categoria"
      | "proveedor"
      | "publico",
      string
    >
  > = {},
): string[] => [
  overrides.sku ?? "",
  overrides.nombre ?? "",
  overrides.tipo ?? "",
  overrides.barcode ?? "",
  overrides.descripcion ?? "",
  overrides.costo ?? "",
  overrides.venta ?? "",
  overrides.stock ?? "",
  overrides.unidad ?? "",
  overrides.categoria ?? "",
  overrides.proveedor ?? "",
  overrides.publico ?? "",
];

const buildCsv = (rows: string[][]): string =>
  [HEADER, ...rows.map((row) => row.map(csvCell).join(","))].join("\n");

describe("ProductImportService.template", () => {
  const service = makeService();
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

describe("ProductImportService.validate", () => {
  it("parses a semicolon-delimited file", async () => {
    const service = makeService();

    const result = await service.validate(SCOPE, {
      content: "sku;nombre;tipo\nA;Arroz;producto",
    });

    expect(result.summary.valid).toBe(1);
    expect(result.rows[0].include).toBe(true);
  });

  it("validates a clean two-row file", async () => {
    const service = makeService();

    const result = await service.validate(SCOPE, {
      content: buildCsv([
        rowOf({
          sku: "A-1",
          nombre: "Arroz",
          tipo: "producto",
          costo: "1.20",
          venta: "1.80",
          stock: "50",
          unidad: "kg",
          publico: "si",
        }),
        rowOf({
          sku: "B-1",
          nombre: "Fideo",
          tipo: "producto",
          stock: "0",
        }),
      ]),
    });

    expect(result.summary).toEqual({
      total: 2,
      valid: 2,
      invalid: 0,
      warnings: 0,
    });
    expect(result.errors).toEqual([]);
    expect(result.rows.map((row) => row.include)).toEqual([true, true]);
    expect(result.rows[1].values.unidad).toBe("UND");
  });

  it("rejects a file missing a required column and names it", async () => {
    const service = makeService();

    await expect(
      service.validate(SCOPE, { content: "sku,nombre\nA,Arroz" }),
    ).rejects.toThrow("Faltan columnas obligatorias: tipo.");
  });

  it("rejects empty content and a header-only file", async () => {
    const service = makeService();

    await expect(
      service.validate(SCOPE, { content: "" }),
    ).rejects.toThrow("No se recibió contenido para importar.");

    await expect(service.validate(SCOPE, { content: HEADER })).rejects.toThrow(
      "No se recibió contenido para importar.",
    );
  });

  it("rejects content over 2 MB", async () => {
    const service = makeService();

    await expect(
      service.validate(SCOPE, {
        content: "a".repeat(2 * 1024 * 1024 + 1),
      }),
    ).rejects.toThrow("El archivo supera el límite de 2 MB.");
  });

  it("rejects more than 500 data rows", async () => {
    const service = makeService();
    const rows = Array.from({ length: 501 }, (_, index) =>
      rowOf({ sku: `SKU-${index}`, nombre: "Producto", tipo: "producto" }),
    );

    await expect(
      service.validate(SCOPE, { content: buildCsv(rows) }),
    ).rejects.toThrow("El archivo supera el límite de 500 filas.");
  });

  it("marks repeated SKUs inside the file: first valid, later invalid", async () => {
    const service = makeService();

    const result = await service.validate(SCOPE, {
      content: buildCsv([
        rowOf({ sku: "A-1", nombre: "Arroz", tipo: "producto" }),
        rowOf({ sku: "A-1", nombre: "Arroz bis", tipo: "producto" }),
      ]),
    });

    expect(result.rows[0].include).toBe(true);
    expect(result.rows[1].include).toBe(false);
    expect(result.rows[1].errors).toContain(
      'Fila 3: el SKU "A-1" está repetido en el archivo.',
    );
  });

  it("marks a SKU that already exists in the tenant as invalid", async () => {
    const prisma = makePrisma();
    prisma.product.findMany.mockResolvedValue([{ sku: "A-1" }]);
    const service = makeService(prisma);

    const result = await service.validate(SCOPE, {
      content: buildCsv([
        rowOf({ sku: "A-1", nombre: "Arroz", tipo: "producto" }),
      ]),
    });

    expect(result.rows[0].include).toBe(false);
    expect(result.rows[0].errors).toContain(
      'Fila 2: el SKU "A-1" ya existe en el catálogo.',
    );
    expect(prisma.product.findMany).toHaveBeenCalledTimes(1);
  });

  it("rejects an unknown tipo with the exact message", async () => {
    const service = makeService();

    const result = await service.validate(SCOPE, {
      content: buildCsv([
        rowOf({ sku: "A-1", nombre: "Arroz", tipo: "raro" }),
      ]),
    });

    expect(result.rows[0].include).toBe(false);
    expect(result.rows[0].errors).toContain(
      "Fila 2: el tipo debe ser producto, servicio o material.",
    );
  });

  it("rejects an unparseable publico value", async () => {
    const service = makeService();

    const result = await service.validate(SCOPE, {
      content: buildCsv([
        rowOf({
          sku: "A-1",
          nombre: "Arroz",
          tipo: "producto",
          publico: "quizas",
        }),
      ]),
    });

    expect(result.rows[0].include).toBe(false);
    expect(result.rows[0].errors).toContain(
      "Fila 2: el campo público debe ser sí o no.",
    );
  });

  it("warns but keeps a row whose categoria does not exist", async () => {
    const service = makeService();

    const result = await service.validate(SCOPE, {
      content: buildCsv([
        rowOf({
          sku: "A-1",
          nombre: "Arroz",
          tipo: "producto",
          categoria: "Bebidas",
        }),
      ]),
    });

    expect(result.rows[0].include).toBe(true);
    expect(result.rows[0].values.categoria).toBe("");
    expect(result.rows[0].warnings).toContain(
      'Fila 2: la categoría "Bebidas" no existe; se importará sin categoría.',
    );
    expect(result.summary.warnings).toBe(1);
  });

  it("warns but keeps a row whose proveedor does not exist", async () => {
    const service = makeService();

    const result = await service.validate(SCOPE, {
      content: buildCsv([
        rowOf({
          sku: "A-1",
          nombre: "Arroz",
          tipo: "producto",
          proveedor: "Proveedor X",
        }),
      ]),
    });

    expect(result.rows[0].include).toBe(true);
    expect(result.rows[0].values.proveedor).toBe("");
    expect(result.rows[0].warnings).toContain(
      'Fila 2: el proveedor "Proveedor X" no existe; se importará sin proveedor.',
    );
  });

  it("interprets an ambiguous 1.234 as 1234 with a warning", async () => {
    const service = makeService();

    const result = await service.validate(SCOPE, {
      content: buildCsv([
        rowOf({
          sku: "A-1",
          nombre: "Arroz",
          tipo: "producto",
          venta: "1.234",
        }),
      ]),
    });

    expect(result.rows[0].values.venta_usd).toBe(1234);
    expect(result.rows[0].warnings).toContain(
      "Fila 2: el número 1.234 es ambiguo; se interpretó como 1234 sin decimales. Editalo en la vista previa si no es correcto.",
    );
  });

  it("normalizes comma decimals and currency symbols", async () => {
    const service = makeService();

    const result = await service.validate(SCOPE, {
      content: buildCsv([
        rowOf({
          sku: "A-1",
          nombre: "Arroz",
          tipo: "producto",
          venta: "12,50",
        }),
        rowOf({
          sku: "A-2",
          nombre: "Fideo",
          tipo: "producto",
          venta: "Bs 1.234,56",
        }),
      ]),
    });

    expect(result.rows[0].values.venta_usd).toBe(12.5);
    expect(result.rows[1].values.venta_usd).toBe(1234.56);
  });

  it("normalizes unidad to uppercase with UND as the default", async () => {
    const service = makeService();

    const result = await service.validate(SCOPE, {
      content: buildCsv([
        rowOf({
          sku: "A-1",
          nombre: "Arroz",
          tipo: "producto",
          unidad: "kg",
        }),
        rowOf({ sku: "A-2", nombre: "Fideo", tipo: "producto" }),
      ]),
    });

    expect(result.rows[0].values.unidad).toBe("KG");
    expect(result.rows[1].values.unidad).toBe("UND");
  });

  it("never writes during the dry-run", async () => {
    const prisma = makePrisma();
    const service = makeService(prisma);

    await service.validate(SCOPE, {
      content: buildCsv([
        rowOf({ sku: "A-1", nombre: "Arroz", tipo: "producto" }),
      ]),
    });

    expect(prisma.product.create).not.toHaveBeenCalled();
    expect(prisma.stockMovement.create).not.toHaveBeenCalled();
    expect(prisma.category.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.supplier.findMany).toHaveBeenCalledTimes(1);
  });
});
