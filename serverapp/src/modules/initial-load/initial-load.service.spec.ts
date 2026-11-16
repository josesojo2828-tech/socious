import "reflect-metadata";
import { computeCreditDueDate } from "../sale/util/credit-due-date";
import { InitialLoadService } from "./initial-load.service";
import { INITIAL_LOAD_COLUMNS } from "./initial-load.dto";
import { normalizeHeader, parseCsv } from "./initial-load.parser";

const HEADER = INITIAL_LOAD_COLUMNS.join(",");
const SCOPE = { organizationId: "org-1", createdById: "u-1" };

type RowKey = (typeof INITIAL_LOAD_COLUMNS)[number];

const csvCell = (value: string): string =>
  /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

const rowOf = (overrides: Partial<Record<RowKey, string>> = {}): string[] =>
  INITIAL_LOAD_COLUMNS.map((column) => overrides[column] ?? "");

const buildCsv = (rows: string[][], header = HEADER): string =>
  [header, ...rows.map((row) => row.map(csvCell).join(","))].join("\n");

const validRow = (overrides: Partial<Record<RowKey, string>> = {}): string[] =>
  rowOf({
    fecha: "2024-01-15",
    cliente_nombre: "Ana Pérez",
    producto: "Arroz blanco",
    cantidad: "2",
    precio_unitario: "1,50",
    ...overrides,
  });

const makePrisma = () => ({
  client: { findMany: jest.fn().mockResolvedValue([]) },
  product: { findMany: jest.fn().mockResolvedValue([]) },
  sale: {
    findMany: jest.fn().mockResolvedValue([]),
  },
});

const makeClients = () => ({
  create: jest.fn(async (_scope: unknown, data: Record<string, unknown>) => ({
    id: "client-new",
    ...data,
  })),
});

const makeProducts = () => ({
  create: jest.fn(async (_scope: unknown, data: Record<string, unknown>) => ({
    id: "product-new",
    taxRate: 0,
    ...data,
  })),
});

const makeSales = () => ({
  create: jest.fn(
    async (_scope: unknown, data: Record<string, unknown>) => ({
      id: "sale-1",
      saleNumber: data.saleNumber,
    }),
  ),
});

const productRecord = (overrides: Record<string, unknown> = {}) => ({
  id: "product-1",
  sku: "ARROZ-1KG",
  name: "Arroz blanco",
  salePriceUSD: "1.50",
  costPriceUSD: "0",
  taxRate: "0",
  unit: "UND",
  ...overrides,
});

const clientRecord = (overrides: Record<string, unknown> = {}) => ({
  id: "client-1",
  name: "Ana Pérez",
  phone: null,
  email: null,
  ...overrides,
});

const manualDto = (overrides: Record<string, unknown> = {}) => ({
  clientName: "Ana Pérez",
  productName: "Arroz blanco",
  quantity: 2,
  unitPriceUSD: 1.5,
  ...overrides,
});

const makeService = (
  prisma = makePrisma(),
  sales = makeSales(),
  clients = makeClients(),
  products = makeProducts(),
) =>
  new InitialLoadService(
    prisma as any,
    sales as any,
    clients as any,
    products as any,
  );

describe("InitialLoadService.template", () => {
  const service = makeService();
  const csv = service.template();

  it("starts with a UTF-8 BOM", () => {
    expect(csv.startsWith("\uFEFF")).toBe(true);
  });

  it("keeps the documented header order", () => {
    const parsed = parseCsv(csv);

    expect(parsed.header.map(normalizeHeader)).toEqual([
      ...INITIAL_LOAD_COLUMNS,
    ]);
  });

  it("ships two example rows with every required column", () => {
    const parsed = parseCsv(csv);

    expect(parsed.rows.length).toBeGreaterThanOrEqual(2);
    for (const row of parsed.rows) {
      expect(row.cells).toHaveLength(INITIAL_LOAD_COLUMNS.length);
      for (const column of [
        "fecha",
        "cliente_nombre",
        "producto",
        "cantidad",
        "precio_unitario",
      ]) {
        expect(
          row.cells[INITIAL_LOAD_COLUMNS.indexOf(column as RowKey)],
        ).not.toBe("");
      }
    }
  });
});

