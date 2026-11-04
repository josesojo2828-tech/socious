import { describe, expect, it } from "vitest";
import { buildListParams } from "./product-list";

describe("product-list buildListParams (list pagination)", () => {
  it("defaults to page 1 with the page size of 25", () => {
    expect(buildListParams({})).toEqual({ page: 1, limit: 25 });
  });

  it("passes an explicit page through", () => {
    expect(buildListParams({ page: 4 }).page).toBe(4);
    expect(buildListParams({ page: 4 }).limit).toBe(25);
  });

  it("includes a trimmed q and omits empty or whitespace-only q", () => {
    expect(buildListParams({ q: "  café  " }).q).toBe("café");
    expect(buildListParams({ q: "" })).not.toHaveProperty("q");
    expect(buildListParams({ q: "   " })).not.toHaveProperty("q");
  });

  it("includes status only when set", () => {
    expect(buildListParams({ status: "ACTIVE" }).status).toBe("ACTIVE");
    expect(buildListParams({ status: "" })).not.toHaveProperty("status");
  });

  it("combines page, q and status for a filtered request", () => {
    expect(
      buildListParams({ page: 2, q: "sku-1", status: "ON_SALE" }),
    ).toEqual({ page: 2, limit: 25, q: "sku-1", status: "ON_SALE" });
  });

  it("sends excludeRawMaterials only when the catalog asks for it", () => {
    expect(buildListParams({ excludeRawMaterials: true })).toEqual({
      page: 1,
      limit: 25,
      excludeRawMaterials: true,
    });
    expect(buildListParams({})).not.toHaveProperty("excludeRawMaterials");
  });
});
