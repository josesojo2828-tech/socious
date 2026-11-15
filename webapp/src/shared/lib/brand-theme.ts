/**
 * Pure, DOM-free helpers for tenant branding.
 *
 * The tenant stores its brand colors as `#RRGGBB` (the identity PATCH rejects
 * anything else), but this module is defensive: the values arrive from the API
 * and a legacy payload may still carry a shorthand. Everything here is
 * deterministic so `brand-theme.spec.ts` can pin it without a browser.
 */

/** Lifted lightness used to make a brand color readable on a dark surface. */
const DARK_LIFT_RATIO = 0.45;

/** Floor: below this a color disappears into the dark background. */
const DARK_MIN_LIGHTNESS = 0.62;

/** Ceiling: above this a saturated color washes out to near-white. */
const DARK_MAX_LIGHTNESS = 0.86;

/**
 * Relative-luminance threshold where black and white text have the same WCAG
 * contrast ratio. Above it the brand ink reads better; below it, white does.
 */
const READABLE_TEXT_THRESHOLD = 0.179;

const BRAND_INK = "#111018";
const WHITE = "#ffffff";

const SHORT_HEX = /^#([0-9a-fA-F]{3})$/;
const LONG_HEX = /^#([0-9a-fA-F]{6})$/;

/**
 * Normalizes a stored brand color to lowercase `#rrggbb`.
 *
 * Accepts `#RGB` and `#RRGGBB` (the forms the identity screen can produce) and
 * returns `null` for anything else: names, `rgb()`, bare hex, wrong lengths.
 */
export function normalizeBrandHex(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();

  const short = SHORT_HEX.exec(trimmed);
  if (short) {
    const [red, green, blue] = short[1];
    return `#${red}${red}${green}${green}${blue}${blue}`.toLowerCase();
  }

  const long = LONG_HEX.exec(trimmed);
  return long ? `#${long[1].toLowerCase()}` : null;
}

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function rgbToHsl(red: number, green: number, blue: number): [number, number, number] {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) return [0, 0, lightness];

  const saturation = delta / (1 - Math.abs(2 * lightness - 1));

  let hue: number;
  if (max === r) hue = ((g - b) / delta) % 6;
  else if (max === g) hue = (b - r) / delta + 2;
  else hue = (r - g) / delta + 4;

  hue *= 60;
  if (hue < 0) hue += 360;
  return [hue, saturation, lightness];
}

function hslToRgb(
  hue: number,
  saturation: number,
  lightness: number,
): [number, number, number] {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const offset = lightness - chroma / 2;

  let r = 0;
  let g = 0;
  let b = 0;
  if (hue < 60) [r, g, b] = [chroma, x, 0];
  else if (hue < 120) [r, g, b] = [x, chroma, 0];
  else if (hue < 180) [r, g, b] = [0, chroma, x];
  else if (hue < 240) [r, g, b] = [0, x, chroma];
  else if (hue < 300) [r, g, b] = [x, 0, chroma];
  else [r, g, b] = [chroma, 0, x];

  return [
    Math.round((r + offset) * 255),
    Math.round((g + offset) * 255),
    Math.round((b + offset) * 255),
  ];
}

function rgbToHex(red: number, green: number, blue: number): string {
  const channel = (value: number): string =>
    Math.max(0, Math.min(255, value)).toString(16).padStart(2, "0");
  return `#${channel(red)}${channel(green)}${channel(blue)}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Derives the dark-surface variant of a brand color.
 *
 * Formula: convert to HSL, keep H and S untouched, and lift the lightness 45%
 * of the remaining headroom toward white
 *
 *   L' = clamp(L + (1 - L) × 0.45, 0.62, 0.86)
 *
 * The 0.62 floor keeps even a near-black brand (navy, oxblood) visible against
 * the dark background; the 0.86 ceiling stops an already-light color from
 * washing out. Because only L moves, the tenant still recognizes its hue.
 *
 * Invalid input is returned unchanged so a bad value never paints a color.
 */
export function deriveDarkVariant(hex: string): string {
  const normalized = normalizeBrandHex(hex);
  if (!normalized) return hex;

  const [hue, saturation, lightness] = rgbToHsl(...hexToRgb(normalized));
  const lifted = clamp(
    lightness + (1 - lightness) * DARK_LIFT_RATIO,
    DARK_MIN_LIGHTNESS,
    DARK_MAX_LIGHTNESS,
  );

  return rgbToHex(...hslToRgb(hue, saturation, lifted));
}

function channelToLinear(channel: number): number {
  const ratio = channel / 255;
  return ratio <= 0.03928
    ? ratio / 12.92
    : ((ratio + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const [red, green, blue] = hexToRgb(hex);
  return (
    0.2126 * channelToLinear(red) +
    0.7152 * channelToLinear(green) +
    0.0722 * channelToLinear(blue)
  );
}

/**
 * Picks the text color that reads over a brand swatch: the brand ink on light
 * colors, white on dark ones. Invalid values fall back to the brand ink.
 */
export function deriveReadableText(hex: string): "#111018" | "#ffffff" {
  const normalized = normalizeBrandHex(hex);
  if (!normalized) return BRAND_INK;

  return relativeLuminance(normalized) > READABLE_TEXT_THRESHOLD
    ? BRAND_INK
    : WHITE;
}
