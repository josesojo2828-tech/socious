import { describe, expect, it } from "vitest";
import {
  ean13CheckDigit,
  generateEan13,
  isValidEan13,
} from "./barcode";

describe("ean13CheckDigit", () => {
  it("computes the standard modulo-10 check digit", () => {
    // Classic example: 400638133393 → check 1
    expect(ean13CheckDigit("400638133393")).toBe("1");
  });

  it("rejects a base that is not exactly twelve digits", () => {
    expect(() => ean13CheckDigit("123")).toThrow(/12 digits/);
    expect(() => ean13CheckDigit("40063813339x")).toThrow(/12 digits/);
  });
});

describe("isValidEan13", () => {
  it("accepts a full code whose check digit matches", () => {
    expect(isValidEan13("4006381333931")).toBe(true);
  });

  it("rejects a wrong check digit or a malformed code", () => {
    expect(isValidEan13("4006381333932")).toBe(false);
    expect(isValidEan13("400638133393")).toBe(false);
    expect(isValidEan13("abcdefghijkll")).toBe(false);
  });
});

describe("generateEan13", () => {
  it("produces a valid code from a given base", () => {
    const code = generateEan13("750123456789");
    expect(code).toHaveLength(13);
    expect(isValidEan13(code)).toBe(true);
  });

  it("produces a valid random code when no base is given", () => {
    const code = generateEan13();
    expect(code).toHaveLength(13);
    expect(isValidEan13(code)).toBe(true);
  });

  it("falls back to a random base when the given one is malformed", () => {
    const code = generateEan13("abc");
    expect(isValidEan13(code)).toBe(true);
  });
});
