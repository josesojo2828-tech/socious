import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";
import {
  deriveDarkVariant,
  deriveReadableText,
  normalizeBrandHex,
  shiftLightness,
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

describe("shiftLightness", () => {
  it("moves lightness by the delta on a known sample", () => {
    // +0.08 over brass lightens it while keeping the hue.
    expect(shiftLightness("#b2944a", 0.08)).toBe("#bfa566");
    expect(shiftLightness("#b2944a", -0.1)).toBe("#8e763b");
  });

  it("preserves hue and saturation on a fully saturated color", () => {
    // Pure red stays pure red: the shifted sample keeps R high and G=B.
    expect(shiftLightness("#ff0000", 0.1)).toBe("#ff3333");
    expect(shiftLightness("#ff0000", -0.1)).toBe("#cc0000");
  });

  it("clamps lightness at 0 and 1", () => {
    expect(shiftLightness("#000000", -0.1)).toBe("#000000");
    expect(shiftLightness("#101010", -1)).toBe("#000000");
    expect(shiftLightness("#ffffff", 0.1)).toBe("#ffffff");
  });

  it("normalizes the input before shifting", () => {
    expect(shiftLightness("#F00", 0.1)).toBe(shiftLightness("#ff0000", 0.1));
  });

  it("returns the input unchanged for invalid colors", () => {
    expect(shiftLightness("brand", 0.1)).toBe("brand");
    expect(shiftLightness("#abcd", 0.1)).toBe("#abcd");
  });
});

/**
 * Parity guard for the CSS custom properties that back `maison-style.ts`.
 *
 * A tenant without a brand must render exactly like the app did before the
 * tokens moved to `--brand-*`. That only holds if the `:root` defaults in
 * `globals.css` are byte-for-byte today's palette, so each default is pinned
 * individually here (regex per variable, never a whole-file snapshot).
 */
describe("globals.css brand defaults", () => {
  const globalsCss = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "..", "..", "app", "globals.css"),
    "utf8",
  );

  const readCustomProperty = (name: string): string | null => {
    // The trailing `\s*:` anchor makes `--brand-primary` not match
    // `--brand-primary-hover`, so every variable is read on its own.
    const match = globalsCss.match(
      new RegExp(`--${name}\\s*:\\s*(#[0-9a-fA-F]{6})\\s*;`),
    );
    return match ? match[1].toLowerCase() : null;
  };

  const expectedDefaults: Record<string, string> = {
    "brand-primary": "#b2944a",
    "brand-primary-hover": "#bf9f54",
    "brand-primary-soft": "#8e7538",
    "brand-primary-on-dark": "#d8bd77",
    "brand-primary-contrast": "#111018",
    "brand-accent": "#1a2a46",
    "brand-accent-hover": "#243a5e",
    "brand-accent-contrast": "#f0ede4",
  };

  it.each(Object.entries(expectedDefaults))(
    "pins --%s to today's %s",
    (name, hex) => {
      expect(readCustomProperty(name)).toBe(hex);
    },
  );
});
