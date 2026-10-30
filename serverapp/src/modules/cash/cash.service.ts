import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import type { Prisma } from "@prisma/client";
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
    private readonly eventEmitter?: EventEmitter2,
  ) {}

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
