import { activeOfferPercentMap, discountedPrice } from "./offer-price";

describe("discountedPrice", () => {
  it("applies the percent rounded to cents", () => {
    expect(discountedPrice(100, 10)).toBe(90);
    expect(discountedPrice(99.99, 15)).toBe(84.99);
  });

  it("ignores zero, negative and out-of-range percents", () => {
    expect(discountedPrice(50, 0)).toBe(50);
    expect(discountedPrice(50, -5)).toBe(50);
    expect(discountedPrice(100, 150)).toBe(0);
  });
});

describe("activeOfferPercentMap", () => {
  it("returns an empty map without product ids (no query needed)", async () => {
    const findMany = jest.fn();
    const map = await activeOfferPercentMap(
      { offerProduct: { findMany } as never },
      "org-1",
      [],
    );
    expect(map.size).toBe(0);
    expect(findMany).not.toHaveBeenCalled();
  });

  it("queries only active unexpired offers of the org and maps the percentages", async () => {
    const findMany = jest.fn().mockResolvedValue([
      { productId: "p1", offer: { discountPercent: 10 } },
      { productId: "p2", offer: { discountPercent: 25 } },
    ]);
    const map = await activeOfferPercentMap(
      { offerProduct: { findMany } as never },
      "org-1",
      ["p1", "p2", "p1"],
    );

    const args = findMany.mock.calls[0]?.[0] as {
      where: { productId: { in: string[] }; offer: Record<string, unknown> };
    };
    expect(args.where.productId.in).toEqual(["p1", "p2"]);
    expect(args.where.offer).toMatchObject({
      organizationId: "org-1",
      active: true,
      discountPercent: { gt: 0 },
    });
    expect(map.get("p1")).toBe(10);
    expect(map.get("p2")).toBe(25);
  });
});
