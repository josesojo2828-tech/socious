/**
 * Payment schedule preview for a credit sale (round 2, #3): when does the
 * cash fall and what is still owed. Pure so vitest covers the math.
 */

export interface ScheduleEntry {
  date: Date;
  balanceUSD: number;
}

export interface CreditScheduleInput {
  totalUSD: number;
  initialUSD: number;
  cadence: "QUINCENAL" | "MONTHLY" | "EVERY_N_DAYS" | "FREE";
  everyNDays: number;
  monthlyDay: number;
  /** How many future entries to show. */
  count?: number;
  from?: Date;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * FREE cadence has no dates (it is paid by abonos); the others walk the
 * configured interval from today. The balance shown is what is still owed
 * after the initial payment — entries do NOT amortize on their own.
 */
export function creditSchedule(input: CreditScheduleInput): ScheduleEntry[] {
  if (input.cadence === "FREE") return [];
  const remaining = roundMoney(Math.max(0, input.totalUSD - input.initialUSD));
  if (remaining <= 0) return [];

  const count = Math.min(Math.max(input.count ?? 4, 1), 12);
  const from = input.from ?? new Date();
  const entries: ScheduleEntry[] = [];

  const nextDate = (step: number): Date => {
    if (input.cadence === "MONTHLY") {
      const day = Math.min(Math.max(Math.floor(input.monthlyDay), 1), 28);
      const first = new Date(from.getFullYear(), from.getMonth(), day);
      if (first.getTime() <= from.getTime()) {
        first.setMonth(first.getMonth() + 1);
      }
      const due = new Date(first);
      due.setMonth(due.getMonth() + (step - 1));
      return due;
    }
    const days = Math.min(
      Math.max(
        Math.floor(input.cadence === "QUINCENAL" ? input.everyNDays || 15 : input.everyNDays),
        1,
      ),
      365,
    );
    const due = new Date(from);
    due.setDate(due.getDate() + days * step);
    return due;
  };

  for (let step = 1; step <= count; step += 1) {
    entries.push({ date: nextDate(step), balanceUSD: remaining });
  }
  return entries;
}
