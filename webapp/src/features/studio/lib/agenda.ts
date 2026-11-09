/** Pure date helpers for the daily agenda. Dates are LOCAL business days. */

/** `YYYY-MM-DD` for a Date, in the browser's local timezone. */
export function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Today as `YYYY-MM-DD` in local time. */
export function todayISO(now: Date = new Date()): string {
  return toDateInputValue(now);
}

/** Shift a `YYYY-MM-DD` by whole days, rolling months/years correctly. */
export function addDays(dateISO: string, days: number): string {
  const [year, month, day] = parseDay(dateISO);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return toDateInputValue(date);
}

/**
 * The `[from, to)` ISO window that covers a local day. The backend filters on
 * `startAt`, so the upper bound is exclusive.
 */
export function dayRange(dateISO: string): { from: string; to: string } {
  const [year, month, day] = parseDay(dateISO);
  const start = new Date(year, month - 1, day, 0, 0, 0, 0);
  const end = new Date(year, month - 1, day + 1, 0, 0, 0, 0);
  return { from: start.toISOString(), to: end.toISOString() };
}

/** `HH:mm` for an ISO timestamp, in local time. */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-VE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** `HH:mm – HH:mm` range of a slot. */
export function formatRange(startAt: string, endAt: string): string {
  return `${formatTime(startAt)} – ${formatTime(endAt)}`;
}

/** ISO timestamp → `YYYY-MM-DDTHH:mm` for a `<input type="datetime-local">`. */
export function toDateTimeLocal(iso: string): string {
  const date = new Date(iso);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${toDateInputValue(date)}T${hours}:${minutes}`;
}

/** Default `datetime-local` value for a day and hour (`09:00` fallback). */
export function defaultSlot(dateISO: string, hour = 9): string {
  return `${dateISO}T${String(hour).padStart(2, "0")}:00`;
}

function parseDay(dateISO: string): [number, number, number] {
  const [year, month, day] = dateISO.split("-").map(Number);
  return [year, month, day];
}

/** Calendar granularity shown by the agenda screen. */
export type AgendaView = "month" | "week" | "day";

export interface MonthCell {
  dateISO: string;
  /** False for the leading/trailing days that belong to a neighbour month. */
  inMonth: boolean;
}

/** `YYYY-MM-DD` of the Monday that starts the week containing `dateISO`. */
export function startOfWeek(dateISO: string): string {
  const [year, month, day] = parseDay(dateISO);
  const date = new Date(year, month - 1, day);
  const weekday = date.getDay(); // 0 = domingo
  const offset = weekday === 0 ? 6 : weekday - 1;
  date.setDate(date.getDate() - offset);
  return toDateInputValue(date);
}

/**
 * The 6×7 grid a month calendar paints: whole weeks (Monday→Sunday) covering
 * the month, including the days of the neighbour months at both edges.
 */
export function monthGrid(dateISO: string): MonthCell[][] {
  const [year, month] = parseDay(dateISO);
  const firstOfMonth = new Date(year, month - 1, 1);
  const lastOfMonth = new Date(year, month, 0);
  const cursor = startOfWeek(toDateInputValue(firstOfMonth));
  const lastWeekStart = startOfWeek(toDateInputValue(lastOfMonth));

  const weeks: MonthCell[][] = [];
  let weekStart = cursor;
  while (weekStart <= lastWeekStart) {
    const week: MonthCell[] = [];
    for (let index = 0; index < 7; index += 1) {
      // `addDays` parses the day key as LOCAL; `new Date("YYYY-MM-DD")` would
      // read it as UTC midnight and shift the cell one day in UTC-negative zones.
      const cellISO = addDays(weekStart, index);
      week.push({
        dateISO: cellISO,
        inMonth: parseDay(cellISO)[1] === month,
      });
    }
    weeks.push(week);
    weekStart = addDays(weekStart, 7);
  }
  return weeks;
}

/** Month + year heading, e.g. "noviembre de 2026". */
export function monthLabel(dateISO: string): string {
  const [year, month] = parseDay(dateISO);
  return new Date(year, month - 1, 1).toLocaleDateString("es-VE", {
    month: "long",
    year: "numeric",
  });
}

/** Move the selected day by one period of the active view. */
export function shiftPeriod(
  dateISO: string,
  view: AgendaView,
  direction: number,
): string {
  if (view === "day") return addDays(dateISO, direction);
  if (view === "week") return addDays(dateISO, 7 * direction);

  const [year, month, day] = parseDay(dateISO);
  const target = new Date(year, month - 1 + direction, 1);
  const y = target.getFullYear();
  const m = target.getMonth();
  const lastDay = new Date(y, m + 1, 0).getDate();
  return toDateInputValue(new Date(y, m, Math.min(day, lastDay)));
}

/** The `[from, to)` window the active view needs to load. */
export function viewRange(
  dateISO: string,
  view: AgendaView,
): { from: string; to: string } {
  if (view === "day") return dayRange(dateISO);

  if (view === "week") {
    const start = startOfWeek(dateISO);
    return { from: dayRange(start).from, to: dayRange(addDays(start, 6)).to };
  }

  const cells = monthGrid(dateISO).flat();
  return {
    from: dayRange(cells[0].dateISO).from,
    to: dayRange(cells[cells.length - 1].dateISO).to,
  };
}

/** Local `YYYY-MM-DD` of an ISO timestamp (which day an appointment belongs to). */
export function dayKeyOf(iso: string): string {
  return toDateInputValue(new Date(iso));
}
