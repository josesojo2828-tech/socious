import type { CreditCadence } from "src/shared/constants/tenant-settings";

/**
 * Due date for a credit sale (S3). FREE leaves the sale open (no due date);
 * QUINCENAL is +15 days, EVERY_N_DAYS +N, MONTHLY the next configured day.
 */
export function computeCreditDueDate(
  cadence: CreditCadence,
  options: { everyNDays?: number; monthlyDay?: number } = {},
  from: Date = new Date(),
): Date | null {
  if (cadence === "FREE") return null;

  if (cadence === "QUINCENAL") {
    const due = new Date(from);
    due.setDate(due.getDate() + 15);
    return due;
  }

  if (cadence === "EVERY_N_DAYS") {
    const days = Math.min(Math.max(Math.floor(options.everyNDays ?? 15), 1), 365);
    const due = new Date(from);
    due.setDate(due.getDate() + days);
    return due;
  }

  // MONTHLY: the next occurrence of monthlyDay (1–28).
  const day = Math.min(Math.max(Math.floor(options.monthlyDay ?? 1), 1), 28);
  const due = new Date(from.getFullYear(), from.getMonth(), day);
  if (due.getTime() <= from.getTime()) {
    due.setMonth(due.getMonth() + 1);
  }
  return due;
}
