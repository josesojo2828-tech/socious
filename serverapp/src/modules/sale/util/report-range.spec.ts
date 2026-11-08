import { resolveRangeEdge, resolveReportRange } from "./report-range";

describe("resolveReportRange — inclusive day ranges", () => {
  it("expands a bare date to the whole UTC day", () => {
    const range = resolveReportRange({ from: "2026-11-08", to: "2026-11-08" });

    expect(range.gte?.toISOString()).toBe("2026-11-08T00:00:00.000Z");
    expect(range.lte?.toISOString()).toBe("2026-11-08T23:59:59.999Z");
  });

  it("keeps a full instant untouched", () => {
    const start = "2026-11-08T00:00:00.000-04:00";
    const end = "2026-11-08T23:59:59.999-04:00";

    const range = resolveReportRange({ from: start, to: end });

    expect(range.gte?.toISOString()).toBe("2026-11-08T04:00:00.000Z");
    expect(range.lte?.toISOString()).toBe("2026-11-09T03:59:59.999Z");
  });

  it("omits the edges that were not sent", () => {
    expect(resolveReportRange({})).toEqual({});
    expect(resolveReportRange({ from: "2026-11-08" })).toEqual({
      gte: new Date("2026-11-08T00:00:00.000Z"),
    });
  });

  it("ignores an unparseable value instead of throwing", () => {
    expect(resolveRangeEdge("no-es-fecha", "start")).toBeUndefined();
  });
});
