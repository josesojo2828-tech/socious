import { round2 } from "src/shared/utils/money";

/**
 * Cashea (BNPL) plan math. Kept pure so the schedule and the validation are
 * unit-tested without a database.
 *
 * Cashea always charges the customer every 14 days: the sale stores the initial
 * collected at the register and the equal installments that Cashea will pay.
 * The financed part is a receivable against Cashea, never the client's debt.
 */

export const CASHEA_CADENCE_DAYS = 14;

const MAX_INSTALLMENTS = 36;
/** Cents of slack when splitting a total into an initial plus equal parts. */
const AMOUNT_TOLERANCE = 0.05;

export interface CasheaPlanInput {
  initialUSD: number;
  installmentCount: number;
  installmentUSD: number;
}

export interface CasheaScheduleEntry {
  /** 1-based installment number. */
  number: number;
  dueDate: Date;
  amountUSD: number;
}

/** What Cashea finances: everything the initial does not cover. */
export function casheaFinancedUSD(totalUSD: number, initialUSD: number): number {
  return round2(Math.max(0, (totalUSD ?? 0) - (initialUSD ?? 0)));
}

/**
 * One entry per installment, every 14 days starting at `firstDueDate`.
 * Dates use local calendar arithmetic so they never drift by a timezone.
 */
export function buildCasheaSchedule(
  firstDueDate: Date,
  installmentCount: number,
  installmentUSD: number,
): CasheaScheduleEntry[] {
  const count = Math.floor(installmentCount ?? 0);
  if (!Number.isFinite(count) || count <= 0) return [];
  if (Number.isNaN(firstDueDate.getTime())) return [];

  const amountUSD = round2(installmentUSD ?? 0);
  const entries: CasheaScheduleEntry[] = [];

  for (let index = 0; index < count; index += 1) {
    const dueDate = new Date(firstDueDate);
    dueDate.setDate(dueDate.getDate() + CASHEA_CADENCE_DAYS * index);
    entries.push({ number: index + 1, dueDate, amountUSD });
  }

  return entries;
}

/**
 * Returns the user-facing error for an unusable plan, or `null` when it is
 * valid. The message is neutral Spanish because the POS renders it verbatim.
 */
export function validateCasheaPlan(
  totalUSD: number,
  plan: CasheaPlanInput,
): string | null {
  const initial = plan.initialUSD ?? 0;
  const count = plan.installmentCount ?? 0;
  const installment = plan.installmentUSD ?? 0;

  if (!Number.isFinite(count) || !Number.isInteger(count) || count < 1 || count > MAX_INSTALLMENTS) {
    return "Cashea necesita al menos una cuota y un monto por cuota mayor que cero.";
  }
  if (!Number.isFinite(installment) || installment <= 0) {
    return "Cashea necesita al menos una cuota y un monto por cuota mayor que cero.";
  }
  if (!Number.isFinite(initial) || initial < 0) {
    return "El pago inicial de Cashea no puede ser negativo.";
  }
  if (initial > totalUSD + 0.01) {
    return "El pago inicial de Cashea no puede superar el total de la venta.";
  }

  const declared = round2(initial + count * installment);
  // Each installment is rounded to cents, so the split can drift by half a cent
  // per installment. Only that rounding is tolerated, never a wrong amount.
  const tolerance = Math.max(AMOUNT_TOLERANCE, round2(count * 0.005) + 0.01);
  if (Math.abs(declared - round2(totalUSD)) > tolerance) {
    return "Las cuotas de Cashea no cuadran: inicial + cuotas debe dar el total de la venta.";
  }

  return null;
}
