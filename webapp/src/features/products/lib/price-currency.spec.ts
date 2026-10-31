import { describe, expect, it } from "vitest";
import {
  convertFromUSD,
  convertToUSD,
  priceEquivalents,
} from "./price-currency";

const RATES = { rateBcv: 900, rateUsdt: 1000 };

describe("convertFromUSD", () => {
  it("keeps USD as-is", () => {
    expect(convertFromUSD(10.5, "USD", RATES)).toBe(10.5);
  });

  it("converts to VES with the BCV rate", () => {
    expect(convertFromUSD(2, "VES", RATES)).toBe(1800);
  });

  it("converts to USDT with BCV over the USDT rate", () => {
    expect(convertFromUSD(2, "USDT", RATES)).toBe(1.8);
  });

  it("stays in USD when rates are missing", () => {
    expect(convertFromUSD(2, "VES", null)).toBe(2);
  });
});

describe("convertToUSD", () => {
  it("is the inverse of convertFromUSD within rounding", () => {
    expect(convertToUSD(1800, "VES", RATES)).toBe(2);
    expect(convertToUSD(1.8, "USDT", RATES)).toBe(2);
  });

  it("rounds to cents", () => {
    expect(convertToUSD(1000, "VES", RATES)).toBe(1.11);
  });
});

describe("priceEquivalents", () => {
  it("summarizes VES and USDT for an USD amount", () => {
    expect(priceEquivalents(2, RATES)).toBe("≈ 1.800 Bs · ≈ 1,80 USDT");
  });

  it("is empty without rates", () => {
    expect(priceEquivalents(2, null)).toBe("");
  });
});
