import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { BUSINESS_PAYMENT_METHOD_CODES } from "src/shared/constants/payment-methods";
import { PrismaService } from "nestjs-prisma";
import { SaleStatus } from "@prisma/client";
import type { Prisma, SaleItem } from "@prisma/client";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { emitEvent } from "src/shared/event/event-envelope";
import { TenantSettingsService } from "src/shared/services/tenant-settings.service";
import {
  SequenceDb,
  SequenceService,
} from "src/shared/services/sequence.service";
import { round2, usdToUsdt, usdToVes } from "src/shared/utils/money";
import { deriveProductStatus } from "../product/product.service";
import type { SaleScope } from "./sale.service";
import {
  CreateSaleReturnDto,
  ListSaleReturnsQueryDto,
  SaleReturnItemInputDto,
} from "./dto/sale-return.dto";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

interface ResolvedReturnItem {
  saleItem: SaleItem;
  quantity: number;
  subtotalUSD: number;
  discountUSD: number;
  taxUSD: number;
  totalUSD: number;
}

/** Quantity of a line still up for return: sold minus what came back. */
const EPSILON = 1e-9;

/**
 * Sale returns (S13).
 *
 * A return reverses what a sale actually charged: unit price, the prorated
 * line discount and the line tax come from the sale itself, so a customer can
 * never refund more than they paid for those units. Stock comes back through
 * the kardex, the client's outstanding balance shrinks (never below zero), and
 * when the caller hands the money back from an open turn it is booked as a
 * drawer expense.
 *
 * Known limit: a document-level discount on the sale (`Sale.discountUSD`) is
 * not prorated into returns — line-level pricing is exact, document-level
 * rounding stays with the sale.
 */
