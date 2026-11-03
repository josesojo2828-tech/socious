import { describe, expect, it } from "vitest";
import {
  buildRateDifferentials,
  filterRatesByRange,
  type RateHistoryRow,
} from "./rate-differentials";

const row = (
  overrides: Partial<RateHistoryRow> & { date: string },
): RateHistoryRow => ({
  rateBcv: 36,
  rateUsdt: 40,
  rateParallel: null,
  ...overrides,
});

describe("buildRateDifferentials", () => {
  it("answers nulls for an empty list", () => {
    expect(buildRateDifferentials([])).toBeNull();
  });

  it("uses the newest row as the snapshot", () => {
    const snapshot = buildRateDifferentials([
      row({ date: "2026-10-01T00:00:00.000Z", rateBcv: 30, rateUsdt: 33 }),
      row({ date: "2026-11-01T00:00:00.000Z", rateBcv: 36, rateUsdt: 40 }),
    ]);
    expect(snapshot).not.toBeNull();
    expect(snapshot!.date).toBe("2026-11-01T00:00:00.000Z");
    expect(snapshot!.rateBcv).toBe(36);
    expect(snapshot!.rateUsdt).toBe(40);
  });

  it("computes the USDT−BCV spread in Bs and percent", () => {
    const snapshot = buildRateDifferentials([
      row({ date: "2026-11-01T00:00:00.000Z", rateBcv: 36, rateUsdt: 40 }),
    ]);
    expect(snapshot!.usdtBcvAbs).toBe(4);
    expect(snapshot!.usdtBcvPct).toBeCloseTo(11.11, 2);
  });

  it("computes the parallel−BCV spread when a parallel rate exists", () => {
    const snapshot = buildRateDifferentials([
      row({
        date: "2026-11-01T00:00:00.000Z",
        rateBcv: 36,
        rateUsdt: 40,
        rateParallel: 38,
      }),
    ]);
    expect(snapshot!.parallelBcvAbs).toBe(2);
    expect(snapshot!.parallelBcvPct).toBeCloseTo(5.56, 2);
  });

  it("leaves the parallel spread null when the row has no parallel rate", () => {
    const snapshot = buildRateDifferentials([
      row({ date: "2026-11-01T00:00:00.000Z" }),
    ]);
    expect(snapshot!.parallelBcvAbs).toBeNull();
    expect(snapshot!.parallelBcvPct).toBeNull();
  });

  it("ignores non-positive rates when deriving spreads", () => {
    const snapshot = buildRateDifferentials([
      row({ date: "2026-11-01T00:00:00.000Z", rateBcv: 0, rateUsdt: 40 }),
    ]);
    expect(snapshot!.usdtBcvAbs).toBeNull();
    expect(snapshot!.usdtBcvPct).toBeNull();
  });
});

describe("filterRatesByRange", () => {
  const from = "2026-11-01";
  const to = "2026-11-30";

  it("keeps rows whose date falls inside the inclusive range", () => {
    const rows = [
      row({ date: "2026-10-15T12:00:00.000Z" }),
      row({ date: "2026-11-01T00:00:00.000Z" }),
      row({ date: "2026-11-15T12:00:00.000Z" }),
      row({ date: "2026-11-30T23:59:59.000Z" }),
      row({ date: "2026-12-01T00:00:00.000Z" }),
    ];
    const filtered = filterRatesByRange(rows, from, to);
    expect(filtered.map((r) => r.date)).toEqual([
      "2026-11-01T00:00:00.000Z",
      "2026-11-15T12:00:00.000Z",
      "2026-11-30T23:59:59.000Z",
    ]);
  });

  it("answers every row when either bound is missing", () => {
    const rows = [row({ date: "2026-01-01T00:00:00.000Z" })];
    expect(filterRatesByRange(rows, "", to)).toEqual(rows);
    expect(filterRatesByRange(rows, from, "")).toEqual(rows);
    expect(filterRatesByRange(rows, "", "")).toEqual(rows);
  });

  it("returns an empty list when nothing falls in the range", () => {
    expect(
      filterRatesByRange([row({ date: "2026-06-01T00:00:00.000Z" })], from, to),
    ).toEqual([]);
  });

  it("tolerates unparseable dates by excluding them", () => {
    const rows = [row({ date: "not-a-date" })];
    expect(filterRatesByRange(rows, from, to)).toEqual([]);
  });
});
