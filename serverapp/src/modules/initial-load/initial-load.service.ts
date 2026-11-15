import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import type { CreditCadence } from "src/shared/constants/tenant-settings";
import { ClientService } from "../client/client.service";
import { ProductService } from "../product/product.service";
import { SaleService } from "../sale/sale.service";
import type { CreateSaleDto } from "../sale/dto/sale.dto";
import { computeCreditDueDate } from "../sale/util/credit-due-date";
import {
  INITIAL_LOAD_COLUMNS,
  INITIAL_LOAD_REQUIRED,
  type ImportInitialLoadDto,
  type InitialLoadCommitResult,
  type InitialLoadFieldError,
  type InitialLoadPreviewRow,
  type InitialLoadRowStatus,
  type InitialLoadValidateResult,
} from "./initial-load.dto";
import {
  isFutureDate,
  normalizeHeader,
  normalizeName,
  normalizeNumber,
  parseCsv,
  parseFlexibleDate,
  stableRowHash,
  toDateOnly,
  type ParsedDate,
} from "./initial-load.parser";

/** Limits shared with the product import (S1). */
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_DATA_ROWS = 500;

const TEMPLATE_HEADER = INITIAL_LOAD_COLUMNS.join(",");

/**
 * Two importable examples. Dates are in the past, `vencimiento` wins over any
 * cadence and the second row exercises `CADA_N_DIAS` plus a payment.
 */
const TEMPLATE_EXAMPLES = [
  "V-001,2024-01-15,Ana Pérez,584241000001,ana@example.com,Arroz blanco 1 kg,,2,1.80,2024-02-15,,,,Retira en tienda",
  ",2024-01-20,Juan Gómez,584241000002,,Café molido 500 g,CAFE-500,1,5.20,,CADA_N_DIAS,30,2.00,Cliente mayorista",
];

const CASH_PAYMENT_METHOD = "CASH_USD";
const DEFAULT_EVERY_N_DAYS = 15;
const ONB_PREFIX = "ONB-";

/** Neutral, readable fallback when a create failure carries no message. */
const GENERIC_CREATE_ERROR = "no se pudo crear la venta.";

/** Scope of an initial load: an organization is mandatory (never personal). */
export interface InitialLoadScope {
  organizationId: string;
  createdById?: string | null;
}

interface ClientRecord {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
}

interface ProductRecord {
  id: string;
  sku: string;
  name: string;
  salePriceUSD: unknown;
  costPriceUSD: unknown;
  taxRate: unknown;
  unit: string;
}

interface ClientLookup {
  byPhone: Map<string, ClientRecord[]>;
  byEmail: Map<string, ClientRecord[]>;
  byName: Map<string, ClientRecord[]>;
}

interface ProductLookup {
  bySku: Map<string, ProductRecord>;
  byName: Map<string, ProductRecord[]>;
  /** Next number for the generated `ONB-####` SKU. */
  onbCounter: number;
}

interface Lookups {
  clients: ClientLookup;
  products: ProductLookup;
  existingSaleNumbers: Set<string>;
}

/** One parsed and validated row, shared by the dry-run and the commit. */
interface PreparedRow {
  line: number;
  venta: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  paid: number;
  notes: string;
  key: string;
  issueDateIso: string | null;
  dueDateIso: string | null;
  dueDateOnly: string | null;
  creditCadence: CreditCadence | null;
  everyNDays: number | null;
  errors: string[];
  warnings: string[];
}

interface PreparedFile {
  rows: PreparedRow[];
  errors: InitialLoadFieldError[];
}

interface CreatedClient {
  id: string;
  created: boolean;
}

interface CreatedProduct {
  product: ProductRecord;
  created: boolean;
}

