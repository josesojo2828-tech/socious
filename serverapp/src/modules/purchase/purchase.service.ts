import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { BUSINESS_PAYMENT_METHOD_CODES } from "src/shared/constants/payment-methods";
import { PrismaService } from "nestjs-prisma";
import { PaymentStatus, PurchaseStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { ExchangeService } from "../exchange/exchange.service";
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
  AddPurchasePaymentDto,
  CreatePurchaseDto,
  ListPurchasesQueryDto,
  PurchasePaymentInputDto,
  PurchasesReportQueryDto,
} from "./dto/purchase.dto";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

export interface PurchaseScope {
  organizationId: string | null;
  createdById?: string | null;
}

interface ResolvedItem {
  productId: string | null;
  productName: string;
  quantity: number;
  unitCostUSD: number;
  totalUSD: number;
}

/**
 * Purchases from suppliers (S8).
 *
 * Same accrual rule as sales: `issueDate` is when the purchase happened, every
 * payment keeps its own `paidAt`, and the frozen rates live on the document.
 * Stock only moves when the merchant marks the purchase as received.
 */
@Injectable()
export class PurchaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly exchangeService: ExchangeService,
    private readonly sequenceService: SequenceService,
    private readonly eventEmitter?: EventEmitter2,
  ) {}

  private scopeWhere(organizationId: string | null): Prisma.PurchaseWhereInput {
    return { organizationId, deletedAt: null };
  }

  /** Built-in codes plus the tenant's own active methods (S1). */
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

  async create(scope: PurchaseScope, data: CreatePurchaseDto) {
    for (const payment of data.payments ?? []) {
      await this.assertPaymentMethod(
        scope.organizationId,
        payment.paymentMethod,
      );
    }
    if (!data.items?.length) {
      throw new BadRequestException("La compra necesita al menos un artículo.");
    }

    const rates = await this.exchangeService.resolveRates(
      scope.organizationId,
      { rateBcv: data.rateBcv, rateUsdt: data.rateUsdt },
    );

    return this.prisma.$transaction(async (tx) => {
      const items = await this.resolveItems(scope, data.items, tx);

      const subtotalUSD = round2(
        items.reduce((sum, item) => sum + item.quantity * item.unitCostUSD, 0),
      );
      const totals = buildDocumentTotals({ subtotalUSD, taxUSD: 0 }, rates);

      const purchaseNumber = await this.sequenceService.nextFormatted(
        "PURCHASE",
        scope.organizationId,
        "COM",
        5,
        tx as SequenceDb,
      );

      const purchase = await tx.purchase.create({
        data: {
          purchaseNumber,
          organizationId: scope.organizationId,
          supplierId: data.supplierId ?? null,
          issueDate: data.issueDate ? new Date(data.issueDate) : new Date(),
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null,
          rateBcv: rates.rateBcv,
          rateUsdt: rates.rateUsdt,
          subtotalUSD: totals.subtotalUSD,
          taxUSD: totals.taxUSD,
          totalUSD: totals.totalUSD,
          totalVES: totals.totalVES,
          totalUSDT: totals.totalUSDT,
          status: PurchaseStatus.PENDING,
          paymentStatus: PaymentStatus.UNPAID,
          notes: data.notes?.trim() || null,
          createdById: scope.createdById ?? null,
        },
      });

      for (const item of items) {
        await tx.purchaseItem.create({
          data: {
            purchaseId: purchase.id,
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitCostUSD: item.unitCostUSD,
            totalUSD: item.totalUSD,
          },
        });
      }

      const payments = await this.persistPayments(
        tx,
        scope,
        purchase.id,
        rates,
        data.payments ?? [],
      );
      const paidUSD = round2(
        payments.reduce((sum, payment) => sum + Number(payment.amountUSD), 0),
      );

      await tx.purchase.update({
        where: { id: purchase.id },
        data: { paymentStatus: derivePaymentStatus(totals.totalUSD, paidUSD) },
      });

      if (data.supplierId) {
        await this.addToSupplierBalance(
          tx,
          data.supplierId,
          remainingBalance(totals.totalUSD, paidUSD),
        );
      }

      const created = await tx.purchase.findUnique({
        where: { id: purchase.id },
        include: { items: true, payments: true, supplier: true },
      });

      this.emitBusinessEvent(
        "erp.purchase.created",
        scope.createdById,
        scope.organizationId,
        {
          purchaseId: purchase.id,
          purchaseNumber: purchase.purchaseNumber,
          totalUSD: totals.totalUSD,
          supplierId: data.supplierId ?? null,
          count: items.length,
        },
      );

      return created;
    });
  }

  /**
   * Marks the purchase as received and books the stock entry in the kardex.
   * Receiving twice is refused: the units would be counted twice.
   */
  async receive(scope: PurchaseScope, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.findFirst({
        where: { id, ...this.scopeWhere(scope.organizationId) },
        include: { items: true },
      });
      if (!purchase) throw new NotFoundException("Compra no encontrada.");
      if (purchase.status === PurchaseStatus.RECEIVED) {
        throw new ConflictException("La compra ya fue recibida.");
      }
      if (purchase.status === PurchaseStatus.CANCELLED) {
        throw new ConflictException(
          "No se puede recibir una compra anulada.",
        );
      }

      for (const item of purchase.items) {
        if (!item.productId) continue;

        const product = await tx.product.findFirst({
          where: { id: item.productId, deletedAt: null },
        });
        if (!product || product.isService) continue;

        const previousStock = Number(product.stock ?? 0);
        const nextStock = round2(previousStock + Number(item.quantity));

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            organizationId: scope.organizationId,
            createdById: scope.createdById ?? null,
            type: "PURCHASE",
            quantity: Number(item.quantity),
            unitCostUSD: Number(item.unitCostUSD),
            previousStock,
            newStock: nextStock,
            reference: purchase.purchaseNumber,
            notes: null,
          },
        });

        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: nextStock,
            costPriceUSD: Number(item.unitCostUSD),
          },
        });
      }

      const received = await tx.purchase.update({
        where: { id: purchase.id },
        data: { status: PurchaseStatus.RECEIVED },
        include: { items: true },
      });

      this.emitBusinessEvent(
        "erp.purchase.received",
        scope.createdById,
        scope.organizationId,
        {
          purchaseId: purchase.id,
          purchaseNumber: purchase.purchaseNumber,
          count: purchase.items.length,
        },
      );

      return received;
    });
  }

  async addPayment(
    scope: PurchaseScope,
    id: string,
    data: AddPurchasePaymentDto,
  ) {
    await this.assertPaymentMethod(scope.organizationId, data.paymentMethod);
    return this.prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.findFirst({
        where: { id, ...this.scopeWhere(scope.organizationId) },
      });
      if (!purchase) throw new NotFoundException("Compra no encontrada.");
      if (purchase.status === PurchaseStatus.CANCELLED) {
        throw new ConflictException(
          "No se puede pagar una compra anulada.",
        );
      }

      const rates: RateSnapshot = {
        rateBcv: Number(purchase.rateBcv),
        rateUsdt: Number(purchase.rateUsdt),
      };

      const [payment] = await this.persistPayments(
        tx,
        scope,
        purchase.id,
        rates,
        [data],
      );

      const payments = await tx.purchasePayment.findMany({
        where: { purchaseId: purchase.id },
        select: { amountUSD: true },
      });
      const paidUSD = round2(
        payments.reduce((sum, row) => sum + Number(row.amountUSD), 0),
      );
      const paymentStatus = derivePaymentStatus(
        Number(purchase.totalUSD),
        paidUSD,
      );

      await tx.purchase.update({
        where: { id: purchase.id },
        data: { paymentStatus },
      });

      if (purchase.supplierId) {
        await this.addToSupplierBalance(
          tx,
          purchase.supplierId,
          -Number(payment.amountUSD),
        );
      }

      this.emitBusinessEvent(
        "erp.purchase.payment_made",
        scope.createdById,
        scope.organizationId,
        {
          purchaseId: purchase.id,
          purchaseNumber: purchase.purchaseNumber,
          amount: Number(payment.amountUSD),
          currency: payment.currency,
          paymentMethod: payment.paymentMethod,
        },
      );

      return { payment, paymentStatus, paidUSD };
    });
  }

  async cancel(scope: PurchaseScope, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.findFirst({
        where: { id, ...this.scopeWhere(scope.organizationId) },
      });
      if (!purchase) throw new NotFoundException("Compra no encontrada.");
      if (purchase.status === PurchaseStatus.CANCELLED) {
        throw new ConflictException("La compra ya está anulada.");
      }
      if (purchase.status === PurchaseStatus.RECEIVED) {
        throw new ConflictException(
          "La compra ya fue recibida y su stock ya movió: anularla revertiría el inventario.",
        );
      }

      const paidAgg = await tx.purchasePayment.aggregate({
        _sum: { amountUSD: true },
        where: { purchaseId: purchase.id },
      });

      if (purchase.supplierId) {
        await this.addToSupplierBalance(
          tx,
          purchase.supplierId,
          remainingBalance(Number(purchase.totalUSD), Number(paidAgg._sum.amountUSD ?? 0)),
        );
      }

      return tx.purchase.update({
        where: { id: purchase.id },
        data: { status: PurchaseStatus.CANCELLED },
      });
    });
  }

  async list(scope: PurchaseScope, query: ListPurchasesQueryDto) {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(Math.max(query.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);

    const filters: Prisma.PurchaseWhereInput[] = [
      this.scopeWhere(scope.organizationId),
    ];

    if (query.supplierId) filters.push({ supplierId: query.supplierId });
    if (query.status) filters.push({ status: query.status });
    if (query.paymentStatus) {
      filters.push({ paymentStatus: query.paymentStatus });
    }

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
          { purchaseNumber: { contains: q, mode: "insensitive" } },
          { notes: { contains: q, mode: "insensitive" } },
          { supplier: { name: { contains: q, mode: "insensitive" } } },
        ],
      });
    }

    const where: Prisma.PurchaseWhereInput = { AND: filters };
    const [list, total] = await Promise.all([
      this.prisma.purchase.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { issueDate: "desc" },
        include: {
          supplier: { select: { id: true, name: true } },
          items: true,
          payments: { orderBy: { paidAt: "desc" } },
        },
      }),
      this.prisma.purchase.count({ where }),
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

  async getOne(scope: PurchaseScope, id: string) {
    const purchase = await this.prisma.purchase.findFirst({
      where: { id, ...this.scopeWhere(scope.organizationId) },
      include: {
        items: true,
        payments: { orderBy: { paidAt: "desc" } },
        supplier: true,
      },
    });

    if (!purchase) throw new NotFoundException("Compra no encontrada.");
    return purchase;
  }

  /** Payables: what was purchased per month vs what was paid per month. */
  async getReport(scope: PurchaseScope, query: PurchasesReportQueryDto) {
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;
    const issueRange = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };

    const [accrued, paid, purchases, unpaid] = await Promise.all([
      this.prisma.purchase.findMany({
        where: {
          ...this.scopeWhere(scope.organizationId),
          issueDate: issueRange,
          status: { not: PurchaseStatus.CANCELLED },
        },
        select: { issueDate: true, totalUSD: true },
      }),
      this.prisma.purchasePayment.findMany({
        where: {
          purchase: this.scopeWhere(scope.organizationId),
          paidAt: issueRange,
        },
        select: { paidAt: true, amountUSD: true },
      }),
      this.prisma.purchase.aggregate({
        where: {
          ...this.scopeWhere(scope.organizationId),
          issueDate: issueRange,
          status: { not: PurchaseStatus.CANCELLED },
        },
        _sum: { totalUSD: true, totalVES: true, totalUSDT: true },
        _count: { id: true },
      }),
      this.prisma.purchase.findMany({
        where: {
          ...this.scopeWhere(scope.organizationId),
          status: { not: PurchaseStatus.CANCELLED },
          paymentStatus: { in: [PaymentStatus.UNPAID, PaymentStatus.PARTIAL] },
        },
        select: {
          id: true,
          purchaseNumber: true,
          issueDate: true,
          dueDate: true,
          totalUSD: true,
          supplier: { select: { id: true, name: true } },
        },
        orderBy: { issueDate: "asc" },
        take: 200,
      }),
    ]);

    const monthKey = (date: Date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    const accrualByMonth = new Map<string, { totalUSD: number; count: number }>();
    for (const row of accrued) {
      const key = monthKey(new Date(row.issueDate));
      const bucket = accrualByMonth.get(key) ?? { totalUSD: 0, count: 0 };
      bucket.totalUSD = round2(bucket.totalUSD + Number(row.totalUSD));
      bucket.count += 1;
      accrualByMonth.set(key, bucket);
    }

    const paymentsByMonth = new Map<string, { totalUSD: number; count: number }>();
    for (const row of paid) {
      const key = monthKey(new Date(row.paidAt));
      const bucket = paymentsByMonth.get(key) ?? { totalUSD: 0, count: 0 };
      bucket.totalUSD = round2(bucket.totalUSD + Number(row.amountUSD));
      bucket.count += 1;
      paymentsByMonth.set(key, bucket);
    }

    const today = new Date();
    const aging = { current: 0, days1_30: 0, days31_60: 0, over60: 0 };

    const openItems = unpaid.map((row) => {
      const due = row.dueDate ? new Date(row.dueDate) : new Date(row.issueDate);
      const days = Math.floor((today.getTime() - due.getTime()) / 86_400_000);
      const amount = Number(row.totalUSD);
      if (days <= 0) aging.current = round2(aging.current + amount);
      else if (days <= 30) aging.days1_30 = round2(aging.days1_30 + amount);
      else if (days <= 60) aging.days31_60 = round2(aging.days31_60 + amount);
      else aging.over60 = round2(aging.over60 + amount);

      return {
        id: row.id,
        purchaseNumber: row.purchaseNumber,
        issueDate: row.issueDate,
        dueDate: row.dueDate,
        totalUSD: Number(row.totalUSD),
        daysOverdue: Math.max(0, days),
        supplier: row.supplier,
      };
    });

    return {
      issued: {
        count: purchases._count.id,
        totalUSD: Number(purchases._sum.totalUSD ?? 0),
        totalVES: Number(purchases._sum.totalVES ?? 0),
        totalUSDT: Number(purchases._sum.totalUSDT ?? 0),
      },
      accrualByMonth: [...accrualByMonth.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, value]) => ({ month, ...value })),
      paymentsByMonth: [...paymentsByMonth.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, value]) => ({ month, ...value })),
      aging,
      openItems,
    };
  }

  // ------------------------------------------------------------------
  // Internals
  // ------------------------------------------------------------------

  private async resolveItems(
    scope: PurchaseScope,
    inputs: CreatePurchaseDto["items"],
    tx: Prisma.TransactionClient,
  ): Promise<ResolvedItem[]> {
    const resolved: ResolvedItem[] = [];

    for (const input of inputs) {
      const quantity = Number(input.quantity);
      const unitCostUSD = Number(input.unitCostUSD);
      let productName = input.productName?.trim();
      let productId: string | null = input.productId ?? null;

      if (productId) {
        const product = await tx.product.findFirst({
          where: {
            id: productId,
            organizationId: scope.organizationId,
            deletedAt: null,
          },
          select: { id: true, name: true },
        });

        if (!product) {
          throw new NotFoundException(
            `El producto "${productName ?? productId}" no existe en tu catálogo.`,
          );
        }
        productName = product.name;
        productId = product.id;
      } else if (!productName) {
        throw new BadRequestException("Cada artículo necesita un nombre.");
      }

      resolved.push({
        productId,
        productName: productName as string,
        quantity,
        unitCostUSD,
        totalUSD: round2(quantity * unitCostUSD),
      });
    }

    return resolved;
  }

  private async persistPayments(
    tx: Prisma.TransactionClient,
    scope: PurchaseScope,
    purchaseId: string,
    rates: RateSnapshot,
    inputs: unknown[],
  ): Promise<any[]> {
    const created: any[] = [];

    for (const input of inputs as PurchasePaymentInputDto[]) {
      const amounts = buildPaymentAmounts(
        Number(input.amountOriginal),
        input.currency,
        rates,
      );

      const payment = await tx.purchasePayment.create({
        data: {
          purchaseId,
          cashShiftId: input.cashShiftId ?? null,
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

  private async addToSupplierBalance(
    tx: Prisma.TransactionClient,
    supplierId: string,
    deltaUSD: number,
  ): Promise<void> {
    if (deltaUSD === 0) return;

    await tx.supplier.update({
      where: { id: supplierId },
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
