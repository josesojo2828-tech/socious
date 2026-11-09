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
