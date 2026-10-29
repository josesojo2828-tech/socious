/**
 * Trims a JS stack trace (or React `componentStack`) to the first
 * `maxLines` meaningful frames for the Telegram alert snippet:
 *
 * - drops blank lines
 * - collapses exact-duplicate frames (minified `_next/static` chunks tend to
 *   repeat the same short frame — e.g. a minified `iR` — many times, which
 *   used to burn the whole 5-line budget on noise)
 *
 * Pure function: unit-tested in `error-stack.spec.ts` (node env, no jsdom).
 */
export function sanitizeStackSnippet(
  stack: string | null | undefined,
  maxLines = 5
): string {
  if (!stack) return "No stacktrace available";

  const seen = new Set<string>();
  const frames: string[] = [];

  for (const rawLine of String(stack).split("\n")) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;
    // Dedup on the trimmed text (indentation may vary) but keep the original
    // line so the alert preserves the stack's visual structure.
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    frames.push(rawLine);
    if (frames.length >= maxLines) break;
  }

  return frames.length > 0 ? frames.join("\n") : "No stacktrace available";
}
