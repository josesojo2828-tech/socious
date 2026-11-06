import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import { ExchangeService } from "../../exchange/exchange.service";
import {
  currencyForPaymentMethod,
  isBusinessPaymentMethod,
  type CurrencyCode,
} from "src/shared/constants/payment-methods";
import {
  detectDelimiter,
  normalizeHeader,
  normalizeNumber,
  parseCsv,
} from "../../product/import/product-import.parser";
import { SaleService, type SaleScope } from "../sale.service";
import type { CreateSaleDto } from "../dto/sale.dto";
import {
  SALE_IMPORT_COLUMNS,
  SALE_IMPORT_EXAMPLE,
  SALE_IMPORT_REQUIRED,
  type ImportSalesDto,
  type SaleCommitResult,
  type SaleImportFieldError,
  type SaleImportPreview,
  type SaleValidateResult,
} from "./sale-import.dto";

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_ROWS = 1000;

interface ImportLine {
  line: number;
  fecha: string;
  quantity: number;
  unitPriceUSD: number;
  taxRate: number;
  productId: string;
  productName: string;
  paymentMethod: string;
  currency: CurrencyCode;
  paid: number;
  errors: string[];
  warnings: string[];
}

interface ImportSale {
  venta: string;
  line: number;
  customer: string;
  customerEmail: string | null;
  customerPhone: string | null;
  issueDate: string;
  notes: string;
  lines: ImportLine[];
  errors: string[];
  warnings: string[];
  paidUSD: number;
  totalUSD: number;
}

