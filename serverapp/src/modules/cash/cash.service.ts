import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import type { Prisma } from "@prisma/client";
import { TenantSettingsService } from "src/shared/services/tenant-settings.service";
import { round2 } from "src/shared/utils/money";
import {
  CreateCashMovementDto,
  CreateCashRegisterDto,
  ListShiftsQueryDto,
  OpenShiftDto,
  CloseShiftDto,
  UpdateCashRegisterDto,
} from "./dto/cash.dto";

import { EventEmitter2 } from "@nestjs/event-emitter";
import { emitEvent } from "src/shared/event/event-envelope";
import type { EventName } from "src/shared/event/event-taxonomy";
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

export interface CashScope {
  organizationId: string | null;
  userId?: string | null;
}

/**
 * Cash registers, shifts and manual movements (S7 support).
 *
 * A shift's `expectedAmountUSD` is the system view: opening float plus every
 * cash movement, plus the sale payments collected in the shift, minus the
 * supplier payments made from it. The difference against the blind count is
 * what the owner reviews at close.
 */
@Injectable()
export class CashService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantSettings: TenantSettingsService,
    private readonly eventEmitter?: EventEmitter2,
  ) {}

  /**
   * Shift control is a tenant choice (S2): an entrepreneur keeps the cash
   * register always active and never opens or closes turns. Opening while the
   * check is off is refused with an actionable message; closing an existing
   * shift stays allowed so a tenant can turn the check off and still close the
   * turn that was left open.
   */
  private async assertShiftControlEnabled(
    organizationId: string | null,
  ): Promise<void> {
    const settings = await this.tenantSettings.get(organizationId);
    if (settings.cash.shiftControl) return;

    throw new ConflictException(
      "El control de apertura/cierre de caja está desactivado: la caja está siempre activa. Habilítalo en Configuración.",
    );
  }

  /**
   * Cash flow of a single day WITHOUT shift machinery (S2).
   *
   * `date` is a `YYYY-MM-DD` interpreted as a UTC day; `from`/`to` are full
   * timestamps for callers that know the business timezone (the frontend
   * computes the local day). Sales and purchases are filtered by the tenant,
   * movements by their shift's register.
   */
  async getDailySummary(
    scope: CashScope,
    query: { date?: string; from?: string; to?: string },
  ) {
    const { start, end } = resolveDayRange(query);

    const saleWhere = {
      paidAt: { gte: start, lt: end },
      sale: { organizationId: scope.organizationId, deletedAt: null },
    };
    const purchaseWhere = {
      paidAt: { gte: start, lt: end },
      purchase: { organizationId: scope.organizationId, deletedAt: null },
    };
    const movementWhere = {
      createdAt: { gte: start, lt: end },
      cashShift: { cashRegister: { organizationId: scope.organizationId } },
    };

    const [salePayments, purchasePayments, income, expense] =
      await Promise.all([
        this.prisma.salePayment.findMany({
          where: saleWhere,
          select: { paymentMethod: true, currency: true, amountUSD: true },
        }),
        this.prisma.purchasePayment.findMany({
          where: purchaseWhere,
          select: { amountUSD: true },
        }),
        this.prisma.cashMovement.aggregate({
          where: { ...movementWhere, type: "INCOME" },
          _sum: { amount: true },
        }),
        this.prisma.cashMovement.aggregate({
          where: { ...movementWhere, type: "EXPENSE" },
          _sum: { amount: true },
        }),
      ]);

    const byMethod = new Map<string, { count: number; amountUSD: number }>();
    let collectedUSD = 0;

    for (const payment of salePayments) {
      const amount = round2(Number(payment.amountUSD ?? 0));
      collectedUSD = round2(collectedUSD + amount);

      const bucket = byMethod.get(payment.paymentMethod) ?? {
        count: 0,
        amountUSD: 0,
      };
      bucket.count += 1;
      bucket.amountUSD = round2(bucket.amountUSD + amount);
      byMethod.set(payment.paymentMethod, bucket);
    }

    const paidToSuppliersUSD = round2(
      purchasePayments.reduce(
        (sum, payment) => sum + Number(payment.amountUSD ?? 0),
        0,
      ),
    );
    const incomeUSD = round2(Number(income._sum.amount ?? 0));
    const expenseUSD = round2(Number(expense._sum.amount ?? 0));

    return {
      from: start.toISOString(),
      to: end.toISOString(),
      shiftControl: (await this.tenantSettings.get(scope.organizationId)).cash
        .shiftControl,
      collectedUSD,
      collectedByMethod: [...byMethod.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([paymentMethod, value]) => ({
          paymentMethod,
          ...value,
        })),
      paidToSuppliersUSD,
      movementsIncomeUSD: incomeUSD,
      movementsExpenseUSD: expenseUSD,
      // What entered the business that day, whatever the source.
      netUSD: round2(
        collectedUSD + incomeUSD - expenseUSD - paidToSuppliersUSD,
      ),
    };
  }

  private registerWhere(
    organizationId: string | null,
  ): Prisma.CashRegisterWhereInput {
    return { organizationId };
  }

  // ------------------------------------------------------------------
  // Registers
  // ------------------------------------------------------------------

  async listRegisters(scope: CashScope) {
    return this.prisma.cashRegister.findMany({
      where: this.registerWhere(scope.organizationId),
      orderBy: { name: "asc" },
      include: { _count: { select: { shifts: { where: { status: "OPEN" } } } } },
    });
  }

  async createRegister(scope: CashScope, data: CreateCashRegisterDto) {
    if (!scope.organizationId) {
      throw new ForbiddenException(
        "Crea una organización para abrir cajas.",
      );
    }

    return this.prisma.cashRegister.create({
      data: {
        name: data.name.trim(),
        organizationId: scope.organizationId,
      },
    });
  }

  async updateRegister(
    scope: CashScope,
    id: string,
    data: UpdateCashRegisterDto,
  ) {
    await this.getRegister(scope, id);

    return this.prisma.cashRegister.update({
      where: { id },
      data: data.name !== undefined ? { name: data.name.trim() } : {},
    });
  }

  async removeRegister(scope: CashScope, id: string) {
    await this.getRegister(scope, id);

    const shifts = await this.prisma.cashShift.count({
      where: { cashRegisterId: id },
    });
    if (shifts > 0) {
      throw new ConflictException(
        "La caja tiene turnos registrados y no puede eliminarse.",
      );
    }

    await this.prisma.cashRegister.delete({ where: { id } });
    return { id, deleted: true };
  }

  private async getRegister(scope: CashScope, id: string) {
    const register = await this.prisma.cashRegister.findFirst({
      where: { id, ...this.registerWhere(scope.organizationId) },
    });

    if (!register) throw new NotFoundException("Caja no encontrada.");
    return register;
  }

  // ------------------------------------------------------------------
  // Shifts
  // ------------------------------------------------------------------

  async listShifts(scope: CashScope, query: ListShiftsQueryDto) {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(Math.max(query.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);

    const where: Prisma.CashShiftWhereInput = {
      cashRegister: { organizationId: scope.organizationId },
      ...(query.status ? { status: query.status } : {}),
      ...(query.cashRegisterId ? { cashRegisterId: query.cashRegisterId } : {}),
    };

    const [list, total] = await Promise.all([
      this.prisma.cashShift.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { openedAt: "desc" },
        include: {
          cashRegister: { select: { id: true, name: true } },
          openedBy: { select: { id: true, fullName: true, email: true } },
        },
      }),
      this.prisma.cashShift.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      list,
      total,
      totalPages,
      currentPage: page,
      limit,
      hasPrev: page > 1,
      hasNext: page < totalPages,
    };
  }

  /** The caller's open shift — the POS needs it before ringing up a sale. */
  async getCurrentShift(scope: CashScope) {
    const shift = await this.prisma.cashShift.findFirst({
      where: {
        status: "OPEN",
        openedById: scope.userId ?? "",
        cashRegister: { organizationId: scope.organizationId },
      },
      orderBy: { openedAt: "desc" },
      include: { cashRegister: true },
    });

    return shift;
  }

  async openShift(scope: CashScope, registerId: string, data: OpenShiftDto) {
    await this.assertShiftControlEnabled(scope.organizationId);
    await this.getRegister(scope, registerId);

    const open = await this.prisma.cashShift.findFirst({
      where: { cashRegisterId: registerId, status: "OPEN" },
      select: { id: true },
    });
    if (open) {
      throw new ConflictException(
        "Esta caja ya tiene un turno abierto. Ciérralo antes de abrir otro.",
      );
    }

    const shift = await this.prisma.cashShift.create({
      data: {
        cashRegisterId: registerId,
        openedById: scope.userId ?? "",
        initialAmountUSD: data.initialAmountUSD,
        initialAmountVES: data.initialAmountVES ?? 0,
        expectedAmountUSD: data.initialAmountUSD,
        notes: data.notes?.trim() || null,
      },
      include: { cashRegister: true },
    });

    this.emitBusinessEvent(
      "erp.cash.shift_opened",
      scope.userId,
      scope.organizationId,
      {
        shiftId: shift.id,
        cashRegisterId: registerId,
        totalUSD: Number(data.initialAmountUSD ?? 0),
      },
    );

    return shift;
  }

  async getShift(scope: CashScope, id: string) {
    const shift = await this.prisma.cashShift.findFirst({
      where: {
        id,
        cashRegister: { organizationId: scope.organizationId },
      },
      include: {
        cashRegister: true,
        openedBy: { select: { id: true, fullName: true, email: true } },
        closedBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    if (!shift) throw new NotFoundException("Turno no encontrado.");

    const [movements, salePayments, purchasePayments] = await Promise.all([
      this.prisma.cashMovement.findMany({
        where: { cashShiftId: id },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.salePayment.findMany({
        where: { cashShiftId: id },
        orderBy: { paidAt: "desc" },
        include: { sale: { select: { id: true, saleNumber: true, clientId: true } } },
      }),
      this.prisma.purchasePayment.findMany({
        where: { cashShiftId: id },
        orderBy: { paidAt: "desc" },
        include: {
          purchase: { select: { id: true, purchaseNumber: true, supplierId: true } },
        },
      }),
    ]);

    const expected = await this.computeExpected(shift);

    return { ...shift, movements, salePayments, purchasePayments, expectedAmountUSD: expected };
  }

  async listMovements(scope: CashScope, shiftId: string) {
    await this.getShift(scope, shiftId);

    return this.prisma.cashMovement.findMany({
      where: { cashShiftId: shiftId },
      orderBy: { createdAt: "desc" },
    });
  }

  async addMovement(
    scope: CashScope,
    shiftId: string,
    data: CreateCashMovementDto,
  ) {
    const shift = await this.getShift(scope, shiftId);

    if (shift.status !== "OPEN") {
      throw new ConflictException(
        "Solo se pueden registrar movimientos en un turno abierto.",
      );
    }

    const movement = await this.prisma.$transaction(async (tx) => {
      const created = await tx.cashMovement.create({
        data: {
          cashShiftId: shiftId,
          type: data.type,
          amount: data.amount,
          currency: data.currency?.trim() || "USD",
          paymentMethod: data.paymentMethod?.trim() || "CASH_USD",
          reason: data.reason.trim(),
          reference: data.reference?.trim() || null,
          createdById: scope.userId ?? null,
        },
      });

      const expected = await this.computeExpected(shift, tx);
      await tx.cashShift.update({
        where: { id: shiftId },
        data: { expectedAmountUSD: expected },
      });

      this.emitBusinessEvent(
        "erp.cash.movement_recorded",
        scope.userId,
        scope.organizationId,
        {
          shiftId,
          type: data.type,
          amount: data.amount,
          currency: data.currency ?? "USD",
          paymentMethod: data.paymentMethod ?? "CASH_USD",
        },
      );

      return created;
    });

    return movement;
  }

  /**
   * Closes the shift with the blind count. The difference (sobrante/faltante)
   * is stored, never corrected automatically.
   */
  async closeShift(scope: CashScope, shiftId: string, data: CloseShiftDto) {
    return this.prisma.$transaction(async (tx) => {
      const shift = await tx.cashShift.findFirst({
        where: {
          id: shiftId,
          cashRegister: { organizationId: scope.organizationId },
        },
      });

      if (!shift) throw new NotFoundException("Turno no encontrado.");
      if (shift.status !== "OPEN") {
        throw new ConflictException("El turno ya está cerrado.");
      }

      const expectedAmountUSD = await this.computeExpected(shift, tx);

      const closed = await tx.cashShift.update({
        where: { id: shiftId },
        data: {
          status: "CLOSED",
          closedAt: new Date(),
          closedById: scope.userId ?? null,
          expectedAmountUSD,
          actualAmountUSD: data.actualAmountUSD,
          differenceUSD: data.actualAmountUSD - expectedAmountUSD,
          notes: data.notes?.trim() || shift.notes,
        },
        include: { cashRegister: true },
      });

      this.emitBusinessEvent(
        "erp.cash.shift_closed",
        scope.userId,
        scope.organizationId,
        {
          shiftId,
          expectedAmountUSD,
          actualAmountUSD: data.actualAmountUSD,
          differenceUSD: closed.differenceUSD,
        },
      );

      return closed;
    });
  }

  /**
   * System view of the drawer:
   *   float + (income - expenses) + sale collections - supplier payments.
   */
  private async computeExpected(
    shift: {
      id: string;
      initialAmountUSD: Prisma.Decimal | number;
    },
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<number> {
    const [income, expense, salePayments, purchasePayments] = await Promise.all([
      tx.cashMovement.aggregate({
        where: { cashShiftId: shift.id, type: "INCOME" },
        _sum: { amount: true },
      }),
      tx.cashMovement.aggregate({
        where: { cashShiftId: shift.id, type: "EXPENSE" },
        _sum: { amount: true },
      }),
      tx.salePayment.aggregate({
        where: { cashShiftId: shift.id },
        _sum: { amountUSD: true },
      }),
      tx.purchasePayment.aggregate({
        where: { cashShiftId: shift.id },
        _sum: { amountUSD: true },
      }),
    ]);

    return (
      Number(shift.initialAmountUSD ?? 0) +
      Number(income._sum.amount ?? 0) -
      Number(expense._sum.amount ?? 0) +
      Number(salePayments._sum.amountUSD ?? 0) -
      Number(purchasePayments._sum.amountUSD ?? 0)
    );
  }

  /** Fire-and-forget business telemetry (S11). */
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

/** Resolves the day window for `GET /api/cash/daily`. */
function resolveDayRange(query: {
  date?: string;
  from?: string;
  to?: string;
}): { start: Date; end: Date } {
  const parse = (value: string, label: string): Date => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`${label} no es una fecha válida.`);
    }
    return parsed;
  };

  if (query.date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(query.date)) {
      throw new BadRequestException("date debe tener el formato YYYY-MM-DD.");
    }
    const start = new Date(`${query.date}T00:00:00.000Z`);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return { start, end };
  }

  const start = query.from
    ? parse(query.from, "from")
    : new Date(new Date().toISOString().slice(0, 10));
  const end = query.to
    ? parse(query.to, "to")
    : new Date(start.getTime() + 24 * 60 * 60 * 1000);

  if (end.getTime() <= start.getTime()) {
    throw new BadRequestException("to debe ser posterior a from.");
  }

  return { start, end };
}
