import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  EntitlementStatus,
  Invoice,
  InvoiceLineType,
  InvoiceStatus,
  Prisma,
  SubscriptionStatus,
  TransactionStatus,
  TransactionType,
} from "@prisma/client";
import { PrismaService } from "nestjs-prisma";

/** Seats included in the base plan before the per-seat surcharge applies. */
export const INCLUDED_SEATS = 5;

/** Monthly price (USD) for every seat above {@link INCLUDED_SEATS}. */
export const SEAT_PRICE_USD = 12;

/** How many days after issuance an invoice is due. */
export const INVOICE_DUE_DAYS = 5;

/**
 * Default business time zone used to derive the monthly period key. The invoice
 * engine bills in the owner's calendar month, not the server's UTC month, so a
 * run at 00:00 UTC on the 1st of October still bills September for a UTC-4
 * deployment. Override with `BILLING_TIMEZONE`.
 */
export const BILLING_TIME_ZONE_DEFAULT = "America/Caracas";

export interface ActiveAddOnInput {
  entitlementId: string;
  addOnId: string;
  addOnName: string;
  quantity: number;
  /** Unit price locked in at purchase time (`Entitlement.priceAtPurchase`). */
  unitPrice: number;
}

export interface InvoiceTotalsInput {
  /** Base plan display name. Omit for personal invoices with no base plan. */
  planName?: string;
  /** Base plan monthly price. Omit for personal invoices with no base plan. */
  planPrice?: number;
  /** Seat allowance for the owner. Personal invoices pass 0 (no seats). */
  maxSeats?: number;
  includedSeats?: number;
  seatPrice?: number;
  addOns: ActiveAddOnInput[];
}

export interface InvoiceLineDraft {
  type: InvoiceLineType;
  refId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  addOnId: string | null;
}

export interface InvoiceTotals {
  lines: InvoiceLineDraft[];
  subtotal: number;
  total: number;
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Pure totals calculator for a monthly invoice: base plan + seat surcharge +
 * active add-ons. No I/O — safe to unit test in isolation.
 */
export function computeInvoiceTotals(input: InvoiceTotalsInput): InvoiceTotals {
  const includedSeats = input.includedSeats ?? INCLUDED_SEATS;
  const seatPrice = input.seatPrice ?? SEAT_PRICE_USD;

  const lines: InvoiceLineDraft[] = [];

  if (input.planName !== undefined && input.planPrice !== undefined) {
    const planPrice = round2(input.planPrice);
    lines.push({
      type: InvoiceLineType.BASE_PLAN,
      refId: null,
      description: `Plan ${input.planName}`,
      quantity: 1,
      unitPrice: planPrice,
      amount: planPrice,
      addOnId: null,
    });
  }

  const extraSeats = Math.max(0, (input.maxSeats ?? 0) - includedSeats);
  if (extraSeats > 0) {
    const amount = round2(extraSeats * seatPrice);
    lines.push({
      type: InvoiceLineType.SEAT,
      refId: null,
      description: `${extraSeats} cupo(s) extra`,
      quantity: extraSeats,
      unitPrice: round2(seatPrice),
      amount,
      addOnId: null,
    });
  }

  for (const addOn of input.addOns) {
    const quantity = Math.max(0, addOn.quantity);
    if (quantity === 0) continue;
    const unitPrice = round2(addOn.unitPrice);
    lines.push({
      type: InvoiceLineType.ADDON,
      refId: addOn.entitlementId,
      description: addOn.addOnName,
      quantity,
      unitPrice,
      amount: round2(quantity * unitPrice),
      addOnId: addOn.addOnId,
    });
  }

  const subtotal = round2(lines.reduce((acc, line) => acc + line.amount, 0));

  return { lines, subtotal, total: subtotal };
}

/** First instant of the month (UTC) — the stable invoice period key. */
export function monthStartUtc(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0),
  );
}