@Injectable()
export class SaleImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly saleService: SaleService,
    private readonly exchange: ExchangeService,
  ) {}

  /** CSV text with a UTF-8 BOM so Excel renders accents correctly. */
  template(): string {
    return `\uFEFF${SALE_IMPORT_COLUMNS.join(",")}\r\n${SALE_IMPORT_EXAMPLE}\r\n`;
  }

  /** Dry run: parses, resolves products/clients and groups the lines. */
  async validate(
    scope: SaleScope,
    dto: ImportSalesDto,
  ): Promise<SaleValidateResult> {
    const { sales, errors } = await this.prepare(scope, dto);
    const previews: SaleImportPreview[] = sales.map((sale) => {
      const method = sale.lines[0]?.paymentMethod ?? null;
      return {
        venta: sale.venta,
        line: sale.line,
        customer: sale.customer,
        lines: sale.lines.length,
        totalUSD: round2(sale.totalUSD),
        paidUSD: round2(sale.paidUSD),
        paymentMethod: method,
        currency: sale.lines[0]?.currency ?? null,
        valid: sale.errors.length === 0,
        errors: sale.errors,
        warnings: sale.warnings,
      };
    });

    return {
      sales: previews,
      errors,
      summary: {
        sales: previews.length,
        lines: previews.reduce((sum, sale) => sum + sale.lines, 0),
        valid: previews.filter((sale) => sale.valid).length,
        invalid: previews.filter((sale) => !sale.valid).length,
      },
    };
  }

  /** Creates the valid sales. Financial only: stock is never touched. */
  async commit(
    scope: SaleScope,
    dto: ImportSalesDto,
  ): Promise<SaleCommitResult> {
    const { sales, errors } = await this.prepare(scope, dto);
    let created = 0;
    let skipped = 0;

    for (const sale of sales) {
      if (sale.errors.length > 0) {
        skipped += 1;
        for (const message of sale.errors) {
          errors.push({ line: sale.line, field: "venta", message });
        }
        continue;
      }

      try {
        const clientId = await this.resolveClient(scope, sale);
        const rates = await this.exchange.resolveRatesAt(
          scope.organizationId,
          new Date(sale.issueDate),
        );

        // One payment per method+currency keeps the collection history clean.
        const payments = new Map<
          string,
          { amountOriginal: number; currency: CurrencyCode; paymentMethod: string }
        >();
        for (const line of sale.lines) {
          if (line.paid <= 0) continue;
          const key = `${line.paymentMethod}:${line.currency}`;
          const current = payments.get(key);
          payments.set(key, {
            amountOriginal: round2((current?.amountOriginal ?? 0) + line.paid),
            currency: line.currency,
            paymentMethod: line.paymentMethod,
          });
        }

        const payload: CreateSaleDto = {
          ...(clientId ? { clientId } : {}),
          issueDate: sale.issueDate,
          rateBcv: rates.rateBcv,
          rateUsdt: rates.rateUsdt,
          notes: [sale.notes, `Importado ${sale.venta}`].filter(Boolean).join(" · "),
          items: sale.lines.map((line) => ({
            productId: line.productId,
            productName: line.productName,
            quantity: line.quantity,
            unitPriceUSD: line.unitPriceUSD,
            taxRate: line.taxRate,
          })),
          payments: [...payments.values()].map((payment) => ({
            ...payment,
            paidAt: sale.issueDate,
          })),
        } as CreateSaleDto;

        await this.saleService.create(scope, payload, { skipStock: true });
        created += 1;
      } catch (error) {
        skipped += 1;
        const message =
          error instanceof Error ? error.message : "no se pudo crear la venta.";
        errors.push({ line: sale.line, field: "venta", message });
      }
    }

    return { created, skipped, errors };
  }

  // ------------------------------------------------------------------
  // Parsing and grouping
  // ------------------------------------------------------------------

  private async prepare(
    scope: SaleScope,
    dto: ImportSalesDto,
  ): Promise<{ sales: ImportSale[]; errors: SaleImportFieldError[] }> {
    if (!dto.content?.trim()) {
      throw new BadRequestException("No se recibió contenido para importar.");
    }
    if (Buffer.byteLength(dto.content, "utf8") > MAX_FILE_BYTES) {
      throw new BadRequestException("El archivo supera el límite de 2 MB.");
    }

    const text = dto.content.replace(/^\uFEFF/, "");
    const parsed = parseCsv(text);
    if (parsed.rows.length === 0) {
      throw new BadRequestException("No se recibió contenido para importar.");
    }
    if (parsed.rows.length > MAX_ROWS) {
      throw new BadRequestException(
        `El archivo supera el límite de ${MAX_ROWS} filas.`,
      );
    }

    const headerLine = text.split(/\r?\n/)[0] ?? "";
    detectDelimiter(headerLine); // validates the delimiter detection path

    const keys = parsed.header.map(normalizeHeader);
    const missing = SALE_IMPORT_REQUIRED.filter((column) => !keys.includes(column));
    if (missing.length > 0) {
      throw new BadRequestException(
        `Faltan columnas obligatorias: ${missing.join(", ")}.`,
      );
    }

    const rows = parsed.rows.map((row) =>
      Object.fromEntries(
        keys.map((key, index) => [key, row.cells[index] ?? ""]),
      ) as Record<string, string>,
    );

    const skus = [
      ...new Set(
        rows.map((row) => (row.sku ?? "").trim()).filter((sku) => sku !== ""),
      ),
    ];
    const products = await this.prisma.product.findMany({
      where: {
        organizationId: scope.organizationId,
        sku: { in: skus },
        deletedAt: null,
      },
      select: {
        id: true,
        sku: true,
        name: true,
        salePriceUSD: true,
        taxRate: true,
      },
    });
    const bySku = new Map(products.map((product) => [product.sku, product]));

    const errors: SaleImportFieldError[] = [];
    const grouped = new Map<string, ImportSale>();

    for (const row of parsed.rows) {
      const cells = Object.fromEntries(
        keys.map((key, index) => [key, row.cells[index] ?? ""]),
      ) as Record<string, string>;

      const venta = (cells.venta ?? "").trim();
      const sku = (cells.sku ?? "").trim();
      const fecha = (cells.fecha ?? "").trim();
      const method = (cells.metodo_pago ?? "").trim().toUpperCase();
      const customerName = (cells.cliente_nombre ?? "").trim();
      const lineErrors: string[] = [];
      const lineWarnings: string[] = [];
      const pushError = (field: string, message: string) => {
        lineErrors.push(message);
        errors.push({ line: row.line, field, message });
      };

      if (!venta) pushError("venta", "Fila sin número de venta.");
      if (!customerName) pushError("cliente_nombre", "Falta el nombre del cliente.");
      if (!fecha) pushError("fecha", "Falta la fecha.");
      const issueDate = parseDay(fecha);
      if (fecha && !issueDate) {
        pushError("fecha", `Fecha inválida: "${fecha}" (usa AAAA-MM-DD).`);
      }

      const quantity = toNumber(cells.cantidad);
      if (quantity === null || quantity <= 0) {
        pushError("cantidad", "La cantidad debe ser mayor que cero.");
      }

      const product = sku ? bySku.get(sku) : undefined;
      if (!sku) {
        pushError("sku", "Falta el SKU.");
      } else if (!product) {
        pushError("sku", `El SKU "${sku}" no existe en tu catálogo.`);
      }

      if (!method) {
        pushError("metodo_pago", "Falta el método de pago.");
      } else if (!isBusinessPaymentMethod(method)) {
        pushError("metodo_pago", `Método de pago desconocido: "${method}".`);
      }

      const paid = toNumber(cells.monto_pagado) ?? 0;
      if (paid < 0) pushError("monto_pagado", "El monto pagado no puede ser negativo.");

      const expectedCurrency = method ? currencyForPaymentMethod(method) : null;
      const declaredCurrency = (cells.moneda ?? "").trim().toUpperCase();
      if (
        expectedCurrency &&
        declaredCurrency &&
        declaredCurrency !== expectedCurrency
      ) {
        lineWarnings.push(
          `La moneda declarada (${declaredCurrency}) no coincide con el método; se usa ${expectedCurrency}.`,
        );
      }

      if (!venta) continue;

      const sale = grouped.get(venta) ?? {
        venta,
        line: row.line,
        customer: customerName,
        customerEmail: (cells.cliente_email ?? "").trim() || null,
        customerPhone: (cells.cliente_telefono ?? "").trim() || null,
        issueDate: issueDate ?? new Date().toISOString(),
        notes: (cells.notas ?? "").trim(),
        lines: [],
        errors: [],
        warnings: [],
        paidUSD: 0,
        totalUSD: 0,
      };
      sale.errors.push(...lineErrors);
      sale.warnings.push(...lineWarnings);

      if (lineErrors.length === 0 && product && quantity !== null) {
        const unitPriceUSD = Number(product.salePriceUSD);
        sale.lines.push({
          line: row.line,
          fecha: issueDate as string,
          quantity,
          unitPriceUSD,
          taxRate: Number(product.taxRate),
          productId: product.id,
          productName: product.name,
          paymentMethod: method,
          currency: expectedCurrency ?? "USD",
          paid,
          errors: [],
          warnings: [],
        });
        sale.totalUSD += quantity * unitPriceUSD;
      } else {
        // Keep the line count honest even when the row is invalid.
        sale.lines.push({
          line: row.line,
          fecha: fecha,
          quantity: quantity ?? 0,
          unitPriceUSD: 0,
          taxRate: 0,
          productId: product?.id ?? "",
          productName: product?.name ?? sku,
          paymentMethod: method,
          currency: expectedCurrency ?? "USD",
          paid,
          errors: lineErrors,
          warnings: lineWarnings,
        });
      }

      sale.paidUSD += paid;
      grouped.set(venta, sale);
    }

    for (const sale of grouped.values()) {
      if (sale.totalUSD <= 0) {
        sale.errors.push("La venta no tiene líneas válidas.");
      }
      if (sale.paidUSD > sale.totalUSD + 0.01) {
        sale.errors.push(
          `Lo pagado ($${round2(sale.paidUSD).toFixed(2)}) supera el total de la venta ($${round2(sale.totalUSD).toFixed(2)}).`,
        );
        errors.push({
          line: sale.line,
          field: "monto_pagado",
          message: sale.errors[sale.errors.length - 1],
        });
      }
    }

    return { sales: [...grouped.values()], errors };
  }

  private async resolveClient(
    scope: SaleScope,
    sale: ImportSale,
  ): Promise<string | null> {
    const organizationId = scope.organizationId;
    if (sale.customerEmail) {
      const byEmail = await this.prisma.client.findFirst({
        where: {
          organizationId,
          deletedAt: null,
          email: { equals: sale.customerEmail, mode: "insensitive" },
        },
        select: { id: true },
      });
      if (byEmail) return byEmail.id;
    }
    if (sale.customerPhone) {
      const byPhone = await this.prisma.client.findFirst({
        where: { organizationId, deletedAt: null, phone: sale.customerPhone },
        select: { id: true },
      });
      if (byPhone) return byPhone.id;
    }
    if (!sale.customerEmail && !sale.customerPhone) return null;

    const created = await this.prisma.client.create({
      data: {
        name: sale.customer,
        email: sale.customerEmail,
        phone: sale.customerPhone,
        organizationId,
        notes: "Creado desde importación de ventas",
      },
      select: { id: true },
    });
    return created.id;
  }
}

function toNumber(value: string | undefined): number | null {
  const parsed = normalizeNumber(value ?? "");
  return parsed.ok ? parsed.value : null;
}

/**
 * Accepts `YYYY-MM-DD` and anchors it at noon UTC: the CSV carries a calendar
 * day, so the stored instant must not depend on the server's timezone.
 */
function parseDay(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
