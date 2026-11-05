import { startOfDayInZone } from "./day-boundary";

describe("startOfDayInZone", () => {
  it("anchors midnight to the Caracas day (UTC-4, no DST)", () => {
    const now = new Date("2026-11-05T15:30:00.000Z");

    expect(startOfDayInZone(now, "America/Caracas").toISOString()).toBe(
      "2026-11-05T04:00:00.000Z",
    );
  });

  it("keeps the previous UTC day when Caracas is still on it", () => {
    // 02:00 UTC = 22:00 of the previous day in Caracas.
    const now = new Date("2026-11-05T02:00:00.000Z");

    expect(startOfDayInZone(now, "America/Caracas").toISOString()).toBe(
      "2026-11-04T04:00:00.000Z",
    );
  });

  it("uses UTC midnight when the zone is UTC", () => {
    const now = new Date("2026-11-05T15:30:00.000Z");

    expect(startOfDayInZone(now, "UTC").toISOString()).toBe(
      "2026-11-05T00:00:00.000Z",
    );
  });
});
