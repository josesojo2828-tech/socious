import type { KeyboardEvent } from "react";

export interface SearchableSelectOption {
  value: string;
  label: string;
  /** Extra searchable text (not necessarily displayed). */
  hint?: string;
  disabled?: boolean;
}

export interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: readonly SearchableSelectOption[];
  /**
   * Label for the empty value (e.g. `"Sin categoría"`). When provided, the
   * empty value is offered as the first option and clears the selection.
   */
  emptyLabel?: string;
  placeholder?: string;
  /** Classes applied to the text input, so the caller keeps its own look. */
  className?: string;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
}
