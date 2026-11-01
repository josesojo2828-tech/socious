import { describe, expect, it } from "vitest";
import { buildListParams } from "./client-list";

describe("client-list buildListParams (list pagination)", () => {
  it("defaults to page 1 with the page size of 25", () => {
    expect(buildListParams({})).toEqual({ page: 1, limit: 25 });
  });

  it("passes an explicit page through", () => {
    expect(buildListParams({ page: 3 }).page).toBe(3);
    expect(buildListParams({ page: 3 }).limit).toBe(25);
  });

  it("includes a trimmed q and omits empty or whitespace-only q", () => {
    expect(buildListParams({ q: "  ana  " }).q).toBe("ana");
    expect(buildListParams({ q: "" })).not.toHaveProperty("q");
    expect(buildListParams({ q: "   " })).not.toHaveProperty("q");
  });

  it("combines page and q for a filtered request", () => {
    expect(buildListParams({ page: 2, q: "ana" })).toEqual({
      page: 2,
      limit: 25,
      q: "ana",
    });
  });
});
