/**
 * Pure helpers for the home dashboard (real data only — no forecasts):
 * day keys for the queries, the sales heat grid (weeks × weekday) and
 * simple day-over-day deltas.
 */

export interface DatedRow {
  issueDate: string;
}

export interface WeekHeat {
  /** Monday labels oldest → current, e.g. "21 oct". */
  labels: string[];
  /** Weekday headers, Monday first. */
  weekdays: string[];
  /** rows[week][weekday] — null for days that have not happened yet. */
  cells: (number | null)[][];
  max: number;
}

const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/** Local YYYY-MM-DD (business day, not UTC). */
export function localDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Query-friendly date `days` ago in local time. */
export function isoDaysAgo(days: number, from: Date = new Date()): string {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  date.setDate(date.getDate() - days);
  return localDayKey(date);
}

/** Monday (local) of the week containing `date`. */
function mondayOf(date: Date): Date {
  const day = date.getDay(); // 0 domingo
  const offset = day === 0 ? 6 : day - 1;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - offset);
}

/**
 * Sales heat: the last `weeks` local weeks (oldest first), Monday→Sunday.
 * Future days are null so they render blank instead of a fake "0".
 */
export function buildWeekHeat(
  rows: DatedRow[],
  weeks = 4,
  now: Date = new Date(),
): WeekHeat {
  const currentMonday = mondayOf(now);
  const monthFmt = (date: Date) =>
    date.toLocaleDateString("es-VE", { day: "numeric", month: "short" });

  const labels: string[] = [];
  const starts: Date[] = [];
  for (let w = weeks - 1; w >= 0; w -= 1) {
    const start = new Date(currentMonday);
    start.setDate(start.getDate() - w * 7);
    labels.push(monthFmt(start));
    starts.push(start);
  }

  const cells: (number | null)[][] = starts.map(() =>
    Array.from({ length: 7 }, () => 0),
  );

  const indexByDay = new Map<string, { week: number; weekday: number }>();
  starts.forEach((start, week) => {
    for (let weekday = 0; weekday < 7; weekday += 1) {
      const date = new Date(start);
      date.setDate(date.getDate() + weekday);
      indexByDay.set(localDayKey(date), { week, weekday });
    }
  });

  for (const row of rows) {
    const parsed = new Date(row.issueDate);
    if (Number.isNaN(parsed.getTime())) continue;
    const slot = indexByDay.get(localDayKey(parsed));
    if (!slot) continue;
    cells[slot.week][slot.weekday] = (cells[slot.week][slot.weekday] ?? 0) + 1;
  }

  // Blank out days that have not happened yet in the current week.
  const todayKey = localDayKey(now);
  for (let weekday = 0; weekday < 7; weekday += 1) {
    const date = new Date(starts[starts.length - 1]);
    date.setDate(date.getDate() + weekday);
    if (localDayKey(date) > todayKey) {
      cells[cells.length - 1][weekday] = null;
    }
  }

  const max = Math.max(
    1,
    ...cells.flat().map((value) => value ?? 0),
  );

  return { labels, weekdays: WEEKDAY_LABELS, cells, max };
}

/** Day-over-day percent; null when there is no meaningful baseline. */
export function percentDelta(current: number, previous: number): number | null {
  if (!Number.isFinite(previous) || previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

export function usd(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return `$${safe.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