/** First instant of the following month (UTC) — exclusive period end. */
export function monthEndUtc(periodStart: Date): Date {
  return new Date(
    Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth() + 1, 1),
  );
}

/**
 * Resolves the first instant of the month that `date` falls into **in the given
 * time zone**, returned as a UTC-midnight Date (the period key stored on
 * `Invoice.periodStart`). This keeps the monthly billing boundary aligned with
 * the business calendar regardless of where the server runs. Falls back to UTC
 * for an invalid/unsupported time zone.
 */
export function monthStartInTimeZone(
  date: Date,
  timeZone: string = BILLING_TIME_ZONE_DEFAULT,
): Date {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "numeric",
    }).formatToParts(date);
    const year = Number(parts.find((part) => part.type === "year")?.value);
    const month = Number(parts.find((part) => part.type === "month")?.value);
    if (!Number.isFinite(year) || !Number.isFinite(month)) {
      return monthStartUtc(date);
    }
    return new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  } catch {
    return monthStartUtc(date);
  }
}

/** `YYYY-MM` label for a period key — used in structured logs. */
export function formatPeriodKey(periodStart: Date): string {
  const month = String(periodStart.getUTCMonth() + 1).padStart(2, "0");
  return `${periodStart.getUTCFullYear()}-${month}`;
}

export type InvoiceWithLines = Prisma.InvoiceGetPayload<{
  include: { lines: true };
}>;

export interface InvoiceHistoryQuery {
  /** Organization owner filter. Takes precedence over `userId`. */
  organizationId?: string | null;
  /** Personal owner filter (requires `organizationId` to be empty). */
  userId?: string | null;
  /** Convenience `YYYY-MM` period filter. */
  period?: string;
  /** Inclusive lower bound on `periodStart`. */
  from?: Date;
  /** Exclusive upper bound on `periodStart`. */
  to?: Date;
  status?: InvoiceStatus;
  page?: number;
  limit?: number;
}

export interface InvoiceHistoryResult {
  list: InvoiceWithLines[];
  total: number;
  totalRecords: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  hasPrev: boolean;
  hasNext: boolean;
}

export interface MonthlyBillingError {
  ownerType: "organization" | "user";
  ownerId: string;
  message: string;
}

export interface MonthlyBillingSummary {
  periodStart: Date;
  periodEnd: Date;
  periodKey: string;
  organizations: number;
  personalOwners: number;
  issued: number;
  settled: number;
  pending: number;
  failed: number;
  errors: MonthlyBillingError[];
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "P2002"
  );
}

