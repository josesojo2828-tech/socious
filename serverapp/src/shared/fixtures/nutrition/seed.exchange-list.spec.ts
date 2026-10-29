import { resolveExchangeMacros } from "src/modules/nutringest/exchange-list/service/exchange-list.service";
import { list } from "./seed.exchange-list";

describe("seed.exchange-list fixture", () => {
  it("defines a grams value on every entry, as a number or an explicit null", () => {
    for (const item of list) {
      expect(Object.keys(item)).toContain("grams");
      if (item.grams !== null) {
        expect(typeof item.grams).toBe("number");
      }
    }
  });

  it("only holds sensible gram weights when one is known", () => {
    const known = list.filter((item) => item.grams !== null);
    expect(known.length).toBeGreaterThan(100);

    for (const item of known) {
      expect(Number.isInteger(item.grams)).toBe(true);
      expect(item.grams as number).toBeGreaterThan(0);
      expect(item.grams as number).toBeLessThanOrEqual(1000);
    }
  });

  // S5: the per-food kcal shown on the detail page must be the same value the
  // list totals are computed from, otherwise the two screens disagree.
  it("stores the kcal that resolveExchangeMacros returns for its sub/category", () => {
    const mismatched = list.filter((item) => {
      const expected = resolveExchangeMacros(item.category, item.sub).kcal;
      return Number(item.caloria) !== expected;
    });

    expect(mismatched.map((item) => item.name)).toEqual([]);
  });
});
