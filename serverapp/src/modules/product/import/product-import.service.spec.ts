import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { normalizeHeader, parseCsv } from "./product-import.parser";
import { ProductImportService } from "./product-import.service";
import {
  IMPORT_TIPOS,
  ImportCommitDto,
  ImportCommitRowDto,
  ImportCommitRowValuesDto,
} from "./product-import.dto";

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
  $transaction: jest.fn(),
});

const makeProductService = (
  create: jest.Mock = jest.fn().mockResolvedValue({ id: "p-1" }),
) => ({ create });

const makeService = (
  prisma = makePrisma(),
  productService = makeProductService(),
) => new ProductImportService(prisma as any, productService as any);

const FAKE_TX = { __tx: true };

const makeCommitPrisma = () => {
  const prisma = makePrisma();
  prisma.$transaction.mockImplementation(async (callback: any) =>
    callback(FAKE_TX),
  );
  return prisma;
};

const commitValues = (
  overrides: Partial<ImportCommitRowValuesDto> = {},
): ImportCommitRowValuesDto => ({
  sku: "A-1",
  nombre: "Arroz",
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
});

const commitRow = (
  overrides: Partial<ImportCommitRowValuesDto> = {},
  options: { line?: number; include?: boolean } = {},
): ImportCommitRowDto => ({
  line: options.line ?? 2,
  include: options.include ?? true,
  values: commitValues(overrides),
});

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

describe("ProductImportService.commit", () => {
  it("creates the included valid rows, counts excluded and shares one tx per batch", async () => {
    const prisma = makeCommitPrisma();
    const create = jest.fn().mockResolvedValue({ id: "p-1" });
    const service = makeService(prisma as any, makeProductService(create));

    const result = await service.commit(SCOPE, [
      commitRow({ sku: "A-1", nombre: "Arroz" }, { line: 2 }),
      commitRow({ sku: "B-1", nombre: "Fideo" }, { line: 3 }),
      commitRow({ sku: "C-1", nombre: "Sal" }, { line: 4, include: false }),
    ]);

    expect(result).toEqual({ created: 2, skipped: 0, excluded: 1, errors: [] });
    expect(create).toHaveBeenCalledTimes(2);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][2]).toBe(FAKE_TX);
    expect(create.mock.calls[1][2]).toBe(FAKE_TX);
  });

  it("skips an invalid included row and keeps the invariant", async () => {
    const prisma = makeCommitPrisma();
    const create = jest.fn().mockResolvedValue({ id: "p-1" });
    const service = makeService(prisma as any, makeProductService(create));

    const rows = [
      commitRow({ sku: "A-1", nombre: "Arroz" }, { line: 2 }),
      commitRow({ sku: "B-1", nombre: "Zapato", tipo: "zapato" }, { line: 3 }),
    ];
    const result = await service.commit(SCOPE, rows);

    expect(result.created).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.excluded).toBe(0);
    expect(result.created + result.skipped + result.excluded).toBe(rows.length);
    expect(result.errors).toEqual([
      {
        line: 3,
        field: "tipo",
        message: "Fila 3: el tipo debe ser producto, servicio o material.",
      },
    ]);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("splits 101 rows into exactly 2 transactions (100 + 1)", async () => {
    const prisma = makeCommitPrisma();
    const create = jest.fn().mockResolvedValue({ id: "p-1" });
    const service = makeService(prisma as any, makeProductService(create));

    const rows = Array.from({ length: 101 }, (_, index) =>
      commitRow(
        { sku: `SKU-${index}`, nombre: `Producto ${index}` },
        { line: index + 2 },
      ),
    );

    const result = await service.commit(SCOPE, rows);

    expect(result.created).toBe(101);
    expect(create).toHaveBeenCalledTimes(101);
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
  });

  it("retries a failed batch row by row so one bad row does not sink the others", async () => {
    const prisma = makeCommitPrisma();
    const badSku = "SKU-50";
    const create = jest.fn(async (_scope: unknown, dto: { sku: string }) => {
      if (dto.sku === badSku) {
        throw new Error(`Ya existe un producto con el SKU "${badSku}".`);
      }
      return { id: dto.sku };
    });
    const service = makeService(prisma as any, makeProductService(create));

    const rows = Array.from({ length: 100 }, (_, index) =>
      commitRow(
        { sku: `SKU-${index}`, nombre: `Producto ${index}` },
        { line: index + 2 },
      ),
    );

    const result = await service.commit(SCOPE, rows);

    expect(result.created).toBe(99);
    expect(result.skipped).toBe(1);
    expect(result.errors).toEqual([
      {
        line: 52,
        field: "row",
        message: `Fila 52: Ya existe un producto con el SKU "${badSku}".`,
      },
    ]);
  });

  it("creates only the first of two rows edited to the same SKU", async () => {
    const prisma = makeCommitPrisma();
    const create = jest.fn().mockResolvedValue({ id: "p-1" });
    const service = makeService(prisma as any, makeProductService(create));

    const result = await service.commit(SCOPE, [
      commitRow({ sku: "A-1", nombre: "Arroz" }, { line: 2 }),
      commitRow({ sku: "A-1", nombre: "Arroz bis" }, { line: 3 }),
    ]);

    expect(result.created).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.errors).toEqual([
      {
        line: 3,
        field: "sku",
        message: 'Fila 3: el SKU "A-1" está repetido en el archivo.',
      },
    ]);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("skips a SKU that already exists in the tenant", async () => {
    const prisma = makeCommitPrisma();
    prisma.product.findMany.mockResolvedValue([{ sku: "A-1" }]);
    const create = jest.fn().mockResolvedValue({ id: "p-1" });
    const service = makeService(prisma as any, makeProductService(create));

    const result = await service.commit(SCOPE, [
      commitRow({ sku: "A-1", nombre: "Arroz" }, { line: 2 }),
    ]);

    expect(result.created).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.errors[0].message).toBe(
      'Fila 2: el SKU "A-1" ya existe en el catálogo.',
    );
    expect(create).not.toHaveBeenCalled();
  });

  it("prefers the tenant category over a same-named system category", async () => {
    const prisma = makeCommitPrisma();
    prisma.category.findMany.mockResolvedValue([
      { id: "sys-cat", name: "Bebidas", organizationId: null },
      { id: "tenant-cat", name: "Bebidas", organizationId: "org-1" },
    ]);
    const create = jest.fn().mockResolvedValue({ id: "p-1" });
    const service = makeService(prisma as any, makeProductService(create));

    await service.commit(SCOPE, [
      commitRow({ sku: "A-1", nombre: "Arroz", categoria: "Bebidas" }),
    ]);

    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][1]).toMatchObject({ categoryId: "tenant-cat" });
  });

  it("never passes excluded rows to create", async () => {
    const prisma = makeCommitPrisma();
    const create = jest.fn().mockResolvedValue({ id: "p-1" });
    const service = makeService(prisma as any, makeProductService(create));

    const result = await service.commit(SCOPE, [
      commitRow({ sku: "A-1", nombre: "Arroz" }, { line: 2 }),
      commitRow({ sku: "B-1", nombre: "Fideo" }, { line: 3, include: false }),
    ]);

    expect(result).toEqual({ created: 1, skipped: 0, excluded: 1, errors: [] });
    expect(create).toHaveBeenCalledTimes(1);
    expect((create.mock.calls[0][1] as { sku: string }).sku).toBe("A-1");
  });

  it("rejects more than 500 rows with the exact message", async () => {
    const service = makeService();
    const rows = Array.from({ length: 501 }, (_, index) =>
      commitRow({ sku: `SKU-${index}`, nombre: `Producto ${index}` }),
    );

    await expect(service.commit(SCOPE, rows)).rejects.toThrow(
      "El archivo supera el límite de 500 filas.",
    );
  });

  it("rejects zero rows with the exact message", async () => {
    const service = makeService();

    await expect(service.commit(SCOPE, [])).rejects.toThrow(
      "No se recibió contenido para importar.",
    );
  });
});