function buildPeriodFilter(
  query: InvoiceHistoryQuery,
): Prisma.DateTimeFilter | undefined {
  if (query.period) {
    const match = /^(\d{4})-(\d{2})$/.exec(query.period);
    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]);
      const start = new Date(Date.UTC(year, month - 1, 1));
      const end = new Date(Date.UTC(year, month, 1));
      return { gte: start, lt: end };
    }
  }

  if (query.from || query.to) {
    const filter: Prisma.DateTimeFilter = {};
    if (query.from) filter.gte = query.from;
    if (query.to) filter.lt = query.to;
    return filter;
  }

  return undefined;
}

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Idempotently issues the monthly invoice for an organization.
   *
   * The `(organizationId, periodStart) WHERE organizationId IS NOT NULL` partial
   * unique index is the source of truth: if an invoice already exists for the
   * period it is returned as-is, and a concurrent create that loses the race is
   * recovered by returning the winner. Returns `null` when the org has no ACTIVE
   * subscription.
   */
  async generateMonthlyInvoice(
    organizationId: string,
    periodStartInput: Date,
  ): Promise<Invoice | null> {
    const periodStart = monthStartUtc(periodStartInput);
    const periodEnd = monthEndUtc(periodStart);

    const org = await this.prisma.organization.findFirst({
      where: { id: organizationId, deletedAt: null },
      include: {
        subscriptions: {
          where: { status: SubscriptionStatus.ACTIVE },
          include: { plan: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!org) {
      throw new NotFoundException(
        `Organización ${organizationId} no encontrada`,
      );
    }

    const subscription = org.subscriptions[0];
    if (!subscription) return null;

    const existing = await this.findInvoiceForPeriod(
      organizationId,
      periodStart,
    );
    if (existing) return existing;

    const entitlements = await this.prisma.entitlement.findMany({
      where: {
        organizationId,
        status: EntitlementStatus.ACTIVE,
        deletedAt: null,
        startDate: { lte: periodEnd },
        OR: [{ endDate: null }, { endDate: { gt: periodStart } }],
      },
      include: { addOn: true },
    });

    const totals = computeInvoiceTotals({
      planName: subscription.plan.name,
      planPrice: Number(subscription.plan.price),
      maxSeats: org.maxSeats,
      addOns: entitlements.map((entitlement) => ({
        entitlementId: entitlement.id,
        addOnId: entitlement.addOnId,
        addOnName: entitlement.addOn?.name ?? entitlement.addOnId,
        quantity: entitlement.quantity,
        unitPrice: Number(entitlement.priceAtPurchase),
      })),
    });

    const dueDate = new Date(periodStart);
    dueDate.setUTCDate(dueDate.getUTCDate() + INVOICE_DUE_DAYS);

    try {
      return await this.prisma.invoice.create({
        data: {
          organizationId,
          periodStart,
          periodEnd,
          status: InvoiceStatus.ISSUED,
          subtotal: totals.subtotal,
          total: totals.total,
          currency: subscription.plan.currency || "USD",
          dueDate,
          issuedAt: new Date(),
          payerUserId: subscription.userId,
          lines: {
            create: totals.lines.map((line) => ({
              type: line.type,
              refId: line.refId,
              description: line.description,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              amount: line.amount,
              addOnId: line.addOnId,
            })),
          },
        },
        include: { lines: true },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        const winner = await this.findInvoiceForPeriod(
          organizationId,
          periodStart,
        );
        if (winner) return winner;
      }
      throw error;
    }
  }

  /**
   * Idempotently issues the monthly invoice for a PERSONAL payer: a user's own
   * active add-ons (and their personal base plan, when one exists) billed to
   * their own wallet (A1 rule).
   *
   * The `(userId, periodStart) WHERE organizationId IS NULL` partial unique
   * index is the source of truth; a concurrent create that loses the race is
   * recovered by returning the winner. Returns `null` when the user has neither
   * a personal entitlement nor a personal ACTIVE subscription for the period.
   */
  async generatePersonalInvoice(
    userId: string,
    periodStartInput: Date,
  ): Promise<Invoice | null> {
    const periodStart = monthStartUtc(periodStartInput);
    const periodEnd = monthEndUtc(periodStart);

    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: {
        subscriptions: {
          where: {
            organizationId: null,
            status: SubscriptionStatus.ACTIVE,
          },
          include: { plan: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`Usuario ${userId} no encontrado`);
    }

    const existing = await this.findPersonalInvoiceForPeriod(
      userId,
      periodStart,
    );
    if (existing) return existing;

    const entitlements = await this.prisma.entitlement.findMany({
      where: {
        organizationId: null,
        userId,
        status: EntitlementStatus.ACTIVE,
        deletedAt: null,
        startDate: { lte: periodEnd },
        OR: [{ endDate: null }, { endDate: { gt: periodStart } }],
      },
      include: { addOn: true },
    });

    const subscription = user.subscriptions[0];
    if (!subscription && entitlements.length === 0) return null;

    const totals = computeInvoiceTotals({
      planName: subscription?.plan?.name,
      planPrice: subscription ? Number(subscription.plan.price) : undefined,
      maxSeats: 0,
      addOns: entitlements.map((entitlement) => ({
        entitlementId: entitlement.id,
        addOnId: entitlement.addOnId,
        addOnName: entitlement.addOn?.name ?? entitlement.addOnId,
        quantity: entitlement.quantity,
        unitPrice: Number(entitlement.priceAtPurchase),
      })),
    });

    const dueDate = new Date(periodStart);
    dueDate.setUTCDate(dueDate.getUTCDate() + INVOICE_DUE_DAYS);

    try {
      return await this.prisma.invoice.create({
        data: {
          organizationId: null,
          userId,
          periodStart,
          periodEnd,
          status: InvoiceStatus.ISSUED,
          subtotal: totals.subtotal,
          total: totals.total,
          currency: subscription?.plan?.currency || "USD",
          dueDate,
          issuedAt: new Date(),
          payerUserId: userId,
          lines: {
            create: totals.lines.map((line) => ({
              type: line.type,
              refId: line.refId,
              description: line.description,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              amount: line.amount,
              addOnId: line.addOnId,
            })),
          },
        },
        include: { lines: true },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        const winner = await this.findPersonalInvoiceForPeriod(
          userId,
          periodStart,
        );
        if (winner) return winner;
      }
      throw error;
    }
  }

  /**
   * Settles an invoice in ONE `prisma.$transaction`: debit the A1 payer wallet,
   * record a `Transaction` scoped to the organization, renew the owner's
   * subscription, write a `FinancialAuditLog` and mark the invoice PAID.
   * All-or-nothing.
   *
   * **Renewal ownership**: this method is the SINGLE owner of
   * `Subscription.endDate` extension. On a successful settlement the owner's
   * active subscription is renewed to at least `Invoice.periodEnd` (and its
   * status restored to ACTIVE, clearing grace/read-only markers). The legacy
   * daily job no longer debits nor extends `endDate`; it only drives the
   * warning/grace/expiry lifecycle when a month is not settled.
   *
   * Idempotent: an already-PAID invoice is returned untouched (so the
   * subscription is never renewed twice for the same period).
   */
  async settleInvoice(invoiceId: string): Promise<Invoice> {
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId },
        include: { lines: true },
      });

      if (!invoice) {
        throw new NotFoundException(`Factura ${invoiceId} no encontrada`);
      }
      if (invoice.status === InvoiceStatus.PAID) return invoice;
      if (invoice.status === InvoiceStatus.VOID) {
        throw new BadRequestException(
          `Factura ${invoiceId} anulada: no se puede liquidar`,
        );
      }

      const payerUserId = await this.resolvePayerUserId(tx, {
        organizationId: invoice.organizationId,
        personalUserId: invoice.userId,
      });
      const total = Number(invoice.total);

      const wallet = await tx.userWallet.findFirst({
        where: { userId: payerUserId, deletedAt: null },
      });
      if (!wallet) {
        throw new BadRequestException(
          `El pagador ${payerUserId} no tiene billetera`,
        );
      }
      if (Number(wallet.balance) < total) {
        throw new BadRequestException(
          `Saldo insuficiente: se requieren ${total} ${invoice.currency}`,
        );
      }

      const paymentMethod = await tx.userPaymentMethod.findFirst({
        where: { userId: payerUserId, active: true, deletedAt: null },
        orderBy: { isDefault: "desc" },
      });
      if (!paymentMethod) {
        throw new BadRequestException(
          `El pagador ${payerUserId} no tiene un método de pago activo`,
        );
      }

      await tx.userWallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: total } },
      });

      await tx.transaction.create({
        data: {
          userId: payerUserId,
          paymentMethodId: paymentMethod.id,
          type: TransactionType.PAYMENT,
          amount: total,
          currency: invoice.currency,
          description: `Pago factura ${invoice.periodStart.toISOString().slice(0, 10)}`,
          status: TransactionStatus.SUCCESS,
          organizationId: invoice.organizationId,
        },
      });

      await this.renewSubscription(tx, {
        organizationId: invoice.organizationId,
        personalUserId: invoice.userId,
        periodEnd: invoice.periodEnd,
      });

      await tx.financialAuditLog.create({
        data: {
          action: "INVOICE_PAID",
          entityType: "Invoice",
          entityId: invoice.id,
          actorId: payerUserId,
          amount: total,
          metadata: {
            organizationId: invoice.organizationId,
            userId: invoice.userId,
            periodStart: invoice.periodStart.toISOString(),
            periodEnd: invoice.periodEnd.toISOString(),
            lineCount: invoice.lines.length,
          },
        },
      });

      return tx.invoice.update({
        where: { id: invoice.id },
        data: { status: InvoiceStatus.PAID, paidAt: new Date() },
      });
    });
  }

  /**
   * Records a terminal settlement failure on an invoice (status → FAILED) and
   * writes an audit trail. No-op for PAID/VOID invoices so a late failure can
   * never downgrade a settled month. Never throws — the caller is already inside
   * a per-owner error handler.
   */
  async markInvoiceFailed(invoiceId: string, reason: string): Promise<void> {
    try {
      const invoice = await this.prisma.invoice.findUnique({
        where: { id: invoiceId },
        select: { id: true, status: true },
      });
      if (
        !invoice ||
        invoice.status === InvoiceStatus.PAID ||
        invoice.status === InvoiceStatus.VOID
      ) {
        return;
      }

      await this.prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: InvoiceStatus.FAILED },
      });

      await this.prisma.financialAuditLog.create({
        data: {
          action: "INVOICE_PAYMENT_FAILED",
          entityType: "Invoice",
          entityId: invoiceId,
          metadata: { reason },
        },
      });
    } catch (error) {
      this.logger.error(
        `No se pudo marcar la factura ${invoiceId} como FAILED: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Unified monthly billing pass — the SINGLE billing path. For every owner
   * (organization and personal) with an ACTIVE subscription or active
   * entitlement it idempotently issues the monthly invoice and, when
   * `autoRenew` is enabled, settles it from the owner's wallet.
   *
   * Hardening guarantees:
   *   * Per-owner error isolation: one failure is recorded and the run continues.
   *   * Idempotency: re-running within the same period never duplicates invoices
   *     nor renews a subscription twice (settlement skips PAID invoices).
   *   * Timezone-aware period keys: callers pass the period from
   *     {@link monthStartInTimeZone}.
   */
  async runMonthlyBilling(
    periodStartInput: Date,
  ): Promise<MonthlyBillingSummary> {
    const periodStart = monthStartUtc(periodStartInput);
    const periodEnd = monthEndUtc(periodStart);

    const summary: MonthlyBillingSummary = {
      periodStart,
      periodEnd,
      periodKey: formatPeriodKey(periodStart),
      organizations: 0,
      personalOwners: 0,
      issued: 0,
      settled: 0,
      pending: 0,
      failed: 0,
      errors: [],
    };

    // --- Organizations -----------------------------------------------------
    const orgSubscriptions = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        organizationId: { not: null },
      },
      select: { organizationId: true, autoRenew: true },
      orderBy: { createdAt: "desc" },
    });

    const orgAutoRenew = new Map<string, boolean>();
    for (const subscription of orgSubscriptions) {
      if (
        subscription.organizationId &&
        !orgAutoRenew.has(subscription.organizationId)
      ) {
        orgAutoRenew.set(subscription.organizationId, subscription.autoRenew);
      }
    }
    summary.organizations = orgAutoRenew.size;

    for (const [organizationId, autoRenew] of orgAutoRenew) {
      try {
        const invoice = await this.generateMonthlyInvoice(
          organizationId,
          periodStart,
        );
        await this.settleOrDefer(invoice, autoRenew, {
          ownerType: "organization",
          ownerId: organizationId,
          summary,
        });
      } catch (error) {
        summary.failed++;
        const message = error instanceof Error ? error.message : String(error);
        summary.errors.push({
          ownerType: "organization",
          ownerId: organizationId,
          message,
        });
        this.logger.error(
          JSON.stringify({
            event: "billing.owner.failed",
            ownerType: "organization",
            ownerId: organizationId,
            period: summary.periodKey,
            message,
          }),
        );
      }
    }

    // --- Personal owners ---------------------------------------------------
    const personalSubscriptions = await this.prisma.subscription.findMany({
      where: { status: SubscriptionStatus.ACTIVE, organizationId: null },
      select: { userId: true, autoRenew: true },
      orderBy: { createdAt: "desc" },
    });

    const personalAutoRenew = new Map<string, boolean>();
    for (const subscription of personalSubscriptions) {
      if (!personalAutoRenew.has(subscription.userId)) {
        personalAutoRenew.set(subscription.userId, subscription.autoRenew);
      }
    }

    const personalEntitlementOwners = await this.prisma.entitlement.findMany({
      where: {
        organizationId: null,
        userId: { not: null },
        status: EntitlementStatus.ACTIVE,
        deletedAt: null,
      },
      select: { userId: true },
      distinct: ["userId"],
    });

    const personalOwnerIds = new Set<string>(personalAutoRenew.keys());
    for (const owner of personalEntitlementOwners) {
      if (owner.userId) personalOwnerIds.add(owner.userId);
    }
    summary.personalOwners = personalOwnerIds.size;

    for (const userId of personalOwnerIds) {
      try {
        const invoice = await this.generatePersonalInvoice(userId, periodStart);
        await this.settleOrDefer(
          invoice,
          personalAutoRenew.get(userId) ?? true,
          {
            ownerType: "user",
            ownerId: userId,
            summary,
          },
        );
      } catch (error) {
        summary.failed++;
        const message = error instanceof Error ? error.message : String(error);
        summary.errors.push({ ownerType: "user", ownerId: userId, message });
        this.logger.error(
          JSON.stringify({
            event: "billing.owner.failed",
            ownerType: "user",
            ownerId: userId,
            period: summary.periodKey,
            message,
          }),
        );
      }
    }

    return summary;
  }

  /**
   * Paginated, filterable billing history by owner (organization OR user),
   * period and status. Returns the full `InvoiceLine` breakdown for each invoice
   * so the billing page can render concepts without an N+1 lookup.
   */
  async listInvoices(
    query: InvoiceHistoryQuery,
  ): Promise<InvoiceHistoryResult> {
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const page = query.page && query.page > 0 ? query.page : 1;
    const skip = (page - 1) * limit;

    const where: Prisma.InvoiceWhereInput = {};
    if (query.organizationId) {
      where.organizationId = query.organizationId;
    } else if (query.userId) {
      where.organizationId = null;
      where.userId = query.userId;
    }
    if (query.status) where.status = query.status;

    const periodFilter = buildPeriodFilter(query);
    if (periodFilter) where.periodStart = periodFilter;

    const [list, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: { lines: true },
        orderBy: [{ periodStart: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
      this.prisma.invoice.count({ where }),
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

  /** Full invoice (with its lines) by id — used by the history detail route. */
  async getInvoiceById(invoiceId: string): Promise<InvoiceWithLines | null> {
    return this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { lines: true },
    });
  }

  /**
   * Shared per-owner settlement decision used by {@link runMonthlyBilling}:
   * count the issued invoice, settle it when auto-renew is on, or leave it
   * pending for manual payment. Settlement failures mark the invoice FAILED
   * without aborting the run.
   */
  private async settleOrDefer(
    invoice: Invoice | null,
    autoRenew: boolean,
    context: {
      ownerType: "organization" | "user";
      ownerId: string;
      summary: MonthlyBillingSummary;
    },
  ): Promise<void> {
    const { summary, ownerType, ownerId } = context;
    if (!invoice) return;

    summary.issued++;

    if (invoice.status === InvoiceStatus.PAID) {
      summary.settled++;
      return;
    }

    if (!autoRenew) {
      summary.pending++;
      this.logger.log(
        JSON.stringify({
          event: "billing.owner.pending",
          ownerType,
          ownerId,
          period: summary.periodKey,
          reason: "auto_renew_disabled",
        }),
      );
      return;
    }

    try {
      await this.settleInvoice(invoice.id);
      summary.settled++;
    } catch (error) {
      summary.failed++;
      const message = error instanceof Error ? error.message : String(error);
      summary.errors.push({ ownerType, ownerId, message });
      await this.markInvoiceFailed(invoice.id, message);
      this.logger.error(
        JSON.stringify({
          event: "billing.owner.failed",
          ownerType,
          ownerId,
          period: summary.periodKey,
          invoiceId: invoice.id,
          message,
        }),
      );
    }
  }

  /**
   * A1 payer anchor: for an organization, the payer is the active
   * `Subscription.userId` (CLINIC_ADMIN); for a personal entitlement, the owner
   * user.
   */
  private async resolvePayerUserId(
    tx: Prisma.TransactionClient,
    owner: { organizationId?: string | null; personalUserId?: string | null },
  ): Promise<string> {
    if (owner.organizationId) {
      const subscription = await tx.subscription.findFirst({
        where: {
          organizationId: owner.organizationId,
          status: SubscriptionStatus.ACTIVE,
        },
        orderBy: { createdAt: "desc" },
        select: { userId: true },
      });
      if (!subscription) {
        throw new BadRequestException(
          `La organización ${owner.organizationId} no tiene suscripción activa`,
        );
      }
      return subscription.userId;
    }

    if (owner.personalUserId) return owner.personalUserId;

    throw new BadRequestException(
      "No se pudo resolver el pagador: falta organización o usuario",
    );
  }

  /**
   * Renews the owner's active subscription to at least the paid period end. This
   * is the ONLY place `Subscription.endDate` is extended (single-owner rule).
   * Returns `null` when the owner has no active subscription (e.g. a personal
   * add-on-only invoice).
   */
  private async renewSubscription(
    tx: Prisma.TransactionClient,
    owner: {
      organizationId?: string | null;
      personalUserId?: string | null;
      periodEnd: Date;
    },
  ): Promise<{ subscriptionId: string; newEndDate: Date } | null> {
    let subscription: { id: string; endDate: Date | null } | null = null;

    if (owner.organizationId) {
      subscription = await tx.subscription.findFirst({
        where: {
          organizationId: owner.organizationId,
          status: SubscriptionStatus.ACTIVE,
        },
        orderBy: { createdAt: "desc" },
        select: { id: true, endDate: true },
      });
    } else if (owner.personalUserId) {
      subscription = await tx.subscription.findFirst({
        where: {
          userId: owner.personalUserId,
          organizationId: null,
          status: SubscriptionStatus.ACTIVE,
        },
        orderBy: { createdAt: "desc" },
        select: { id: true, endDate: true },
      });
    }

    if (!subscription) return null;

    const currentEnd = subscription.endDate
      ? new Date(subscription.endDate)
      : null;
    const newEndDate =
      !currentEnd || currentEnd.getTime() < owner.periodEnd.getTime()
        ? owner.periodEnd
        : currentEnd;

    await tx.subscription.update({
      where: { id: subscription.id },
      data: {
        status: SubscriptionStatus.ACTIVE,
        endDate: newEndDate,
        gracePeriodEndsAt: null,
        readOnlyEndsAt: null,
      },
    });

    return { subscriptionId: subscription.id, newEndDate };
  }

  private findInvoiceForPeriod(
    organizationId: string,
    periodStart: Date,
  ): Promise<Invoice | null> {
    return this.prisma.invoice.findFirst({
      where: { organizationId, periodStart },
      include: { lines: true },
    });
  }

  private findPersonalInvoiceForPeriod(
    userId: string,
    periodStart: Date,
  ): Promise<Invoice | null> {
    return this.prisma.invoice.findFirst({
      where: { organizationId: null, userId, periodStart },
      include: { lines: true },
    });
  }
}
