import { describe, expect, it } from "vitest";
import {
  buildWeekHeat,
  isoDaysAgo,
  localDayKey,
  percentDelta,
  usd,
} from "./home-metrics";

describe("localDayKey / isoDaysAgo", () => {
  it("formats local dates as YYYY-MM-DD", () => {
    expect(localDayKey(new Date(2026, 9, 5))).toBe("2026-10-05");
  });

  it("walks days back in local time", () => {
    expect(isoDaysAgo(1, new Date(2026, 9, 5))).toBe("2026-10-04");
    expect(isoDaysAgo(0, new Date(2026, 9, 5))).toBe("2026-10-05");
  });
});

describe("buildWeekHeat", () => {
  // Miércoles 7 oct 2026 → semana actual lun 5–dom 11
  const now = new Date(2026, 9, 7, 15);

  it("counts sales per weekday of the last four weeks", () => {
    const heat = buildWeekHeat(
      [
        { issueDate: new Date(2026, 9, 5).toISOString() }, // lun de esta semana
        { issueDate: new Date(2026, 9, 5).toISOString() }, // segundo
        { issueDate: new Date(2026, 8, 28).toISOString() }, // lun semana pasada
        { issueDate: new Date(2026, 8, 30).toISOString() }, // mié semana pasada
      ],
      4,
      now,
    );

    expect(heat.labels).toHaveLength(4);
    expect(heat.weekdays).toEqual(["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]);
    // semana actual (índice 3): lunes con 2
    expect(heat.cells[3][0]).toBe(2);
    // semana pasada (índice 2): lunes1, miércoles1
    expect(heat.cells[2][0]).toBe(1);
    expect(heat.cells[2][2]).toBe(1);
    expect(heat.max).toBe(2);
  });

  it("leaves future days empty instead of zero", () => {
    const heat = buildWeekHeat([], 4, now);
    // jue–dom de esta semana aún no pasan (hoy es miércoles)
    expect(heat.cells[3][3]).toBeNull();
    expect(heat.cells[3][6]).toBeNull();
    // lunes–miércoles sí existen como cero real
    expect(heat.cells[3][0]).toBe(0);
  });

  it("ignores rows outside the window and unparsable dates", () => {
    const heat = buildWeekHeat(
      [
        { issueDate: new Date(2026, 0, 1).toISOString() }, // enero, fuera
        { issueDate: "no-es-fecha" },
      ],
      4,
      now,
    );
    const total = heat.cells.flat().reduce<number>(
      (sum, value) => sum + (value ?? 0),
      0,
    );
    expect(total).toBe(0);
  });
});

describe("percentDelta", () => {
  it("computes growth vs a real baseline", () => {
    expect(percentDelta(110, 100)).toBeCloseTo(10);
    expect(percentDelta(90, 100)).toBeCloseTo(-10);
  });

  it("returns null without a meaningful baseline", () => {
    expect(percentDelta(10, 0)).toBeNull();
    expect(percentDelta(10, -5)).toBeNull();
  });
});

describe("usd", () => {
  it("formats with two decimals and grouping", () => {
    expect(usd(1234.5)).toBe("$1,234.50");
    expect(usd(0)).toBe("$0.00");
  });
});
