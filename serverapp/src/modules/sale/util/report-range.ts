const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Report ranges accept a full ISO instant or a bare `YYYY-MM-DD` day.
 *
 * A bare date is a WHOLE day: `from` starts at 00:00 and `to` ends at
 * 23:59:59.999. `new Date("2026-11-08")` parses as UTC midnight, so using it
 * for both edges silently excluded every document issued after 00:00 — which
 * is why "Ventas hoy" reported $0 with sales in the day.
 */
export function resolveRangeEdge(
  value: string | undefined,
  edge: "start" | "end",
): Date | undefined {
  if (!value) return undefined;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;

  if (DATE_ONLY.test(value)) {
    if (edge === "end") date.setUTCHours(23, 59, 59, 999);
    else date.setUTCHours(0, 0, 0, 0);
  }

  return date;
}

/** Inclusive `issueDate`/`paidAt` range for a report query. */
export function resolveReportRange(query: {
  from?: string;
  to?: string;
}): { gte?: Date; lte?: Date } {
  const from = resolveRangeEdge(query.from, "start");
  const to = resolveRangeEdge(query.to, "end");
  return {
    ...(from ? { gte: from } : {}),
    ...(to ? { lte: to } : {}),
  };
}
