import { describe, expect, it } from "vitest";
import {
  parsePresentationSalePrice,
  presentationPriceLabel,
} from "./presentation-price";

describe("parsePresentationSalePrice", () => {
  it("returns null for the empty input (hereda del producto)", () => {
    expect(parsePresentationSalePrice("")).toBeNull();
    expect(parsePresentationSalePrice("   ")).toBeNull();
  });

  it("parses a valid price", () => {
    expect(parsePresentationSalePrice("3.5")).toBe(3.5);
    expect(parsePresentationSalePrice("0")).toBe(0);
    expect(parsePresentationSalePrice(" 2.75 ")).toBe(2.75);
  });

  it("refuses garbage and negatives instead of sending them", () => {
    expect(parsePresentationSalePrice("abc")).toBeNull();
    expect(parsePresentationSalePrice("-1")).toBeNull();
    expect(parsePresentationSalePrice("12px")).toBeNull();
  });
});

describe("presentationPriceLabel", () => {
  it("says hereda when there is no own price", () => {
    expect(presentationPriceLabel(null)).toBe("hereda");
    expect(presentationPriceLabel(undefined)).toBe("hereda");
    expect(presentationPriceLabel("nope")).toBe("hereda");
  });

  it("formats the own price with two decimals (API sends strings)", () => {
    expect(presentationPriceLabel("3.50")).toBe("$3.50");
    expect(presentationPriceLabel(2)).toBe("$2.00");
  });
});