describe("ImportCommitDto transport (S6)", () => {
  const validateBody = async (payload: Record<string, unknown>) =>
    validate(plainToInstance(ImportCommitDto, payload), {
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });

  it("accepts an included invalid row so the request is 200 with skipped: 1, not 400", async () => {
    const payload = {
      rows: [
        {
          line: 2,
          include: true,
          values: {
            sku: "A-1",
            nombre: "Arroz",
            tipo: "zapato",
            costo_usd: "abc",
          },
        },
      ],
    };

    // The global ValidationPipe must let it through (otherwise it is a 400)
    // and `@Allow()` must keep the loose values after the whitelist pass.
    const instance = plainToInstance(ImportCommitDto, payload);
    const errors = await validate(instance, {
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });
    expect(errors).toHaveLength(0);
    expect(instance.rows[0].values.tipo).toBe("zapato");
    expect(instance.rows[0].values.costo_usd).toBe("abc");

    // And the service reports the invalid row in `skipped` instead of failing.
    const service = makeService();
    const result = await service.commit(SCOPE, instance.rows);

    expect(result.created).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.excluded).toBe(0);
    expect(result.errors[0].message).toContain("Fila 2:");
  });

  it("still rejects more than 500 rows in the transport", async () => {
    const errors = await validateBody({
      rows: Array.from({ length: 501 }, (_, index) => ({
        line: index + 2,
        include: true,
        values: { sku: `S-${index}`, nombre: "Producto", tipo: "producto" },
      })),
    });

    expect(errors.some((error) => error.property === "rows")).toBe(true);
  });
});
