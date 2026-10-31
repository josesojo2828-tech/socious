import {  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { BUSINESS_PAYMENT_METHOD_CODES } from "src/shared/constants/payment-methods";
import { computeCreditDueDate } from "./util/credit-due-date";
import { PrismaService } from "nestjs-prisma";
import { PaymentStatus, ProductStatus, SaleStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { ExchangeService } from "../exchange/exchange.service";
import { deriveProductStatus } from "../product/product.service";
import { TenantSettingsService } from "src/shared/services/tenant-settings.service";
import { SequenceService, SequenceDb } from "src/shared/services/sequence.service";
import {
  buildDocumentTotals,
  buildPaymentAmounts,
  derivePaymentStatus,
  remainingBalance,
  round2,
  type RateSnapshot,
} from "src/shared/utils/money";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { emitEvent } from "src/shared/event/event-envelope";
import type { EventName } from "src/shared/event/event-taxonomy";
import {
  AddSalePaymentDto,
  CreateSaleDto,
  ListSalesQueryDto,
  SaleItemInputDto,
  SalesReportQueryDto,
} from "./dto/sale.dto";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

export interface SaleScope {
  organizationId: string | null;
  createdById?: string | null;
}

interface ResolvedItem {
  productId: string | null;
  presentationId: string | null;
  productName: string;
  quantity: number;
  unitPriceUSD: number;
  discountUSD: number;
  taxRate: number;
  taxUSD: number;
  totalUSD: number;
  isService: boolean;
}

/**
 * Sales and invoicing (S7).
 *
 * The document is ACCRUAL: `issueDate` is when the sale happened and it is
 * what monthly reports count. Each `SalePayment` carries its own `paidAt`, so a
 * sale issued in January and settled in May still reports as January revenue
 * with a May collection. Rates are frozen on the document and never re-read.
 */
@Injectable()
export class SaleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly exchangeService: ExchangeService,
    private readonly sequenceService: SequenceService,
    private readonly tenantSettings: TenantSettingsService,
    private readonly eventEmitter?: EventEmitter2,
  ) {}

  /**
   * S2: a tenant with `cash.shiftControl` off never attaches a sale to a shift
   * (the cash register is always active). Passing one explicitly is a config
   * mismatch, not a silent no-op.
   */
  private async assertCashShiftAllowed(
    scope: SaleScope,
    cashShiftId: string | null | undefined,
  ): Promise<void> {
    if (!cashShiftId) return;

    const settings = await this.tenantSettings.get(scope.organizationId);
    if (settings.cash.shiftControl) return;

    throw new ConflictException(
      "El control de caja está desactivado: registra la venta sin turno de caja o habilita el control en Configuración.",
    );
  }

  private scopeWhere(organizationId: string | null): Prisma.SaleWhereInput {
    return { organizationId, deletedAt: null };
  }

  // ------------------------------------------------------------------
  // Create
  // ------------------------------------------------------------------

  async create(scope: SaleScope, data: CreateSaleDto) {
    if (!data.items?.length) {
      throw new BadRequestException("La venta necesita al menos un artículo.");
    }

    await this.assertCashShiftAllowed(scope, data.cashShiftId);

    for (const payment of data.payments ?? []) {
      await this.assertPaymentMethod(scope.organizationId, payment.paymentMethod);
    }

    const rates = await this.exchangeService.resolveRates(
      scope.organizationId,
      { rateBcv: data.rateBcv, rateUsdt: data.rateUsdt },
    );

    return this.prisma.$transaction(async (tx) => {
      const items = await this.resolveItems(scope, data.items, tx);

      const subtotalUSD = round2(
        items.reduce((sum, item) => sum + item.quantity * item.unitPriceUSD, 0),
      );
      const discountUSD = round2(data.discountUSD ?? 0);
      const taxUSD = round2(items.reduce((sum, item) => sum + item.taxUSD, 0));

      const totals = buildDocumentTotals(
        { subtotalUSD, discountUSD, taxUSD },
        rates,
      );

      let dueDate = data.dueDate ? new Date(data.dueDate) : null;
      let creditTerms: string | null = null;
      if (data.creditCadence) {
        creditTerms = JSON.stringify({
          cadence: data.creditCadence,
          everyNDays: data.creditEveryNDays ?? null,
          monthlyDay: data.creditMonthlyDay ?? null,
        });
        if (!dueDate) {
          dueDate = computeCreditDueDate(data.creditCadence, {
            everyNDays: data.creditEveryNDays,
            monthlyDay: data.creditMonthlyDay,
          });
        }
      }

      const saleNumber = await this.sequenceService.nextFormatted(
        "SALE",
        scope.organizationId,
        "VTA",
        5,
        tx as SequenceDb,
      );

      const sale = await tx.sale.create({
        data: {
          saleNumber,
          organizationId: scope.organizationId,
          clientId: data.clientId ?? null,
          orderId: data.orderId ?? null,
          issueDate: data.issueDate ? new Date(data.issueDate) : new Date(),
          dueDate,
          creditTerms,
          rateBcv: rates.rateBcv,
          rateUsdt: rates.rateUsdt,
          subtotalUSD: totals.subtotalUSD,
          discountUSD: totals.discountUSD,
          taxUSD: totals.taxUSD,
          totalUSD: totals.totalUSD,
          totalVES: totals.totalVES,
          totalUSDT: totals.totalUSDT,
          paymentStatus: PaymentStatus.UNPAID,
          status: SaleStatus.COMPLETED,
          notes: data.notes?.trim() || null,
          createdById: scope.createdById ?? null,
        },
      });

      await this.persistItems(tx, sale.id, items);
      await this.applyStock(scope, tx, items, sale.saleNumber);

      const payments = await this.persistPayments(
        tx,
        scope,
        sale.id,
        data.cashShiftId ?? null,
        rates,
        data.payments ?? [],
      );

      const paidUSD = round2(
        payments.reduce((sum, payment) => sum + Number(payment.amountUSD), 0),
      );
      const paymentStatus = derivePaymentStatus(totals.totalUSD, paidUSD);

      await tx.sale.update({
        where: { id: sale.id },
        data: { paymentStatus },
      });

      if (data.orderId) {
        await tx.order.updateMany({
          where: { id: data.orderId, saleId: null },
          data: { saleId: sale.id, status: "CONFIRMED" },
        });
      }

      if (data.clientId) {
        await this.addToClientBalance(tx, data.clientId, remainingBalance(totals.totalUSD, paidUSD));
      }

      const created = await tx.sale.findUnique({
        where: { id: sale.id },
        include: { items: true, payments: true, client: true },
      });

      this.emitBusinessEvent(
        "erp.sale.created",
        scope.createdById,
        scope.organizationId,
        {
          saleId: sale.id,
          saleNumber: sale.saleNumber,
          totalUSD: totals.totalUSD,
          clientId: data.clientId ?? null,
          count: items.length,
        },
      );

      return created;
    });
  }

  // ------------------------------------------------------------------
  // Payments (accrual vs collection)
  // ------------------------------------------------------------------

  async addPayment(scope: SaleScope, saleId: string, data: AddSalePaymentDto) {
    await this.assertPaymentMethod(scope.organizationId, data.paymentMethod);
    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findFirst({
        where: { id: saleId, ...this.scopeWhere(scope.organizationId) },
      });
      if (!sale) throw new NotFoundException("Venta no encontrada.");
      if (sale.status !== SaleStatus.COMPLETED) {
        throw new ConflictException(
          "Solo se pueden cobrar ventas activas.",
        );
      }

      const rates: RateSnapshot = {
        rateBcv: Number(sale.rateBcv),
        rateUsdt: Number(sale.rateUsdt),
      };

      const [payment] = await this.persistPayments(
        tx,
        scope,
        sale.id,
        null,
        rates,
        [data],
      );

      const payments = await tx.salePayment.findMany({
        where: { saleId: sale.id },
        select: { amountUSD: true },
      });
      const paidUSD = round2(
        payments.reduce((sum, row) => sum + Number(row.amountUSD), 0),
      );
      const totalUSD = Number(sale.totalUSD);
      const paymentStatus = derivePaymentStatus(totalUSD, paidUSD);

      await tx.sale.update({
        where: { id: sale.id },
        data: { paymentStatus },
      });

      if (sale.clientId) {
        // The outstanding balance shrinks by what this payment collected.
        await this.addToClientBalance(
          tx,
          sale.clientId,
          -Number(payment.amountUSD),
        );
      }

      this.emitBusinessEvent(
        "erp.sale.payment_received",
        scope.createdById,
        scope.organizationId,
        {
          saleId: sale.id,
          saleNumber: sale.saleNumber,
          amount: Number(payment.amountUSD),
          currency: payment.currency,
          paymentMethod: payment.paymentMethod,
        },
      );

      return { payment, paymentStatus, paidUSD };
    });
  }

  // ------------------------------------------------------------------
  // Read
  // ------------------------------------------------------------------

  async list(scope: SaleScope, query: ListSalesQueryDto) {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(Math.max(query.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);

    const filters: Prisma.SaleWhereInput[] = [
      this.scopeWhere(scope.organizationId),
    ];

    if (query.clientId) filters.push({ clientId: query.clientId });
    if (query.paymentStatus) filters.push({ paymentStatus: query.paymentStatus });
    if (query.status) filters.push({ status: query.status });

    if (query.from || query.to) {
      filters.push({
        issueDate: {
          ...(query.from ? { gte: new Date(query.from) } : {}),
          ...(query.to ? { lte: new Date(query.to) } : {}),
        },
      });
    }

    if (query.q?.trim()) {
      const q = query.q.trim();
      filters.push({
        OR: [
          { saleNumber: { contains: q, mode: "insensitive" } },
          { notes: { contains: q, mode: "insensitive" } },
          { client: { name: { contains: q, mode: "insensitive" } } },
        ],
      });
    }

    const where: Prisma.SaleWhereInput = { AND: filters };
    const [list, total] = await Promise.all([
      this.prisma.sale.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { issueDate: "desc" },
        include: {
          client: { select: { id: true, name: true } },
          payments: { orderBy: { paidAt: "desc" } },
          items: true,
          returns: { select: { totalUSD: true, returnNumber: true } },
        },
      }),
      this.prisma.sale.count({ where }),
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
    const sale = await this.prisma.sale.findFirst({
      where: { id, ...this.scopeWhere(scope.organizationId) },
      include: {
        items: true,
        payments: { orderBy: { paidAt: "desc" } },
        client: true,
        order: true,
        returns: {
          orderBy: { issueDate: "desc" },
          select: {
            id: true,
            returnNumber: true,
            totalUSD: true,
            issueDate: true,
            reason: true,
          },
        },
      },
    });

    if (!sale) throw new NotFoundException("Venta no encontrada.");
    return sale;
  }

  /**
   * Accrual report: what was invoiced per month vs what was collected per
   * month, plus the accounts-receivable aging. This is the "ventas de enero
   * cobradas en mayo" view.
   */
  async getReport(scope: SaleScope, query: SalesReportQueryDto) {
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;

    const issueRange = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };

    const [accrued, collected, sales, unpaid] = await Promise.all([
      this.prisma.sale.findMany({
        where: {
          ...this.scopeWhere(scope.organizationId),
          issueDate: issueRange,
          status: SaleStatus.COMPLETED,
        },
        select: { issueDate: true, totalUSD: true, paymentStatus: true },
      }),
      this.prisma.salePayment.findMany({
        where: {
          sale: this.scopeWhere(scope.organizationId),
          paidAt: issueRange,
        },
        select: { paidAt: true, amountUSD: true, saleId: true },
      }),
      this.prisma.sale.aggregate({
        where: {
          ...this.scopeWhere(scope.organizationId),
          issueDate: issueRange,
          status: SaleStatus.COMPLETED,
        },
        _sum: { totalUSD: true, totalVES: true, totalUSDT: true },
        _count: { id: true },
      }),
      this.prisma.sale.findMany({
        where: {
          ...this.scopeWhere(scope.organizationId),
          status: SaleStatus.COMPLETED,
          paymentStatus: { in: [PaymentStatus.UNPAID, PaymentStatus.PARTIAL] },
        },
        select: {
          id: true,
          saleNumber: true,
          issueDate: true,
          dueDate: true,
          totalUSD: true,
          client: { select: { id: true, name: true } },
        },
        orderBy: { issueDate: "asc" },
        take: 200,
      }),
    ]);

    const monthKey = (date: Date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    const accrualByMonth = new Map<string, { totalUSD: number; count: number }>();
    for (const sale of accrued) {
      const key = monthKey(new Date(sale.issueDate));
      const bucket = accrualByMonth.get(key) ?? { totalUSD: 0, count: 0 };
      bucket.totalUSD = round2(bucket.totalUSD + Number(sale.totalUSD));
      bucket.count += 1;
      accrualByMonth.set(key, bucket);
    }

    const collectionsByMonth = new Map<string, { totalUSD: number; count: number }>();
    for (const payment of collected) {
      const key = monthKey(new Date(payment.paidAt));
      const bucket = collectionsByMonth.get(key) ?? { totalUSD: 0, count: 0 };
      bucket.totalUSD = round2(bucket.totalUSD + Number(payment.amountUSD));
      bucket.count += 1;
      collectionsByMonth.set(key, bucket);
    }

    const today = new Date();
    const aging = {
      current: 0,
      days1_30: 0,
      days31_60: 0,
      over60: 0,
    };

    const openItems = unpaid.map((sale) => {
      const due = sale.dueDate ? new Date(sale.dueDate) : new Date(sale.issueDate);
      const days = Math.floor((today.getTime() - due.getTime()) / 86_400_000);
      const amount = Number(sale.totalUSD);
      if (days <= 0) aging.current = round2(aging.current + amount);
      else if (days <= 30) aging.days1_30 = round2(aging.days1_30 + amount);
      else if (days <= 60) aging.days31_60 = round2(aging.days31_60 + amount);
      else aging.over60 = round2(aging.over60 + amount);

      return {
        id: sale.id,
        saleNumber: sale.saleNumber,
        issueDate: sale.issueDate,
        dueDate: sale.dueDate,
        totalUSD: Number(sale.totalUSD),
        daysOverdue: Math.max(0, days),
        client: sale.client,
      };
    });

    return {
      issued: {
        count: sales._count.id,
        totalUSD: Number(sales._sum.totalUSD ?? 0),
        totalVES: Number(sales._sum.totalVES ?? 0),
        totalUSDT: Number(sales._sum.totalUSDT ?? 0),
      },
      accrualByMonth: [...accrualByMonth.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, value]) => ({ month, ...value })),
      collectionsByMonth: [...collectionsByMonth.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, value]) => ({ month, ...value })),
      aging,
      openItems,
    };
  }

  // ------------------------------------------------------------------
  // Cancel
  // ------------------------------------------------------------------

  /**
   * Cancels a sale and returns its stock. Collections already made stay as
   * they are: the money moved, so the report must keep showing it.
   */
  async cancel(scope: SaleScope, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findFirst({
        where: { id, ...this.scopeWhere(scope.organizationId) },
        include: { items: true },
      });
      if (!sale) throw new NotFoundException("Venta no encontrada.");
      if (sale.status === SaleStatus.CANCELLED) {
        throw new ConflictException("La venta ya está anulada.");
      }

      const paidAgg = await tx.salePayment.aggregate({
        _sum: { amountUSD: true },
        where: { saleId: sale.id },
      });
      const paidUSD = Number(paidAgg._sum.amountUSD ?? 0);

      for (const item of sale.items) {
        if (!item.productId) continue;
        if (item.presentationId) {
          const presentation = await tx.productPresentation.findFirst({
            where: { id: item.presentationId },
            select: { id: true, stock: true },
          });
          if (presentation) {
            await tx.productPresentation.update({
              where: { id: item.presentationId },
              data: {
                stock: round2(
                  Number(presentation.stock ?? 0) + Number(item.quantity),
                ),
              },
            });
          }
          continue;
        }
        const product = await tx.product.findFirst({
          where: { id: item.productId },
        });
        if (!product || product.isService) continue;

        const previousStock = Number(product.stock ?? 0);
        const nextStock = round2(previousStock + Number(item.quantity));

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            organizationId: scope.organizationId,
            createdById: scope.createdById ?? null,
            type: "RETURN",
            quantity: Number(item.quantity),
            previousStock,
            newStock: nextStock,
            reference: sale.saleNumber,
            notes: "Anulación de venta",
          },
        });

        await tx.product.update({
          where: { id: item.productId },
          data: { stock: nextStock },
        });
      }

      if (sale.clientId) {
        // The outstanding balance goes back up by what was still owed.
        await this.addToClientBalance(
          tx,
          sale.clientId,
          remainingBalance(Number(sale.totalUSD), paidUSD),
        );
      }

      const cancelled = await tx.sale.update({
        where: { id: sale.id },
        data: { status: SaleStatus.CANCELLED },
        include: { items: true, payments: true },
      });

      this.emitBusinessEvent(
        "erp.sale.cancelled",
        scope.createdById,
        scope.organizationId,
        { saleId: sale.id, saleNumber: sale.saleNumber },
      );

      return cancelled;
    });
  }

  // ------------------------------------------------------------------
  // Internals
  // ------------------------------------------------------------------

  private async resolveItems(
    scope: SaleScope,
    inputs: SaleItemInputDto[],
    tx: Prisma.TransactionClient,
  ): Promise<ResolvedItem[]> {
    const resolved: ResolvedItem[] = [];

    for (const input of inputs) {
      const quantity = Number(input.quantity);
      const unitPriceUSD = Number(input.unitPriceUSD);
      const discountUSD = Number(input.discountUSD ?? 0);
      const taxRate = Number(input.taxRate ?? 0);

      let productName = input.productName?.trim();
      let isService = false;
      let productId: string | null = input.productId ?? null;
      let presentationId: string | null = input.presentationId ?? null;

      if (presentationId) {
        const presentation = await tx.productPresentation.findFirst({
          where: { id: presentationId },
          select: { id: true, productId: true, name: true, stock: true },
        });
        if (!presentation) {
          throw new NotFoundException("La presentación no existe.");
        }
        if (productId && presentation.productId !== productId) {
          throw new BadRequestException(
            "La presentación no pertenece a ese producto.",
          );
        }
        if (Number(presentation.stock ?? 0) < quantity) {
          throw new BadRequestException(
            `Stock insuficiente para "${presentation.name}": hay ${Number(presentation.stock ?? 0)} y se piden ${quantity}.`,
          );
        }
        productId = presentation.productId;
        productName = presentation.name;
      }

      if (productId && !presentationId) {
        const product = await tx.product.findFirst({
          where: {
            id: productId,
            organizationId: scope.organizationId,
            deletedAt: null,
          },
          select: { id: true, name: true, isService: true, salePriceUSD: true },
        });

        if (!product) {
          throw new NotFoundException(
            `El producto "${productName ?? productId}" no existe en tu catálogo.`,
          );
        }

        isService = product.isService;
        productName = product.name;
        productId = product.id;

        if (!isService) {
          const stock = await tx.product.findFirst({
            where: { id: product.id },
            select: { stock: true },
          });
          if (Number(stock?.stock ?? 0) < quantity) {
            throw new BadRequestException(
              `Stock insuficiente para "${product.name}": hay ${Number(stock?.stock ?? 0)} y se piden ${quantity}.`,
            );
          }
        }
      } else if (!productName) {
        throw new BadRequestException("Cada artículo necesita un nombre.");
      }

      const gross = round2(quantity * unitPriceUSD - discountUSD);
      const taxUSD = round2((gross * taxRate) / 100);
      const totalUSD = round2(Math.max(0, gross + taxUSD));

      resolved.push({
        productId,
        presentationId,
        productName: productName as string,
        quantity,
        unitPriceUSD,
        discountUSD,
        taxRate,
        taxUSD,
        totalUSD,
        isService,
      });
    }

    return resolved;
  }

  private async persistItems(
    tx: Prisma.TransactionClient,
    saleId: string,
    items: ResolvedItem[],
  ): Promise<void> {
    for (const item of items) {
      await tx.saleItem.create({
        data: {
          saleId,
          productId: item.productId,
          presentationId: item.presentationId,
          productName: item.productName,
          quantity: item.quantity,
          unitPriceUSD: item.unitPriceUSD,
          discountUSD: item.discountUSD,
          taxRate: item.taxRate,
          totalUSD: item.totalUSD,
        },
      });
    }
  }

  /** Kardex: every sold unit leaves the stock with the sale number attached. */
  private async applyStock(
    scope: SaleScope,
    tx: Prisma.TransactionClient,
    items: ResolvedItem[],
    reference: string,
  ): Promise<void> {
    for (const item of items) {
      if (!item.productId || item.isService) continue;

      // Presentation sale: its own stock is the one that moves; the product
      // bulk and the Kardex stay untouched (v1 — presentations have no rows).
      if (item.presentationId) {
        const presentation = await tx.productPresentation.findFirst({
          where: { id: item.presentationId },
          select: { id: true, stock: true },
        });
        if (presentation) {
          await tx.productPresentation.update({
            where: { id: item.presentationId },
            data: { stock: round2(Number(presentation.stock ?? 0) - item.quantity) },
          });
        }
        continue;
      }

      const product = await tx.product.findFirst({
        where: { id: item.productId },
        select: { id: true, stock: true, status: true, isService: true },
      });
      if (!product) continue;

      const previousStock = Number(product.stock ?? 0);
      const nextStock = round2(previousStock - item.quantity);

      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          organizationId: scope.organizationId,
          createdById: scope.createdById ?? null,
          type: "SALE",
          quantity: item.quantity,
          previousStock,
          newStock: nextStock,
          reference,
          notes: null,
        },
      });

      await tx.product.update({
        where: { id: item.productId },
        data: {
          stock: nextStock,
          status:
            nextStock <= 0 && product.status !== ("ON_SALE" as any)
              ? ("OUT_OF_STOCK" as any)
              : product.status,
        },
      });
    }
  }

  /** Built-in business codes plus the tenant's own active methods (S1). */
  private async assertPaymentMethod(
    organizationId: string | null,
    code: string,
  ): Promise<void> {
    if (BUSINESS_PAYMENT_METHOD_CODES.includes(code)) return;
    if (!organizationId) {
      throw new BadRequestException(`Método de pago no reconocido: "${code}".`);
    }
    const custom = await this.prisma.tenantPaymentMethod.findFirst({
      where: { organizationId, code, active: true },
      select: { id: true },
    });
    if (!custom) {
      throw new BadRequestException(`Método de pago no reconocido: "${code}".`);
    }
  }

  private async persistPayments(
    tx: Prisma.TransactionClient,
    scope: SaleScope,
    saleId: string,
    cashShiftId: string | null,
    rates: RateSnapshot,
    inputs: unknown[],
  ): Promise<any[]> {
    const created: any[] = [];

    for (const input of inputs as Array<Record<string, any>>) {
      const amounts = buildPaymentAmounts(
        Number(input.amountOriginal),
        input.currency,
        rates,
      );

      const payment = await tx.salePayment.create({
        data: {
          saleId,
          cashShiftId,
          amountUSD: amounts.amountUSD,
          amountVES: amounts.amountVES,
          amountOriginal: amounts.amountOriginal,
          currency: input.currency,
          paymentMethod: input.paymentMethod,
          rateBcv: rates.rateBcv,
          rateUsdt: rates.rateUsdt,
          reference: input.reference?.trim() || null,
          paidAt: input.paidAt ? new Date(input.paidAt) : new Date(),
          notes: input.notes?.trim() || null,
          createdById: scope.createdById ?? null,
        },
      });

      created.push(payment);
    }

    return created;
  }

  private async addToClientBalance(
    tx: Prisma.TransactionClient,
    clientId: string,
    deltaUSD: number,
  ): Promise<void> {
    if (deltaUSD === 0) return;

    await tx.client.update({
      where: { id: clientId },
      data: { currentBalanceUSD: { increment: deltaUSD } },
    });
  }

  /**
   * Fire-and-forget business telemetry (S11). A public cart submission has no
   * actor, so it is intentionally not logged here.
   */
  private emitBusinessEvent(
    eventName: EventName,
    actorId: string | null | undefined,
    organizationId: string | null,
    payload: Record<string, unknown>,
  ): void {
    if (!this.eventEmitter || !actorId) return;

    emitEvent(this.eventEmitter, {
      eventName,
      actorId,
      orgId: organizationId,
      source: "api",
      payload,
    });
  }

}
