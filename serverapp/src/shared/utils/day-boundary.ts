/**
 * Midnight of the current day in an IANA time zone, expressed as a UTC instant.
 *
 * The API runs in UTC while the business day is Venezuela time (`America/
 * Caracas`), so "today" counters must be anchored to the tenant zone or they
 * leak the previous evening into the number.
 */
export function startOfDayInZone(now: Date, timeZone: string): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const pick = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  const offsetLabel =
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "longOffset",
    })
      .formatToParts(now)
      .find((part) => part.type === "timeZoneName")?.value ?? "GMT+00:00";

  const offset = offsetLabel.replace("GMT", "") || "+00:00";

  return new Date(
    `${pick("year")}-${pick("month")}-${pick("day")}T00:00:00${offset}`,
  );
}