describe("InitialLoadService.validate", () => {
  it("validates a clean file and computes the line total", async () => {
    const service = makeService();

    const result = await service.validate(SCOPE, {
      content: buildCsv([validRow()]),
    });

    expect(result.totalRows).toBe(1);
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.rows[0]).toMatchObject({
      line: 2,
      clientName: "Ana Pérez",
      productName: "Arroz blanco",
      quantity: 2,
      unitPriceUSD: 1.5,
      totalUSD: 3,
      status: "ok",
    });
  });

  it("ignores an unknown column and validates the row", async () => {
    const service = makeService();
    const header = `${HEADER},columna_extra`;
    const row = [...validRow(), "ignorame"];

    const result = await service.validate(SCOPE, {
      content: buildCsv([row], header),
    });

    expect(result.rows[0].status).toBe("ok");
    expect(result.errors).toEqual([]);
  });

  it("rejects a file missing a required column and names it", async () => {
    const service = makeService();

    await expect(
      service.validate(SCOPE, {
        content: buildCsv([validRow()], "fecha,cliente_nombre,cantidad"),
      }),
    ).rejects.toThrow("Faltan columnas obligatorias: producto, precio_unitario.");
  });

  it("rejects empty content and a header-only file", async () => {
    const service = makeService();

    await expect(service.validate(SCOPE, { content: "" })).rejects.toThrow(
      "No se recibió contenido para importar.",
    );
    await expect(
      service.validate(SCOPE, { content: HEADER }),
    ).rejects.toThrow("No se recibió contenido para importar.");
  });

  it("rejects content over 2 MB", async () => {
    const service = makeService();

    await expect(
      service.validate(SCOPE, { content: "a".repeat(2 * 1024 * 1024 + 1) }),
    ).rejects.toThrow("El archivo supera el límite de 2 MB.");
  });

  it("rejects more than 500 data rows", async () => {
    const service = makeService();
    const rows = Array.from({ length: 501 }, (_, index) =>
      validRow({ producto: `Producto ${index}` }),
    );

    await expect(
      service.validate(SCOPE, { content: buildCsv(rows) }),
    ).rejects.toThrow("El archivo supera el límite de 500 filas.");
  });

  it("rejects an invalid date and a future date", async () => {
    const service = makeService();

    const result = await service.validate(SCOPE, {
      content: buildCsv([
        validRow({ fecha: "2024-13-40" }),
        validRow({ fecha: "2999-01-01" }),
      ]),
    });

    expect(result.rows[0].status).toBe("error");
    expect(result.rows[0].errors).toContain(
      'Fila 2: La fecha no es válida: "2024-13-40" (use AAAA-MM-DD o DD/MM/AAAA).',
    );
    expect(result.rows[1].errors).toContain(
      "Fila 3: La fecha no puede ser futura.",
    );
    expect(result.ok).toBe(false);
  });

  it("accepts DD/MM/YYYY dates", async () => {
    const service = makeService();

    const result = await service.validate(SCOPE, {
      content: buildCsv([validRow({ fecha: "15/01/2024" })]),
    });

    expect(result.rows[0].status).toBe("ok");
  });

  it("rejects an unknown cadence", async () => {
    const service = makeService();

    const result = await service.validate(SCOPE, {
      content: buildCsv([validRow({ cadencia: "SEMANAL" })]),
    });

    expect(result.rows[0].errors).toContain(
      "Fila 2: La cadencia debe ser QUINCENAL, MENSUAL o CADA_N_DIAS.",
    );
  });

  it("rejects dias outside 1..365 for CADA_N_DIAS", async () => {
    const service = makeService();

    const low = await service.validate(SCOPE, {
      content: buildCsv([
        validRow({ cadencia: "CADA_N_DIAS", dias: "0" }),
      ]),
    });
    const high = await service.validate(SCOPE, {
      content: buildCsv([
        validRow({ cadencia: "CADA_N_DIAS", dias: "400" }),
      ]),
    });

    expect(low.rows[0].errors).toContain(
      "Fila 2: Los días deben ser un entero entre 1 y 365.",
    );
    expect(high.rows[0].errors).toContain(
      "Fila 2: Los días deben ser un entero entre 1 y 365.",
    );
  });

  it("rejects a payment greater than the line total", async () => {
    const service = makeService();

    const result = await service.validate(SCOPE, {
      content: buildCsv([
        validRow({ cantidad: "1", precio_unitario: "10", monto_pagado: "11" }),
      ]),
    });

    expect(result.rows[0].errors).toContain(
      "Fila 2: El monto pagado no puede superar el total de la fila.",
    );
  });

  it("reuses an existing client by phone without creating another", async () => {
    const prisma = makePrisma();
    prisma.client.findMany.mockResolvedValue([
      { id: "client-1", name: "Ana", phone: "555-1234", email: null },
    ]);
    prisma.product.findMany.mockResolvedValue([
      {
        id: "product-1",
        sku: "ARROZ-1KG",
        name: "Arroz blanco",
        salePriceUSD: "1.50",
        costPriceUSD: "0",
        taxRate: "0",
        unit: "UND",
      },
    ]);
    const service = makeService(prisma);

    const result = await service.validate(SCOPE, {
      content: buildCsv([
        validRow({ cliente_nombre: "Ana", cliente_telefono: "555-1234" }),
      ]),
    });

    expect(result.rows[0].willCreateClient).toBe(false);
    expect(result.rows[0].warnings).toEqual([]);
    expect(prisma.client.findMany).toHaveBeenCalledTimes(1);
  });

  it("marks a product that is missing in the catalog as will-create", async () => {
    const service = makeService();

    const result = await service.validate(SCOPE, {
      content: buildCsv([validRow({ producto: "Nuevo producto" })]),
    });

    expect(result.rows[0].willCreateProduct).toBe(true);
    expect(result.rows[0].warnings).toContain(
      'Fila 2: El producto "Nuevo producto" se creó sin stock.',
    );
  });

  it("flags a sale number that already exists as already-imported", async () => {
    const prisma = makePrisma();
    prisma.sale.findMany.mockResolvedValue([{ saleNumber: "V-9" }]);
    const service = makeService(prisma);

    const result = await service.validate(SCOPE, {
      content: buildCsv([validRow({ venta: "V-9" })]),
    });

    expect(result.rows[0].status).toBe("already-imported");
    expect(result.rows[0].errors).toEqual([]);
  });

  it("flags the second identical row as duplicate-in-file", async () => {
    const service = makeService();
    const row = validRow();

    const result = await service.validate(SCOPE, {
      content: buildCsv([row, row]),
    });

    expect(result.rows[0].status).toBe("ok");
    expect(result.rows[1].status).toBe("duplicate-in-file");
  });

  it("never writes during the dry-run", async () => {
    const prisma = makePrisma();
    const clients = makeClients();
    const products = makeProducts();
    const sales = makeSales();
    const service = makeService(prisma, sales, clients, products);

    await service.validate(SCOPE, { content: buildCsv([validRow()]) });

    expect(clients.create).not.toHaveBeenCalled();
    expect(products.create).not.toHaveBeenCalled();
    expect(sales.create).not.toHaveBeenCalled();
    expect(prisma.client.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.product.findMany).toHaveBeenCalledTimes(1);
  });
});

