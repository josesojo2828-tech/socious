import { describe, expect, it } from "vitest";
import {
  DEFAULT_BRAND_PAIR,
  contrastText,
  normalizeHex,
  pickBrandPair,
} from "./palette";

describe("identity palette helpers", () => {
  describe("normalizeHex", () => {
    it("accepts #RRGGBB in any case and normalizes it to lowercase", () => {
      expect(normalizeHex("#B2944A")).toBe("#b2944a");
      expect(normalizeHex("#1A2A46")).toBe("#1a2a46");
    });

    it("accepts a bare hex value and trims surrounding whitespace", () => {
      expect(normalizeHex("b2944a")).toBe("#b2944a");
      expect(normalizeHex("  #A1B2C3  ")).toBe("#a1b2c3");
    });

    it("rejects values that are not exactly six hex digits", () => {
      expect(normalizeHex("")).toBeNull();
      expect(normalizeHex("#FFF")).toBeNull();
      expect(normalizeHex("b2944")).toBeNull();
      expect(normalizeHex("#gggggg")).toBeNull();
      expect(normalizeHex("rgb(178,148,74)")).toBeNull();
    });
  });

  describe("contrastText", () => {
    it("uses the brand ink over light swatches", () => {
      expect(contrastText("#ffffff")).toBe("#111018");
      expect(contrastText("#f0ede4")).toBe("#111018");
      expect(contrastText("#b2944a")).toBe("#111018");
    });

    it("uses white over dark swatches", () => {
      expect(contrastText("#111018")).toBe("#ffffff");
      expect(contrastText("#1a2a46")).toBe("#ffffff");
    });

    it("falls back to the brand ink when the value is not a valid hex color", () => {
      expect(contrastText("no-es-un-color")).toBe("#111018");
    });
  });

  describe("pickBrandPair", () => {
    it("returns the default pair for an empty palette", () => {
      expect(pickBrandPair([])).toEqual({ ...DEFAULT_BRAND_PAIR });
    });

    it("uses the most frequent color as primary and a distinct one as accent", () => {
      expect(pickBrandPair(["#B2944A", "#1A2A46"])).toEqual({
        primary: "#b2944a",
        accent: "#1a2a46",
      });
    });

    it("skips a near-duplicate in favor of a visually distinct color", () => {
      expect(pickBrandPair(["#1a2a46", "#1a2a47", "#b2944a"])).toEqual({
        primary: "#1a2a46",
        accent: "#b2944a",
      });
    });

    it("deduplicates case variants before choosing the pair", () => {
      expect(pickBrandPair(["#B2944A", "#b2944a", "#1A2A46"])).toEqual({
        primary: "#b2944a",
        accent: "#1a2a46",
      });
    });

    it("still returns a different accent for a single-color palette", () => {
      const pair = pickBrandPair(["#b2944a"]);

      expect(pair.primary).toBe("#b2944a");
      expect(pair.accent).not.toBe(pair.primary);
    });

    it("ignores invalid colors and falls back to the default pair", () => {
      expect(pickBrandPair(["", "nope", "#12"])).toEqual({
        ...DEFAULT_BRAND_PAIR,
      });
    });
  });
});
