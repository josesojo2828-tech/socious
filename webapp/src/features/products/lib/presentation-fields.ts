/** Display helpers for the type row (tallas + medida con unidad). */

/** `"70"` + `"cm"` → `"70 cm"`; `"—"` when both are empty. */
export function presentationMeasureLabel(
  measures?: string | null,
  measureUnit?: string | null,
): string {
  const parts = [measures, measureUnit]
    .map((value) => (value ?? "").trim())
    .filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "—";
}

/** Saved size label (catalog or custom); `"—"` when there is no size. */
export function presentationSizeLabel(
  sizeLabel?: string | null,
): string {
  return (sizeLabel ?? "").trim() || "—";
}