describe("InitialLoadService.commit", () => {
  it("creates a client once for two rows that share the same name", async () => {
    const clients = makeClients();
    const service = makeService(makePrisma(), makeSales(), clients);

    const result = await service.commit(SCOPE, {
      content: buildCsv([
        validRow({ producto: "Arroz blanco" }),
        validRow({ producto: "Fideo fino" }),
      ]),
    });

    expect(clients.create).toHaveBeenCalledTimes(1);
    expect(result.created).toEqual({ sales: 2, clients: 1, products: 2 });
    expect(result.skipped).toBe(0);
  });

  it("reuses an existing product by SKU", async () => {
    const prisma = makePrisma();
    prisma.product.findMany.mockResolvedValue([
      {
        id: "product-x",
        sku: "SKU-1",
        name: "Arroz blanco",
        salePriceUSD: "9.99",
        costPriceUSD: "0",
        taxRate: "0",
        unit: "UND",
      },
    ]);
    const products = makeProducts();
    const sales = makeSales();
    const service = makeService(prisma, sales, makeClients(), products);

    const result = await service.commit(SCOPE, {
      content: buildCsv([validRow({ sku: "SKU-1" })]),
    });

    expect(products.create).not.toHaveBeenCalled();
    expect(result.created.products).toBe(0);
    expect(sales.create).toHaveBeenCalledTimes(1);
    expect(sales.create.mock.calls[0][1].items[0]).toMatchObject({
      productId: "product-x",
      productName: "Arroz blanco",
      quantity: 2,
      unitPriceUSD: 1.5,
    });
  });

  it("creates a missing product with a generated ONB SKU, zero stock and a warning", async () => {
    const prisma = makePrisma();
    prisma.product.findMany.mockResolvedValue([
      {
        id: "product-5",
        sku: "ONB-0005",
        name: "Otro",
        salePriceUSD: "0",
        costPriceUSD: "0",
        taxRate: "0",
        unit: "UND",
      },
    ]);
    const products = makeProducts();
    const service = makeService(prisma, makeSales(), makeClients(), products);

    const result = await service.commit(SCOPE, {
      content: buildCsv([validRow({ producto: "Nuevo producto" })]),
    });

    expect(products.create).toHaveBeenCalledTimes(1);
    expect(products.create.mock.calls[0][1]).toMatchObject({
      name: "Nuevo producto",
      sku: "ONB-0006",
      stock: 0,
      costPriceUSD: 0,
      salePriceUSD: 1.5,
      unit: "UND",
    });
    expect(result.created.products).toBe(1);
  });

  it("passes skipStock: true to SaleService.create", async () => {
    const sales = makeSales();
    const service = makeService(makePrisma(), sales);

    await service.commit(SCOPE, { content: buildCsv([validRow()]) });

    expect(sales.create).toHaveBeenCalledTimes(1);
    expect(sales.create.mock.calls[0][2]).toEqual({ skipStock: true });
  });

  it("records a payment only when monto_pagado is greater than zero", async () => {
    const sales = makeSales();
    const service = makeService(makePrisma(), sales);

    await service.commit(SCOPE, {
      content: buildCsv([
        validRow({ producto: "Con pago", monto_pagado: "1,00" }),
        validRow({ producto: "Sin pago", monto_pagado: "0" }),
      ]),
    });

    expect(sales.create.mock.calls[0][1].payments).toEqual([
      { amountOriginal: 1, currency: "USD", paymentMethod: "CASH_USD" },
    ]);
    expect(sales.create.mock.calls[1][1].payments).toBeUndefined();
  });

  it("uses the explicit due date when vencimiento is present", async () => {
    const sales = makeSales();
    const service = makeService(makePrisma(), sales);

    await service.commit(SCOPE, {
      content: buildCsv([validRow({ vencimiento: "2024-02-20" })]),
    });

    const payload = sales.create.mock.calls[0][1];
    expect(payload.dueDate).toBe("2024-02-20T12:00:00.000Z");
    expect(payload.creditCadence).toBeUndefined();
  });

  it("computes the due date from the cadence", async () => {
    const sales = makeSales();
    const service = makeService(makePrisma(), sales);
    const expected = computeCreditDueDate(
      "EVERY_N_DAYS",
      { everyNDays: 30 },
      new Date("2024-01-15T12:00:00.000Z"),
    )!.toISOString();

    await service.commit(SCOPE, {
      content: buildCsv([
        validRow({ fecha: "2024-01-15", cadencia: "CADA_N_DIAS", dias: "30" }),
      ]),
    });

    const payload = sales.create.mock.calls[0][1];
    expect(payload.issueDate).toBe("2024-01-15T12:00:00.000Z");
    expect(payload.dueDate).toBe(expected);
    expect(payload.creditCadence).toBe("EVERY_N_DAYS");
  });

  it("leaves the account open with creditCadence FREE when there is no due date", async () => {
    const sales = makeSales();
    const service = makeService(makePrisma(), sales);

    await service.commit(SCOPE, { content: buildCsv([validRow()]) });

    const payload = sales.create.mock.calls[0][1];
    expect(payload.dueDate).toBeUndefined();
    expect(payload.creditCadence).toBe("FREE");
  });

  it("sets the sale number from venta and from the derived ONB key", async () => {
    const prisma = makePrisma();
    const updateSpy = jest.fn();
    (prisma.sale as any).update = updateSpy;
    const sales = makeSales();
    const service = makeService(prisma, sales);

    await service.commit(SCOPE, {
      content: buildCsv([
        validRow({ venta: "V-100" }),
        validRow({ producto: "Fideo" }),
      ]),
    });

    expect(sales.create).toHaveBeenCalledTimes(2);
    expect(sales.create.mock.calls[0][1].saleNumber).toBe("V-100");
    const derived = sales.create.mock.calls[1][1].saleNumber as string;
    expect(derived.startsWith("ONB-")).toBe(true);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("creates nothing when the same file is uploaded again", async () => {
    const prisma = makePrisma();
    const first = makeService(prisma);
    const preview = await first.validate(SCOPE, {
      content: buildCsv([validRow({ venta: "V-1" })]),
    });
    const key = preview.rows[0].saleNumber;

    prisma.sale.findMany.mockResolvedValue([{ saleNumber: key }]);
    const sales = makeSales();
    const clients = makeClients();
    const products = makeProducts();
    const service = makeService(prisma, sales, clients, products);

    const result = await service.commit(SCOPE, {
      content: buildCsv([validRow({ venta: "V-1" })]),
    });

    expect(result.created).toEqual({ sales: 0, clients: 0, products: 0 });
    expect(result.skipped).toBe(1);
    expect(sales.create).not.toHaveBeenCalled();
    expect(clients.create).not.toHaveBeenCalled();
    expect(products.create).not.toHaveBeenCalled();
  });

  it("does not create a client or product for a row with errors", async () => {
    const clients = makeClients();
    const products = makeProducts();
    const sales = makeSales();
    const service = makeService(makePrisma(), sales, clients, products);

    const result = await service.commit(SCOPE, {
      content: buildCsv([validRow({ cantidad: "0" })]),
    });

    expect(result.created).toEqual({ sales: 0, clients: 0, products: 0 });
    expect(result.skipped).toBe(1);
    expect(clients.create).not.toHaveBeenCalled();
    expect(products.create).not.toHaveBeenCalled();
    expect(sales.create).not.toHaveBeenCalled();
    expect(result.errors[0].message).toBe(
      "Fila 2: La cantidad debe ser mayor que cero.",
    );
  });
});

describe("InitialLoadService.createManual", () => {
  it("creates a client when no id and no name match exists", async () => {
    const clients = makeClients();
    const service = makeService(makePrisma(), makeSales(), clients);

    const result = await service.createManual(SCOPE, manualDto() as any);

    expect(clients.create).toHaveBeenCalledTimes(1);
    expect(clients.create.mock.calls[0][1]).toMatchObject({ name: "Ana Pérez" });
    expect(result.client).toEqual({
      id: "client-new",
      name: "Ana Pérez",
      created: true,
    });
  });

  it("reuses an existing client when the normalized name matches", async () => {
    const prisma = makePrisma();
    prisma.client.findMany.mockResolvedValue([clientRecord()]);
    const clients = makeClients();
    const service = makeService(prisma, makeSales(), clients);

    const result = await service.createManual(SCOPE, manualDto({
      clientName: "ANA PEREZ",
    }) as any);

    expect(clients.create).not.toHaveBeenCalled();
    expect(result.client).toEqual({
      id: "client-1",
      name: "Ana Pérez",
      created: false,
    });
  });

  it("reuses a product by id", async () => {
    const prisma = makePrisma();
    prisma.product.findMany.mockResolvedValue([productRecord()]);
    const products = makeProducts();
    const sales = makeSales();
    const service = makeService(prisma, sales, makeClients(), products);

    const result = await service.createManual(SCOPE, manualDto({
      productId: "product-1",
    }) as any);

    expect(products.create).not.toHaveBeenCalled();
    expect(result.product).toEqual({
      id: "product-1",
      name: "Arroz blanco",
      sku: "ARROZ-1KG",
      created: false,
    });
    expect(sales.create.mock.calls[0][1].items[0].productId).toBe("product-1");
  });

  it("reuses a product by sku", async () => {
    const prisma = makePrisma();
    prisma.product.findMany.mockResolvedValue([productRecord()]);
    const products = makeProducts();
    const sales = makeSales();
    const service = makeService(prisma, sales, makeClients(), products);

    await service.createManual(SCOPE, manualDto({
      productSku: "ARROZ-1KG",
    }) as any);

    expect(products.create).not.toHaveBeenCalled();
    expect(sales.create.mock.calls[0][1].items[0].productId).toBe("product-1");
  });

  it("creates a missing product with an ONB sku and zero stock", async () => {
    const products = makeProducts();
    const service = makeService(makePrisma(), makeSales(), makeClients(), products);

    const result = await service.createManual(SCOPE, manualDto() as any);

    expect(products.create).toHaveBeenCalledTimes(1);
    expect(products.create.mock.calls[0][1]).toMatchObject({
      name: "Arroz blanco",
      sku: "ONB-0001",
      stock: 0,
      salePriceUSD: 1.5,
    });
    expect(result.product).toEqual({
      id: "product-new",
      name: "Arroz blanco",
      sku: "ONB-0001",
      created: true,
    });
  });

  it("honours an explicit dueDate", async () => {
    const sales = makeSales();
    const service = makeService(makePrisma(), sales);

    await service.createManual(SCOPE, manualDto({
      dueDate: "2024-02-20",
    }) as any);

    const payload = sales.create.mock.calls[0][1];
    expect(payload.dueDate).toBe("2024-02-20T12:00:00.000Z");
    expect(payload.creditCadence).toBeUndefined();
  });

  it("computes the due date from the cadence and the issue date", async () => {
    const sales = makeSales();
    const service = makeService(makePrisma(), sales);
    const expected = computeCreditDueDate(
      "EVERY_N_DAYS",
      { everyNDays: 30 },
      new Date("2024-01-15T12:00:00.000Z"),
    )!.toISOString();

    await service.createManual(SCOPE, manualDto({
      issueDate: "2024-01-15",
      cadence: "CADA_N_DIAS",
      everyNDays: 30,
    }) as any);

    const payload = sales.create.mock.calls[0][1];
    expect(payload.issueDate).toBe("2024-01-15T12:00:00.000Z");
    expect(payload.dueDate).toBe(expected);
    expect(payload.creditCadence).toBe("EVERY_N_DAYS");
  });

  it("leaves the account open with FREE when there is no due date", async () => {
    const sales = makeSales();
    const service = makeService(makePrisma(), sales);

    await service.createManual(SCOPE, manualDto() as any);

    const payload = sales.create.mock.calls[0][1];
    expect(payload.dueDate).toBeUndefined();
    expect(payload.creditCadence).toBe("FREE");
  });

  it("records a payment only when paidAmount is greater than zero", async () => {
    const sales = makeSales();
    const service = makeService(makePrisma(), sales);

    await service.createManual(SCOPE, manualDto({ productName: "Con pago", paidAmount: 1 }) as any);
    await service.createManual(SCOPE, manualDto({ productName: "Sin pago", paidAmount: 0 }) as any);

    expect(sales.create.mock.calls[0][1].payments).toEqual([
      { amountOriginal: 1, currency: "USD", paymentMethod: "CASH_USD" },
    ]);
    expect(sales.create.mock.calls[1][1].payments).toBeUndefined();
  });

  it("passes skipStock: true to SaleService.create", async () => {
    const sales = makeSales();
    const service = makeService(makePrisma(), sales);

    await service.createManual(SCOPE, manualDto() as any);

    expect(sales.create).toHaveBeenCalledTimes(1);
    expect(sales.create.mock.calls[0][2]).toEqual({ skipStock: true });
  });

  it("rejects a paidAmount greater than the line total and writes nothing", async () => {
    const clients = makeClients();
    const products = makeProducts();
    const sales = makeSales();
    const service = makeService(makePrisma(), sales, clients, products);

    await expect(
      service.createManual(SCOPE, manualDto({
        quantity: 1,
        unitPriceUSD: 10,
        paidAmount: 11,
      }) as any),
    ).rejects.toThrow("El monto pagado no puede superar el total.");

    expect(clients.create).not.toHaveBeenCalled();
    expect(products.create).not.toHaveBeenCalled();
    expect(sales.create).not.toHaveBeenCalled();
  });

  it("rejects a future issueDate and writes nothing", async () => {
    const clients = makeClients();
    const products = makeProducts();
    const sales = makeSales();
    const service = makeService(makePrisma(), sales, clients, products);

    await expect(
      service.createManual(SCOPE, manualDto({ issueDate: "2999-01-01" }) as any),
    ).rejects.toThrow("La fecha no puede ser futura.");

    expect(clients.create).not.toHaveBeenCalled();
    expect(products.create).not.toHaveBeenCalled();
    expect(sales.create).not.toHaveBeenCalled();
  });

  it("rejects an unknown cadence and writes nothing", async () => {
    const clients = makeClients();
    const products = makeProducts();
    const sales = makeSales();
    const service = makeService(makePrisma(), sales, clients, products);

    await expect(
      service.createManual(SCOPE, manualDto({ cadence: "SEMANAL" }) as any),
    ).rejects.toThrow("La cadencia debe ser QUINCENAL, MENSUAL o CADA_N_DIAS.");

    expect(clients.create).not.toHaveBeenCalled();
    expect(products.create).not.toHaveBeenCalled();
    expect(sales.create).not.toHaveBeenCalled();
  });

  it("rejects everyNDays outside 1..365 and writes nothing", async () => {
    const clients = makeClients();
    const products = makeProducts();
    const sales = makeSales();
    const service = makeService(makePrisma(), sales, clients, products);

    await expect(
      service.createManual(SCOPE, manualDto({
        cadence: "CADA_N_DIAS",
        everyNDays: 0,
      }) as any),
    ).rejects.toThrow("Los días deben ser un entero entre 1 y 365.");
    await expect(
      service.createManual(SCOPE, manualDto({
        cadence: "CADA_N_DIAS",
        everyNDays: 400,
      }) as any),
    ).rejects.toThrow("Los días deben ser un entero entre 1 y 365.");

    expect(clients.create).not.toHaveBeenCalled();
    expect(products.create).not.toHaveBeenCalled();
    expect(sales.create).not.toHaveBeenCalled();
  });
});