@Injectable()
export class InitialLoadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly saleService: SaleService,
    private readonly clientService: ClientService,
    private readonly productService: ProductService,
  ) {}

  /** CSV text with a UTF-8 BOM so Excel renders accents correctly. */
  template(): string {
    return `\uFEFF${[TEMPLATE_HEADER, ...TEMPLATE_EXAMPLES].join("\r\n")}\r\n`;
  }

  /**
   * Pure dry-run: parses, validates and resolves against the current catalog
   * and clients. It never creates a client, product or sale.
   */
  async validate(
    scope: InitialLoadScope,
    dto: ImportInitialLoadDto,
  ): Promise<InitialLoadValidateResult> {
    const { rows, errors } = this.prepare(dto);
    const keys = rows
      .filter((row) => row.errors.length === 0)
      .map((row) => row.key);
    const lookups = await this.loadLookups(scope, keys);

    const seen = new Set<string>();
    const preview: InitialLoadPreviewRow[] = rows.map((row) => {
      let status: InitialLoadRowStatus;
      if (row.errors.length > 0) {
        status = "error";
      } else if (lookups.existingSaleNumbers.has(row.key)) {
        status = "already-imported";
      } else if (seen.has(row.key)) {
        status = "duplicate-in-file";
      } else {
        status = "ok";
        seen.add(row.key);
      }

      const warnings = [...row.warnings];
      let willCreateClient = false;
      let willCreateProduct = false;

      if (status === "ok") {
        willCreateClient = this.resolveClient(
          lookups.clients,
          row,
          row.line,
          warnings,
        ).willCreate;

        willCreateProduct = this.resolveProduct(
          lookups.products,
          row,
        ).willCreate;
        if (willCreateProduct) {
          warnings.push(this.productCreatedWarning(row));
        }
      }

      return {
        line: row.line,
        saleNumber: row.key,
        clientName: row.clientName,
        productName: row.productName,
        quantity: row.quantity,
        unitPriceUSD: row.unitPrice,
        totalUSD: round2(row.quantity * row.unitPrice),
        dueDate: row.dueDateOnly,
        cadence: row.creditCadence,
        status,
        willCreateClient,
        willCreateProduct,
        errors: row.errors,
        warnings,
      };
    });

    return {
      ok: errors.length === 0,
      totalRows: rows.length,
      errors,
      rows: preview,
    };
  }

  /**
   * Creates the sale (and the missing client/product) for every importable
   * row. Already-imported sale numbers and rows seen earlier in the same file
   * are skipped, so re-uploading a file creates zero new records.
   */
  async commit(
    scope: InitialLoadScope,
    dto: ImportInitialLoadDto,
  ): Promise<InitialLoadCommitResult> {
    const { rows, errors } = this.prepare(dto);
    const keys = rows
      .filter((row) => row.errors.length === 0)
      .map((row) => row.key);
    const lookups = await this.loadLookups(scope, keys);

    const created = { sales: 0, clients: 0, products: 0 };
    let skipped = 0;
    const seen = new Set<string>();

    for (const row of rows) {
      if (row.errors.length > 0) {
        skipped += 1;
        continue;
      }
      if (lookups.existingSaleNumbers.has(row.key)) {
        skipped += 1;
        continue;
      }
      if (seen.has(row.key)) {
        skipped += 1;
        continue;
      }
      // Reserve the key before writing so a repeated line is never retried.
      seen.add(row.key);

      try {
        const client = await this.createOrReuseClient(
          scope,
          lookups.clients,
          row,
        );
        if (client.created) created.clients += 1;

        const product = await this.createOrReuseProduct(
          scope,
          lookups.products,
          row,
        );
        if (product.created) created.products += 1;

        await this.saleService.create(
          scope,
          this.buildSaleDto(row, client.id, product.product),
          { skipStock: true },
        );

        created.sales += 1;
      } catch (error) {
        skipped += 1;
        errors.push({
          line: row.line,
          field: "row",
          message: `Fila ${row.line}: ${createErrorMessage(error)}`,
        });
      }
    }

    return { created, skipped, errors };
  }

  // ------------------------------------------------------------------
  // Parsing
  // ------------------------------------------------------------------

  private prepare(dto: ImportInitialLoadDto): PreparedFile {
    const content = typeof dto?.content === "string" ? dto.content : "";

    if (content.trim() === "") {
      throw new BadRequestException("No se recibió contenido para importar.");
    }
    if (Buffer.byteLength(content, "utf8") > MAX_FILE_BYTES) {
      throw new BadRequestException("El archivo supera el límite de 2 MB.");
    }

    const text = content.startsWith("\uFEFF") ? content.slice(1) : content;
    const parsed = parseCsv(text);
    if (parsed.rows.length === 0) {
      throw new BadRequestException("No se recibió contenido para importar.");
    }
    if (parsed.rows.length > MAX_DATA_ROWS) {
      throw new BadRequestException("El archivo supera el límite de 500 filas.");
    }

    const columnIndex = new Map<string, number>();
    parsed.header.forEach((raw, index) => {
      const key = normalizeHeader(raw);
      if (key !== "" && !columnIndex.has(key)) columnIndex.set(key, index);
    });

    const missing = INITIAL_LOAD_REQUIRED.filter(
      (column) => !columnIndex.has(column),
    );
    if (missing.length > 0) {
      throw new BadRequestException(
        `Faltan columnas obligatorias: ${missing.join(", ")}.`,
      );
    }

    const cellOf = (cells: string[], column: string): string => {
      const index = columnIndex.get(column);
      return index === undefined ? "" : (cells[index] ?? "");
    };

    const errors: InitialLoadFieldError[] = [];
    const rows = parsed.rows.map((row) =>
      this.parseRow(
        (column) => cellOf(row.cells, column),
        row.line,
        errors,
      ),
    );

    return { rows, errors };
  }

  /** The single source of truth for the per-row rules, shared by both paths. */
  private parseRow(
    cellOf: (column: string) => string,
    line: number,
    fieldErrors: InitialLoadFieldError[],
  ): PreparedRow {
    const errors: string[] = [];
    const warnings: string[] = [];
    const pushError = (field: string, text: string) => {
      const message = `Fila ${line}: ${text}`;
      errors.push(message);
      fieldErrors.push({ line, field, message });
    };

    const venta = cellOf("venta").trim();
    const clientName = cellOf("cliente_nombre").trim();
    const clientPhone = cellOf("cliente_telefono").trim();
    const clientEmail = cellOf("cliente_email").trim();
    const productName = cellOf("producto").trim();
    const sku = cellOf("sku").trim();
    const notes = cellOf("notas").trim();

    const fechaRaw = cellOf("fecha").trim();
    let issueDate: ParsedDate | null = null;
    if (fechaRaw === "") {
      pushError("fecha", "La fecha es obligatoria.");
    } else {
      issueDate = parseFlexibleDate(fechaRaw);
      if (!issueDate) {
        pushError(
          "fecha",
          `La fecha no es válida: "${fechaRaw}" (use AAAA-MM-DD o DD/MM/AAAA).`,
        );
      } else if (isFutureDate(issueDate.dateOnly)) {
        pushError("fecha", "La fecha no puede ser futura.");
      }
    }

    if (clientName === "") {
      pushError("cliente_nombre", "El nombre del cliente es obligatorio.");
    }
    if (productName === "") {
      pushError("producto", "El nombre del producto es obligatorio.");
    }

    const quantity = this.readPositiveNumber(
      cellOf("cantidad"),
      "cantidad",
      "La cantidad",
      line,
      pushError,
      warnings,
    );
    const unitPrice = this.readPositiveNumber(
      cellOf("precio_unitario"),
      "precio_unitario",
      "El precio unitario",
      line,
      pushError,
      warnings,
    );
    const total = round2(quantity * unitPrice);

    const paidResult = normalizeNumber(cellOf("monto_pagado"));
    let paid = 0;
    if (!paidResult.ok) {
      pushError("monto_pagado", "El monto pagado debe ser numérico.");
    } else {
      paid = paidResult.value ?? 0;
      if (paid < 0) {
        pushError("monto_pagado", "El monto pagado no puede ser negativo.");
      } else if (paid > total + 1e-6) {
        pushError(
          "monto_pagado",
          "El monto pagado no puede superar el total de la fila.",
        );
      }
    }

    const vencimientoRaw = cellOf("vencimiento").trim();
    const cadenciaRaw = cellOf("cadencia").trim();
    let dueDateIso: string | null = null;
    let dueDateOnly: string | null = null;
    let creditCadence: CreditCadence | null = null;
    let everyNDays: number | null = null;

    if (vencimientoRaw !== "") {
      // An explicit due date wins over any cadence.
      const due = parseFlexibleDate(vencimientoRaw);
      if (!due) {
        pushError(
          "vencimiento",
          `El vencimiento no es válido: "${vencimientoRaw}" (use AAAA-MM-DD o DD/MM/AAAA).`,
        );
      } else {
        dueDateIso = due.iso;
        dueDateOnly = due.dateOnly;
      }
    } else if (cadenciaRaw !== "") {
      const cadence = parseCadence(cadenciaRaw);
      if (!cadence) {
        pushError(
          "cadencia",
          "La cadencia debe ser QUINCENAL, MENSUAL o CADA_N_DIAS.",
        );
      } else {
        creditCadence = cadence;
        if (cadence === "EVERY_N_DAYS") {
          const every = parseEveryNDays(cellOf("dias"));
          if (!every.ok) {
            pushError("dias", "Los días deben ser un entero entre 1 y 365.");
          } else {
            everyNDays = every.value;
            if (issueDate) {
              const due = computeCreditDueDate(
                "EVERY_N_DAYS",
                { everyNDays: every.value },
                new Date(issueDate.iso),
              );
              if (due) {
                dueDateIso = due.toISOString();
                dueDateOnly = toDateOnly(due);
              }
            }
          }
        } else if (issueDate) {
          const due = computeCreditDueDate(
            cadence,
            {},
            new Date(issueDate.iso),
          );
          if (due) {
            dueDateIso = due.toISOString();
            dueDateOnly = toDateOnly(due);
          }
        }
      }
    } else {
      // No limit: the account stays open and is never reported as overdue.
      creditCadence = "FREE";
    }

    const key =
      venta !== ""
        ? venta
        : stableRowHash({
            dateOnly: issueDate?.dateOnly ?? fechaRaw,
            clientName,
            productName,
            quantity,
            unitPrice,
          });

    return {
      line,
      venta,
      clientName,
      clientPhone,
      clientEmail,
      productName,
      sku,
      quantity,
      unitPrice,
      paid,
      notes,
      key,
      issueDateIso: issueDate?.iso ?? null,
      dueDateIso,
      dueDateOnly,
      creditCadence,
      everyNDays,
      errors,
      warnings,
    };
  }

  private readPositiveNumber(
    raw: string,
    field: string,
    label: string,
    line: number,
    pushError: (field: string, text: string) => void,
    warnings: string[],
  ): number {
    const result = normalizeNumber(raw);
    if (!result.ok) {
      pushError(field, `${label} debe ser numérico.`);
      return 0;
    }
    if (result.value === null) {
      pushError(field, `${label} es obligatorio.`);
      return 0;
    }
    if (result.ambiguous) {
      warnings.push(
        `Fila ${line}: el número ${raw.trim()} es ambiguo; se interpretó como ${result.value} sin decimales.`,
      );
    }
    if (result.value <= 0) {
      pushError(field, `${label} debe ser mayor que cero.`);
    }
    return result.value;
  }

  // ------------------------------------------------------------------
  // Lookups
  // ------------------------------------------------------------------

  /** One read per collection for the whole file: never one query per row. */
  private async loadLookups(
    scope: InitialLoadScope,
    keys: string[],
  ): Promise<Lookups> {
    const uniqueKeys = [...new Set(keys)];

    const [clients, products, sales] = await Promise.all([
      this.prisma.client.findMany({
        where: { organizationId: scope.organizationId, deletedAt: null },
        select: { id: true, name: true, phone: true, email: true },
      }),
      this.prisma.product.findMany({
        where: { organizationId: scope.organizationId, deletedAt: null },
        select: {
          id: true,
          sku: true,
          name: true,
          salePriceUSD: true,
          costPriceUSD: true,
          taxRate: true,
          unit: true,
        },
      }),
      uniqueKeys.length > 0
        ? this.prisma.sale.findMany({
            where: {
              organizationId: scope.organizationId,
              deletedAt: null,
              saleNumber: { in: uniqueKeys },
            },
            select: { saleNumber: true },
          })
        : Promise.resolve([] as { saleNumber: string }[]),
    ]);

    return {
      clients: buildClientLookup(clients),
      products: buildProductLookup(products),
      existingSaleNumbers: new Set(
        sales.map((sale) => sale.saleNumber),
      ),
    };
  }

  private resolveClient(
    lookup: ClientLookup,
    row: PreparedRow,
    line: number,
    warnings: string[],
  ): { id: string | null; willCreate: boolean } {
    const pick = (
      list: ClientRecord[] | undefined,
      label: string,
    ): ClientRecord | null => {
      if (!list || list.length === 0) return null;
      if (list.length > 1) {
        warnings.push(
          `Fila ${line}: hay varios clientes que coinciden con "${label}"; se usó el primero.`,
        );
      }
      return list[0];
    };

    if (row.clientPhone !== "") {
      const match = pick(lookup.byPhone.get(row.clientPhone), row.clientName);
      if (match) return { id: match.id, willCreate: false };
    }
    if (row.clientEmail !== "") {
      const match = pick(
        lookup.byEmail.get(row.clientEmail.toLowerCase()),
        row.clientName,
      );
      if (match) return { id: match.id, willCreate: false };
    }

    const byName = pick(
      lookup.byName.get(normalizeName(row.clientName)),
      row.clientName,
    );
    if (byName) return { id: byName.id, willCreate: false };

    return { id: null, willCreate: true };
  }

  private resolveProduct(
    lookup: ProductLookup,
    row: PreparedRow,
  ): { product: ProductRecord | null; willCreate: boolean } {
    if (row.sku !== "") {
      const bySku = lookup.bySku.get(row.sku);
      if (bySku) return { product: bySku, willCreate: false };
      return { product: null, willCreate: true };
    }

    const byName = lookup.byName.get(normalizeName(row.productName));
    if (byName && byName.length > 0) {
      return { product: byName[0], willCreate: false };
    }
    return { product: null, willCreate: true };
  }

  // ------------------------------------------------------------------
  // Writes
  // ------------------------------------------------------------------

  private async createOrReuseClient(
    scope: InitialLoadScope,
    lookup: ClientLookup,
    row: PreparedRow,
  ): Promise<CreatedClient> {
    const resolved = this.resolveClient(lookup, row, row.line, []);
    if (!resolved.willCreate && resolved.id) {
      return { id: resolved.id, created: false };
    }

    const client = await this.clientService.create(scope, {
      name: row.clientName,
      ...(row.clientPhone !== "" ? { phone: row.clientPhone } : {}),
      ...(row.clientEmail !== "" ? { email: row.clientEmail } : {}),
    });

    const record: ClientRecord = {
      id: client.id,
      name: row.clientName,
      phone: row.clientPhone || null,
      email: row.clientEmail || null,
    };
    addClient(lookup, record);

    return { id: client.id, created: true };
  }

  private async createOrReuseProduct(
    scope: InitialLoadScope,
    lookup: ProductLookup,
    row: PreparedRow,
  ): Promise<CreatedProduct> {
    const resolved = this.resolveProduct(lookup, row);
    if (!resolved.willCreate && resolved.product) {
      return { product: resolved.product, created: false };
    }

    const sku = row.sku !== "" ? row.sku : this.nextOnbSku(lookup);
    const created = await this.productService.create(scope, {
      sku,
      name: row.productName,
      costPriceUSD: 0,
      salePriceUSD: row.unitPrice,
      stock: 0,
      unit: "UND",
    });

    const record: ProductRecord = {
      id: created.id,
      sku,
      name: row.productName,
      salePriceUSD: row.unitPrice,
      costPriceUSD: 0,
      taxRate: (created as { taxRate?: unknown }).taxRate ?? 0,
      unit: "UND",
    };
    addProduct(lookup, record);

    return { product: record, created: true };
  }

  /** Continues the tenant's `ONB-####` sequence, never reusing a live SKU. */
  private nextOnbSku(lookup: ProductLookup): string {
    let candidate: string;
    do {
      candidate = `${ONB_PREFIX}${String(lookup.onbCounter).padStart(4, "0")}`;
      lookup.onbCounter += 1;
    } while (lookup.bySku.has(candidate));
    return candidate;
  }

  private buildSaleDto(
    row: PreparedRow,
    clientId: string,
    product: ProductRecord,
  ): CreateSaleDto {
    const taxRate = Number(product.taxRate ?? 0);
    const payments =
      row.paid > 0
        ? [
            {
              amountOriginal: round2(row.paid),
              currency: "USD" as const,
              paymentMethod: CASH_PAYMENT_METHOD,
            },
          ]
        : undefined;

    return {
      saleNumber: row.key,
      clientId,
      ...(row.issueDateIso ? { issueDate: row.issueDateIso } : {}),
      ...(row.dueDateIso ? { dueDate: row.dueDateIso } : {}),
      ...(row.creditCadence ? { creditCadence: row.creditCadence } : {}),
      ...(row.creditCadence === "EVERY_N_DAYS" ||
      row.creditCadence === "QUINCENAL"
        ? { creditEveryNDays: row.everyNDays ?? DEFAULT_EVERY_N_DAYS }
        : {}),
      items: [
        {
          productId: product.id,
          productName: row.productName,
          quantity: row.quantity,
          unitPriceUSD: row.unitPrice,
          taxRate,
        },
      ],
      ...(payments ? { payments } : {}),
      ...(row.notes !== "" ? { notes: row.notes } : {}),
    } as CreateSaleDto;
  }

  private productCreatedWarning(row: PreparedRow): string {
    return `Fila ${row.line}: El producto "${row.productName}" se creó sin stock.`;
  }
}

