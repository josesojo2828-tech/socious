/**
 * Brand palette utilities for the tenant identity screen.
 *
 * The palette is read from the LOCAL `File` (FileReader → `Image` → canvas),
 * never from the uploaded URL: an http(s) image from another origin would
 * taint the canvas and `getImageData` would throw. A data URL is same-origin,
 * so the sampled pixels are always readable.
 *
 * Everything except `extractPalette` is pure and deterministic.
 */

/** Fallback pair when the logo has no useful colors or no logo was picked. */
export const DEFAULT_BRAND_PAIR = {
  primary: "#b2944a",
  accent: "#1a2a46",
} as const;

/** Longest side of the sampling canvas — enough for color, cheap to read. */
const SAMPLE_SIZE = 64;

/** Each channel is quantized to 8 buckets (32 values each). */
const BUCKET_SIZE = 32;

/** Maximum number of swatches returned to the page. */
const MAX_PALETTE_COLORS = 6;

/** Near-white / near-black pixels are background noise, not brand color. */
const WHITE_CUTOFF = 245;
const BLACK_CUTOFF = 12;

/** Redmean distance below this is "the same color" to the eye. */
const MIN_DISTINCT_DISTANCE = 120;

const PERCEIVED_LUMINANCE_THRESHOLD = 0.179;

/** WCAG relative luminance for readable black/white text over a swatch. */
const INK = "#111018";
const WHITE = "#ffffff";

const HEX_PATTERN = /^#?([0-9a-fA-F]{6})$/;

/**
 * Normalizes `#RRGGBB`, `RRGGBB` or any casing to lowercase `#rrggbb`.
 * Returns `null` for anything else (shorthand, names, rgb()).
 */
export function normalizeHex(value: string): string | null {
  const match = HEX_PATTERN.exec(value.trim());
  if (!match) return null;
  return `#${match[1].toLowerCase()}`;
}

