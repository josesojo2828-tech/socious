import { describe, expect, it } from "vitest";
import {
  deriveDarkVariant,
  deriveReadableText,
  normalizeBrandHex,
} from "./brand-theme";

describe("normalizeBrandHex", () => {
  it("expands a #RGB shorthand to lowercase #rrggbb", () => {
    expect(normalizeBrandHex("#FFF")).toBe("#ffffff");
    expect(normalizeBrandHex("#a09")).toBe("#aa0099");
  });

  it("keeps a #RRGGBB value and lowercases it", () => {
    expect(normalizeBrandHex("#0A0B0C")).toBe("#0a0b0c");
    expect(normalizeBrandHex("  #1a2a46  ")).toBe("#1a2a46");
  });

  it("rejects anything that is not a hex color", () => {
    expect(normalizeBrandHex("1a2a46")).toBeNull();
    expect(normalizeBrandHex("#abcd")).toBeNull();
    expect(normalizeBrandHex("rgb(0,0,0)")).toBeNull();
    expect(normalizeBrandHex("rebeccapurple")).toBeNull();
    expect(normalizeBrandHex(null)).toBeNull();
    expect(normalizeBrandHex(42)).toBeNull();
  });
});

describe("deriveDarkVariant", () => {
  it("lifts a neutral gray while keeping it neutral", () => {
    expect(deriveDarkVariant("#808080")).toBe("#b9b9b9");
  });

  it("clamps black to the dark-surface lightness floor", () => {
    expect(deriveDarkVariant("#000000")).toBe("#9e9e9e");
  });

  it("clamps white to the dark-surface lightness ceiling", () => {
    expect(deriveDarkVariant("#ffffff")).toBe("#dbdbdb");
  });

  it("keeps hue and saturation while lifting a saturated color", () => {
    expect(deriveDarkVariant("#ff0000")).toBe("#ff7373");
    expect(deriveDarkVariant("#4f46e5")).toBe("#9e99f1");
  });

  it("keeps a dark navy legible on a dark surface", () => {
    expect(deriveDarkVariant("#1a2a46")).toBe("#7292cb");
  });

  it("normalizes the input before deriving", () => {
    expect(deriveDarkVariant("#F00")).toBe(deriveDarkVariant("#ff0000"));
  });

  it("returns the input unchanged when it is not a hex color", () => {
    expect(deriveDarkVariant("brand")).toBe("brand");
  });
});

describe("deriveReadableText", () => {
  it("uses the brand ink over light colors", () => {
    expect(deriveReadableText("#ffffff")).toBe("#111018");
    expect(deriveReadableText("#b2944a")).toBe("#111018");
  });

  it("uses white over dark colors", () => {
    expect(deriveReadableText("#000000")).toBe("#ffffff");
    expect(deriveReadableText("#1a2a46")).toBe("#ffffff");
  });

  it("falls back to the brand ink for invalid colors", () => {
    expect(deriveReadableText("not-a-color")).toBe("#111018");
  });
});
