"use client";

import {
  forwardRef,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import {
  filterSearchableOptions,
  nextActiveIndex,
  selectedOptionLabel,
  type SearchableOption,
} from "@/shared/lib/searchable-select";
import type { SearchableSelectProps } from "./SearchableSelect.types";

const LIST_BOX =
  "absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-[#1a2a46]/15 bg-white py-1 shadow-xl dark:border-white/15 dark:bg-slate-950";
const OPTION_BASE =
  "cursor-pointer px-3 py-2 text-sm transition-colors";
const OPTION_IDLE =
  "text-slate-700 hover:bg-[#b2944a]/10 dark:text-slate-200";
const OPTION_ACTIVE =
  "bg-[#b2944a]/15 text-[#111018] dark:bg-[#b2944a]/20 dark:text-slate-50";

/**
 * Type-to-search select: the caller keeps control of the value, the field only
 * filters the given options. Typed text is never saved as a value — leaving
 * without choosing restores the current selection's label.
 */
export const SearchableSelect = forwardRef<
  HTMLInputElement,
  SearchableSelectProps
>(function SearchableSelect(
  {
    value,
    onChange,
    options,
    emptyLabel,
    placeholder,
    className,
    disabled = false,
    id,
    onKeyDown,
    "aria-label": ariaLabel,
  },
  ref,
) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  /** `null` = not filtering, show the selected label; string = what was typed. */
  const [query, setQuery] = useState<string | null>(null);
  const [active, setActive] = useState(-1);
  const skipMouseUp = useRef(false);

  const allOptions = useMemo<SearchableOption[]>(() => {
    const base = options.map((option) => ({ ...option }));
    return emptyLabel === undefined
      ? base
      : [{ value: "", label: emptyLabel }, ...base];
  }, [options, emptyLabel]);

  const filtered = useMemo(
    () => filterSearchableOptions(allOptions, query ?? ""),
    [allOptions, query],
  );

  const display = query ?? selectedOptionLabel(allOptions, value, emptyLabel);

  useEffect(() => {
    // The selected value changed from the outside (e.g. reset): stop filtering.
    if (!open) setQuery(null);
  }, [value, open]);

  const openList = () => {
    setOpen(true);
    const index = filtered.findIndex((option) => option.value === value);
    setActive(index >= 0 ? index : 0);
  };

  const closeList = () => {
    setOpen(false);
    setQuery(null);
    setActive(-1);
  };

  const choose = (option: SearchableOption) => {
    if (option.disabled) return;
    onChange(option.value);
    closeList();
  };

  const handleFocus = (event: FocusEvent<HTMLInputElement>) => {
    openList();
    skipMouseUp.current = true;
    const element = event.currentTarget;
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => element.select());
    }
  };

  const handleMouseUp = (event: MouseEvent<HTMLInputElement>) => {
    if (skipMouseUp.current) {
      skipMouseUp.current = false;
      event.preventDefault();
    }
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
    setOpen(true);
    setActive(0);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        openList();
        return;
      }
      setActive((current) =>
        nextActiveIndex(
          current,
          event.key === "ArrowDown" ? 1 : -1,
          filtered.length,
        ),
      );
      return;
    }

    if (event.key === "Enter") {
      if (!open) return;
      event.preventDefault();
      const option = filtered[active];
      if (option) choose(option);
      return;
    }

    if (event.key === "Escape") {
      if (!open) return;
      event.preventDefault();
      closeList();
      return;
    }

    if (event.key === "Tab") {
      closeList();
    }
  };

  return (
    <div className="relative">
      <input
        ref={ref}
        id={id}
        type="text"
        role="combobox"
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={
          open && active >= 0 ? `${listId}-option-${active}` : undefined
        }
        autoComplete="off"
        disabled={disabled}
        placeholder={placeholder}
        className={className}
        value={display}
        onChange={handleChange}
        onFocus={handleFocus}
        onMouseUp={handleMouseUp}
        onKeyDown={handleKeyDown}
        onBlur={closeList}
      />
      {open ? (
        <ul id={listId} role="listbox" className={LIST_BOX}>
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
              Sin resultados
            </li>
          ) : (
            filtered.map((option, index) => (
              <li
                key={option.value === "" ? "__empty" : option.value}
                id={`${listId}-option-${index}`}
                role="option"
                aria-selected={option.value === value}
                aria-disabled={option.disabled || undefined}
                // Keep the input focused so the click selects instead of blurring.
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(option)}
                className={`${OPTION_BASE} ${
                  index === active ? OPTION_ACTIVE : OPTION_IDLE
                } ${option.disabled ? "cursor-not-allowed opacity-50" : ""}`}
              >
                {option.label}
                {option.hint ? (
                  <span className="ml-2 text-xs text-slate-400">
                    {option.hint}
                  </span>
                ) : null}
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
});

SearchableSelect.displayName = "SearchableSelect";