function channelToLinear(channel: number): number {
  const ratio = channel / 255;
  return ratio <= 0.03928
    ? ratio / 12.92
    : ((ratio + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb;
  return (
    0.2126 * channelToLinear(r) +
    0.7152 * channelToLinear(g) +
    0.0722 * channelToLinear(b)
  );
}

/**
 * Chooses readable text over a swatch: brand ink on light colors, white on
 * dark ones. Invalid values fall back to the brand ink.
 */
export function contrastText(hex: string): "#111018" | "#ffffff" {
  const normalized = normalizeHex(hex);
  if (!normalized) return INK;
  return relativeLuminance(normalized) > PERCEIVED_LUMINANCE_THRESHOLD
    ? INK
    : WHITE;
}

function hexToRgb(hex: string): [number, number, number] | null {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  return [
    parseInt(normalized.slice(1, 3), 16),
    parseInt(normalized.slice(3, 5), 16),
    parseInt(normalized.slice(5, 7), 16),
  ];
}

/** Redmean color distance: closer to human perception than plain RGB. */
function colorDistance(first: string, second: string): number {
  const a = hexToRgb(first);
  const b = hexToRgb(second);
  if (!a || !b) return 0;

  const [r1, g1, b1] = a;
  const [r2, g2, b2] = b;
  const redMean = (r1 + r2) / 2;
  const r = r1 - r2;
  const g = g1 - g2;
  const bDiff = b1 - b2;

  return Math.sqrt(
    (2 + redMean / 256) * r * r +
      4 * g * g +
      (2 + (255 - redMean) / 256) * bDiff * bDiff,
  );
}

function farthestColor(from: string, candidates: string[]): string | null {
  let farthest: string | null = null;
  let farthestDistance = -1;

  for (const candidate of candidates) {
    const distance = colorDistance(from, candidate);
    if (distance > farthestDistance) {
      farthest = candidate;
      farthestDistance = distance;
    }
  }

  return farthest;
}

/**
 * When the logo yields a single color, pick whichever brand token is farther
 * from it so the preview still shows a usable pair.
 */
function fallbackAccent(primary: string): string {
  const navyDistance = colorDistance(primary, DEFAULT_BRAND_PAIR.accent);
  const brassDistance = colorDistance(primary, DEFAULT_BRAND_PAIR.primary);
  return navyDistance >= brassDistance
    ? DEFAULT_BRAND_PAIR.accent
    : DEFAULT_BRAND_PAIR.primary;
}

/**
 * Chooses the two most useful brand colors: the most frequent color plus the
 * first one that is visually distinct from it. Preserves palette order.
 */
export function pickBrandPair(palette: string[]): {
  primary: string;
  accent: string;
} {
  const colors: string[] = [];

  for (const candidate of palette) {
    const normalized = normalizeHex(candidate);
    if (normalized && !colors.includes(normalized)) colors.push(normalized);
  }

  if (colors.length === 0) return { ...DEFAULT_BRAND_PAIR };

  const primary = colors[0];
  const distinct = colors
    .slice(1)
    .find((color) => colorDistance(primary, color) >= MIN_DISTINCT_DISTANCE);
  const accent =
    distinct ??
    farthestColor(primary, colors.slice(1)) ??
    fallbackAccent(primary);

  return { primary, accent };
}

interface Bucket {
  red: number;
  green: number;
  blue: number;
  count: number;
}

function isNoise(red: number, green: number, blue: number): boolean {
  if (
    red >= WHITE_CUTOFF &&
    green >= WHITE_CUTOFF &&
    blue >= WHITE_CUTOFF
  ) {
    return true;
  }
  return red <= BLACK_CUTOFF && green <= BLACK_CUTOFF && blue <= BLACK_CUTOFF;
}

function toHex(red: number, green: number, blue: number): string {
  const channel = (value: number): string =>
    Math.max(0, Math.min(255, Math.round(value)))
      .toString(16)
      .padStart(2, "0");
  return `#${channel(red)}${channel(green)}${channel(blue)}`;
}

/** Quantizes the sampled pixels and returns the most frequent colors. */
function paletteFromPixels(
  pixels: Uint8ClampedArray,
  limit: number = MAX_PALETTE_COLORS,
): string[] {
  const buckets = new Map<number, Bucket>();

  for (let index = 0; index + 3 < pixels.length; index += 4) {
    if (pixels[index + 3] < 128) continue;

    const red = pixels[index];
    const green = pixels[index + 1];
    const blue = pixels[index + 2];
    if (isNoise(red, green, blue)) continue;

    const key =
      Math.floor(red / BUCKET_SIZE) * 64 +
      Math.floor(green / BUCKET_SIZE) * 8 +
      Math.floor(blue / BUCKET_SIZE);
    const bucket = buckets.get(key);

    if (bucket) {
      bucket.red += red;
      bucket.green += green;
      bucket.blue += blue;
      bucket.count += 1;
    } else {
      buckets.set(key, { red, green, blue, count: 1 });
    }
  }

  return [...buckets.values()]
    .map((bucket) => ({
      count: bucket.count,
      hex: toHex(
        bucket.red / bucket.count,
        bucket.green / bucket.count,
        bucket.blue / bucket.count,
      ),
    }))
    .sort(
      (first, second) =>
        second.count - first.count || first.hex.localeCompare(second.hex),
    )
    .slice(0, limit)
    .map((entry) => entry.hex);
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.onload = () => {
      const image = new Image();
      // A data URL is same-origin: drawing it never taints the canvas.
      image.onload = () => resolve(image);
      image.onerror = () =>
        reject(new Error("No se pudo interpretar la imagen."));
      image.src = typeof reader.result === "string" ? reader.result : "";
    };

    reader.readAsDataURL(file);
  });
}

function sampleDimensions(width: number, height: number) {
  const longestSide = Math.max(width, height, 1);
  const scale = Math.min(1, SAMPLE_SIZE / longestSide);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * Extracts up to six distinct colors from a local image file, most frequent
 * first. Returns `[]` when the file cannot be decoded or the canvas context
 * is unavailable (e.g. a browser without 2D support).
 */
export async function extractPalette(file: File): Promise<string[]> {
  if (typeof document === "undefined" || typeof FileReader === "undefined") {
    return [];
  }

  const image = await loadImageFromFile(file);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  if (!sourceWidth || !sourceHeight) return [];

  const { width, height } = sampleDimensions(sourceWidth, sourceHeight);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return [];

  context.drawImage(image, 0, 0, width, height);
  const { data } = context.getImageData(0, 0, width, height);

  return paletteFromPixels(data);
}
