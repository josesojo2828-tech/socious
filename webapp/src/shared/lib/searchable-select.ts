/** Pure logic for the searchable select (no DOM, node-testable). */

export interface SearchableOption {
  value: string;
  label: string;
  /** Extra searchable text (e.g. a SKU or a group name). */
  hint?: string;
  disabled?: boolean;
}

/** Lowercase, accent-free text used for filtering. */
export function normalizeSearchText(value: string): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Options whose label (or hint) contains the query. Empty query = all. */
export function filterSearchableOptions(
  options: readonly SearchableOption[],
  query: string,
): SearchableOption[] {
  const needle = normalizeSearchText(query);
  if (!needle) return [...options];
  return options.filter(
    (option) =>
      normalizeSearchText(option.label).includes(needle) ||
      normalizeSearchText(option.hint ?? "").includes(needle),
  );
}

/** Label shown for the current value; never invents one for an unknown value. */
export function selectedOptionLabel(
  options: readonly SearchableOption[],
  value: string,
  emptyLabel = "",
): string {
  if (value === "") return emptyLabel;
  return options.find((option) => option.value === value)?.label ?? "";
}

/** Next active option with wrap-around; `-1` when there is nothing to move. */
export function nextActiveIndex(
  current: number,
  delta: number,
  length: number,
): number {
  if (length <= 0) return -1;
  if (current < 0) return delta > 0 ? 0 : length - 1;
  return (current + delta + length) % length;
}
