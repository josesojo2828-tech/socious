import { describe, expect, it } from "vitest";
import { buildListParams } from "./purchase-list";

describe("purchase-list buildListParams (list pagination)", () => {
  it("defaults to page 1 with the page size of 25", () => {
    expect(buildListParams({})).toEqual({ page: 1, limit: 25 });
  });

  it("passes an explicit page through", () => {
    expect(buildListParams({ page: 4 }).page).toBe(4);
    expect(buildListParams({ page: 4 }).limit).toBe(25);
  });

  it("includes a trimmed q and omits empty or whitespace-only q", () => {
    expect(buildListParams({ q: "  proveedor  " }).q).toBe("proveedor");
    expect(buildListParams({ q: "" })).not.toHaveProperty("q");
    expect(buildListParams({ q: "   " })).not.toHaveProperty("q");
  });

  it("includes status only when set", () => {
    expect(buildListParams({ status: "PENDING" }).status).toBe("PENDING");
    expect(buildListParams({ status: "" })).not.toHaveProperty("status");
  });

  it("combines page, q and status for a filtered request", () => {
    expect(
      buildListParams({ page: 2, q: "COM-001", status: "RECEIVED" }),
    ).toEqual({ page: 2, limit: 25, q: "COM-001", status: "RECEIVED" });
  });
});