@Injectable()
export class SaleReturnService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sequenceService: SequenceService,
    private readonly tenantSettings: TenantSettingsService,
    private readonly eventEmitter?: EventEmitter2,
  ) {}

  private scopeWhere(organizationId: string | null): Prisma.SaleReturnWhereInput {
    return { organizationId, deletedAt: null };
  }

  /** Sale-shaped twin of `scopeWhere` (different where-input types). */
  private saleScopeWhere(
    organizationId: string | null,
  ): Prisma.SaleWhereInput {
    return { organizationId, deletedAt: null };
  }

  async create(scope: SaleScope, saleId: string, data: CreateSaleReturnDto) {
    if (data.refundMethod) {
      const isBuiltin = BUSINESS_PAYMENT_METHOD_CODES.includes(
        data.refundMethod,
      );
      const custom =
        isBuiltin || !scope.organizationId
          ? null
          : await this.prisma.tenantPaymentMethod.findFirst({
              where: {
                organizationId: scope.organizationId,
                code: data.refundMethod,
                active: true,
              },
              select: { id: true },
            });
      if (!isBuiltin && !custom) {
        throw new BadRequestException(
          `Método de reintegro no reconocido: "${data.refundMethod}".`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findFirst({
        where: { id: saleId, ...this.saleScopeWhere(scope.organizationId) },
        include: { items: true },
      });

      if (!sale) throw new NotFoundException("Venta no encontrada.");
      if (sale.status !== SaleStatus.COMPLETED) {
        throw new ConflictException(
          "Solo se pueden devolver ventas activas.",
        );
      }

      const rates = {
        rateBcv: Number(sale.rateBcv),
        rateUsdt: Number(sale.rateUsdt),
      };

      const resolved = this.resolveItems(sale.items, data.items);
      // Must be awaited: a fire-and-forget promise here would neither block
      // the return nor be reported to the caller.
      await this.assertWithinReturned(sale.id, resolved, tx);

      // subtotal is NET of the prorated line discounts, so the document stays
      // consistent with the sum of its lines: total = subtotal + tax.
      const subtotalUSD = round2(
        resolved.reduce(
          (sum, item) => sum + item.subtotalUSD - item.discountUSD,
          0,
        ),
      );
      const taxUSD = round2(resolved.reduce((sum, item) => sum + item.taxUSD, 0));
      const totalUSD = round2(subtotalUSD + taxUSD);
      const totalVES = round2(totalUSD * rates.rateBcv);
      const totalUSDT = round2((totalUSD * rates.rateBcv) / rates.rateUsdt);

      const returnNumber = await this.sequenceService.nextFormatted(
        "RETURN",
        scope.organizationId,
        "DEV",
        5,
        tx as SequenceDb,
      );

      const created = await tx.saleReturn.create({
        data: {
          returnNumber,
          organizationId: scope.organizationId,
          saleId: sale.id,
          clientId: sale.clientId,
          issueDate: data.issueDate ? new Date(data.issueDate) : new Date(),
          reason: data.reason?.trim() || null,
          refundMethod: data.refundMethod ?? null,
          cashShiftId: null,
          rateBcv: rates.rateBcv,
          rateUsdt: rates.rateUsdt,
          // Net of the prorated line discount: total = subtotal + tax.
          subtotalUSD,
          taxUSD,
          totalUSD,
          totalVES,
          totalUSDT,
          notes: data.notes?.trim() || null,
          createdById: scope.createdById ?? null,
        },
      });

      for (const item of resolved) {
        await tx.saleReturnItem.create({
          data: {
            returnId: created.id,
            saleItemId: item.saleItem.id,
            productId: item.saleItem.productId,
            productName: item.saleItem.productName,
            quantity: item.quantity,
            unitPriceUSD: item.saleItem.unitPriceUSD,
            taxRate: item.saleItem.taxRate ?? 0,
            totalUSD: item.totalUSD,
          },
        });
      }

      await this.restoreStock(scope, tx, resolved, returnNumber);
      await this.reduceClientBalance(tx, sale.clientId, totalUSD);
      await this.bookDrawerRefund(scope, tx, created.id, data, rates, totalUSD, returnNumber, sale.saleNumber);

      this.emitReturn(scope, {
        returnId: created.id,
        returnNumber,
        saleId: sale.id,
        saleNumber: sale.saleNumber,
        totalUSD,
        count: resolved.length,
      });

      return tx.saleReturn.findUnique({
        where: { id: created.id },
        include: { items: true },
      });
    });
  }

  async listBySale(scope: SaleScope, saleId: string, query: ListSaleReturnsQueryDto) {
    // Confirms the sale belongs to the tenant before exposing its returns.
    await this.prisma.sale.findFirst({
      where: { id: saleId, ...this.saleScopeWhere(scope.organizationId) },
      select: { id: true },
    });

    return this.list(scope, { ...query, saleId });
  }

  async list(scope: SaleScope, query: ListSaleReturnsQueryDto) {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(Math.max(query.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);

    const filters: Prisma.SaleReturnWhereInput[] = [
      this.scopeWhere(scope.organizationId),
    ];

    if (query.saleId) filters.push({ saleId: query.saleId });
    if (query.from || query.to) {
      filters.push({
        issueDate: {
          ...(query.from ? { gte: new Date(query.from) } : {}),
          ...(query.to ? { lte: new Date(query.to) } : {}),
        },
      });
    }

    const where: Prisma.SaleReturnWhereInput = { AND: filters };
    const [list, total] = await Promise.all([
      this.prisma.saleReturn.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { issueDate: "desc" },
        include: {
          items: true,
          sale: { select: { id: true, saleNumber: true } },
          client: { select: { id: true, name: true } },
        },
      }),
      this.prisma.saleReturn.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      list,
      total,
      totalRecords: total,
      totalPages,
      currentPage: page,
      limit,
      hasPrev: page > 1,
      hasNext: page < totalPages,
    };
  }

  async getOne(scope: SaleScope, id: string) {
    const saleReturn = await this.prisma.saleReturn.findFirst({
      where: { id, ...this.scopeWhere(scope.organizationId) },
      include: {
        items: true,
        sale: { select: { id: true, saleNumber: true } },
        client: { select: { id: true, name: true } },
      },
    });

    if (!saleReturn) throw new NotFoundException("Devolución no encontrada.");
    return saleReturn;
  }

  // ------------------------------------------------------------------
  // Internals
  // ------------------------------------------------------------------

  /**
   * Matches each requested item to the sale line it reverses. Prices come from
   * that line — the client only says what came back and how much.
   */
  private resolveItems(
    saleItems: SaleItem[],
    inputs: SaleReturnItemInputDto[],
  ): ResolvedReturnItem[] {
    return inputs.map((input) => {
      const line = saleItems.find((item) =>
        input.saleItemId
          ? item.id === input.saleItemId
          : input.productId
            ? item.productId === input.productId
            : item.productName === input.productName,
      );

      if (!line) {
        throw new BadRequestException(
          `El artículo "${input.productName ?? input.productId ?? input.saleItemId}" no pertenece a esta venta.`,
        );
      }

      const quantity = Number(input.quantity);
      const lineQuantity = Number(line.quantity);
      const unitPrice = Number(line.unitPriceUSD);
      const lineDiscount = Number(line.discountUSD ?? 0);
      const taxRate = Number(line.taxRate ?? 0);

      // Prorated share of the line discount for the returned units.
      const discountUSD = round2((lineDiscount * quantity) / lineQuantity);
      const subtotalUSD = round2(unitPrice * quantity);
      const taxUSD = round2(((subtotalUSD - discountUSD) * taxRate) / 100);

      return {
        saleItem: line,
        quantity,
        subtotalUSD,
        discountUSD,
        taxUSD,
        totalUSD: round2(subtotalUSD - discountUSD + taxUSD),
      };
    });
  }

  /**
   * Cumulative check: sold − already returned ≥ requested, per sale line, so a
   * customer cannot return the same units twice across several requests.
   */
  private async assertWithinReturned(
    saleId: string,
    resolved: ResolvedReturnItem[],
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const previous = await tx.saleReturnItem.findMany({
      where: { return: { saleId } },
      select: { saleItemId: true, quantity: true },
    });

    const returnedByLine = new Map<string, number>();
    for (const row of previous) {
      if (!row.saleItemId) continue;
      returnedByLine.set(
        row.saleItemId,
        (returnedByLine.get(row.saleItemId) ?? 0) + Number(row.quantity),
      );
    }

    const requestedByLine = new Map<string, number>();
    for (const item of resolved) {
      const lineId = item.saleItem.id;
      const requested =
        (requestedByLine.get(lineId) ?? 0) + item.quantity;
      requestedByLine.set(lineId, requested);

      const alreadyReturned = returnedByLine.get(lineId) ?? 0;
      const sold = Number(item.saleItem.quantity);
      const remaining = sold - alreadyReturned;

      if (requested > remaining + EPSILON) {
        throw new BadRequestException(
          `Se pueden devolver hasta ${round2(remaining)} unidad(es) de "${item.saleItem.productName}": ya se devolvieron ${round2(alreadyReturned)} de ${round2(sold)}.`,
        );
      }
    }
  }

  private async restoreStock(
    scope: SaleScope,
    tx: Prisma.TransactionClient,
    resolved: ResolvedReturnItem[],
    reference: string,
  ): Promise<void> {
    for (const item of resolved) {
      if (!item.saleItem.productId) continue;

      const product = await tx.product.findFirst({
        where: { id: item.saleItem.productId },
      });
      if (!product || product.isService) continue;

      const previousStock = Number(product.stock ?? 0);
      const nextStock = round2(previousStock + item.quantity);

      await tx.stockMovement.create({
        data: {
          productId: product.id,
          organizationId: scope.organizationId,
          createdById: scope.createdById ?? null,
          type: "RETURN",
          quantity: item.quantity,
          previousStock,
          newStock: nextStock,
          reference,
          notes: null,
        },
      });

      await tx.product.update({
        where: { id: product.id },
        data: {
          stock: nextStock,
          status: deriveProductStatus(product.status, false, nextStock),
        },
      });
    }
  }

  /** The customer owes less; the balance never goes below zero. */
  private async reduceClientBalance(
    tx: Prisma.TransactionClient,
    clientId: string | null,
    returnUSD: number,
  ): Promise<void> {
    if (!clientId || returnUSD <= 0) return;

    const client = await tx.client.findFirst({
      where: { id: clientId },
      select: { currentBalanceUSD: true },
    });
    if (!client) return;

    const current = Number(client.currentBalanceUSD ?? 0);
    await tx.client.update({
      where: { id: clientId },
      data: { currentBalanceUSD: round2(Math.max(0, current - returnUSD)) },
    });
  }

  /**
   * Optional: the refund was handed back out of an open turn (S2: only while
   * shift control is on) and lands in the drawer as an expense.
   */
  private async bookDrawerRefund(
    scope: SaleScope,
    tx: Prisma.TransactionClient,
    returnId: string,
    data: CreateSaleReturnDto,
    rates: { rateBcv: number; rateUsdt: number },
    totalUSD: number,
    returnNumber: string,
    saleNumber: string,
  ): Promise<void> {
    if (!data.cashShiftId) return;

    const settings = await this.tenantSettings.get(scope.organizationId);
    if (!settings.cash.shiftControl) {
      throw new ConflictException(
        "El control de caja está desactivado: registra el reintegro sin turno o habilita el control en Configuración.",
      );
    }

    const shift = await tx.cashShift.findFirst({
      where: {
        id: data.cashShiftId,
        status: "OPEN",
        cashRegister: { organizationId: scope.organizationId },
      },
      select: { id: true },
    });
    if (!shift) {
      throw new ConflictException(
        "El turno indicado no está abierto en este negocio.",
      );
    }

    // The document total is in USD; the drawer keeps whatever currency the
    // money went back in, so it is converted with the sale's frozen rates.
    const currency = data.currency ?? "USD";
    const amount =
      currency === "USD"
        ? round2(totalUSD)
        : currency === "VES"
          ? usdToVes(totalUSD, rates)
          : usdToUsdt(totalUSD, rates);

    await tx.cashMovement.create({
      data: {
        cashShiftId: shift.id,
        type: "EXPENSE",
        amount,
        currency,
        paymentMethod: data.refundMethod ?? "CASH_USD",
        reason: `Devolución ${returnNumber}`,
        reference: saleNumber,
        createdById: scope.createdById ?? null,
      },
    });

    await tx.saleReturn.update({
      where: { id: returnId },
      data: { cashShiftId: shift.id },
    });
  }

  private emitReturn(
    scope: SaleScope,
    payload: Record<string, unknown>,
  ): void {
    if (!this.eventEmitter || !scope.createdById) return;

    emitEvent(this.eventEmitter, {
      eventName: "erp.sale.returned",
      actorId: scope.createdById,
      orgId: scope.organizationId,
      source: "api",
      payload,
    });
  }
}
