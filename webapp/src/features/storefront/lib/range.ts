/** Ranges the metrics screen asks for, in whole local days. */
export type StorefrontRangePreset = 7 | 30 | 90;

const pad = (value: number): string => String(value).padStart(2, "0");

const dayKey = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/**
 * Inclusive `YYYY-MM-DD` range ending today (local). `days = 7` means today and
 * the six days before it — the backend expands each edge to the whole day.
 */
export function rangeForPreset(
  days: StorefrontRangePreset,
  now: Date = new Date(),
): { from: string; to: string } {
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const from = new Date(to);
  from.setDate(from.getDate() - (days - 1));

  return { from: dayKey(from), to: dayKey(to) };
}