function buildClientLookup(records: ClientRecord[]): ClientLookup {
  const byPhone = new Map<string, ClientRecord[]>();
  const byEmail = new Map<string, ClientRecord[]>();
  const byName = new Map<string, ClientRecord[]>();

  for (const record of records) {
    addToMap(byPhone, record.phone?.trim() ?? "", record);
    addToMap(byEmail, record.email?.trim().toLowerCase() ?? "", record);
    addToMap(byName, normalizeName(record.name), record);
  }

  return { byPhone, byEmail, byName };
}

function buildProductLookup(records: ProductRecord[]): ProductLookup {
  const bySku = new Map<string, ProductRecord>();
  const byName = new Map<string, ProductRecord[]>();
  let onbMax = 0;

  for (const record of records) {
    if (record.sku) bySku.set(record.sku, record);
    addToMap(byName, normalizeName(record.name), record);

    const match = /^ONB-(\d+)$/i.exec(record.sku ?? "");
    if (match) onbMax = Math.max(onbMax, Number(match[1]));
  }

  return { bySku, byName, onbCounter: onbMax + 1 };
}

function addToMap<T>(map: Map<string, T[]>, key: string, value: T): void {
  if (key === "") return;
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

function addClient(lookup: ClientLookup, record: ClientRecord): void {
  addToMap(lookup.byPhone, record.phone?.trim() ?? "", record);
  addToMap(lookup.byEmail, record.email?.trim().toLowerCase() ?? "", record);
  addToMap(lookup.byName, normalizeName(record.name), record);
}

function addProduct(lookup: ProductLookup, record: ProductRecord): void {
  lookup.bySku.set(record.sku, record);
  addToMap(lookup.byName, normalizeName(record.name), record);
}

/** Maps the CSV cadence to the sale's `CreditCadence` enum. */
function parseCadence(raw: string): CreditCadence | null {
  const normalized = normalizeHeader(raw).replace(/[\s-]+/g, "_");
  if (normalized === "quincenal") return "QUINCENAL";
  if (normalized === "mensual") return "MONTHLY";
  if (normalized === "cada_n_dias") return "EVERY_N_DAYS";
  return null;
}

function parseEveryNDays(
  raw: string,
): { ok: true; value: number } | { ok: false } {
  const value = (raw ?? "").trim();
  if (value === "") return { ok: true, value: DEFAULT_EVERY_N_DAYS };
  if (!/^\d+$/.test(value)) return { ok: false };
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 365) {
    return { ok: false };
  }
  return { ok: true, value: parsed };
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function createErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  const message = (error as { message?: unknown } | null)?.message;
  if (typeof message === "string" && message) return message;
  return GENERIC_CREATE_ERROR;
}
