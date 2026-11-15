"use client";

import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type ChangeEventHandler,
  type FocusEventHandler,
  type MouseEventHandler,
} from "react";
import {
  moneyText,
  quantityTextFromDraft,
  quantityTextFromValue,
  sanitizeMoneyDigits,
  sanitizeQuantityDraft,
  toMoneyDigits,
} from "@/shared/lib/decimal-input";
import type { DecimalInputMode, DecimalInputProps } from "./DecimalInput.types";

function zeroText(decimals: number): string {
  return (0).toFixed(decimals);
}

/** Text the field shows when it is not being edited. */
function displayOf(
  value: DecimalInputProps["value"],
  mode: DecimalInputMode,
  decimals: number,
  allowEmpty: boolean,
): string {
  if (mode === "money") {
    return moneyText(toMoneyDigits(value, decimals), decimals, allowEmpty);
  }
  return quantityTextFromValue(value, decimals) || (allowEmpty ? "" : zeroText(decimals));
}

export const DecimalInput = forwardRef<HTMLInputElement, DecimalInputProps>(
  function DecimalInput(
    {
      value,
      onValueChange,
      mode = "quantity",
      decimals = 2,
      allowEmpty = false,
      onFocus,
      onBlur,
      onMouseUp,
      className,
      ...rest
    },
    ref,
  ) {
    const [focused, setFocused] = useState(false);
    const [draft, setDraft] = useState<string>(() =>
      displayOf(value, mode, decimals, allowEmpty),
    );
    /** Selecting all on focus is undone by the click's mouseup unless we stop it. */
    const justFocused = useRef(false);

    useEffect(() => {
      if (!focused) setDraft(displayOf(value, mode, decimals, allowEmpty));
    }, [value, mode, decimals, allowEmpty, focused]);

    const handleFocus: FocusEventHandler<HTMLInputElement> = (event) => {
      onFocus?.(event);
      setFocused(true);
      justFocused.current = true;
      const element = event.currentTarget;
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(() => element.select());
      }
    };

    const handleMouseUp: MouseEventHandler<HTMLInputElement> = (event) => {
      if (justFocused.current) {
        justFocused.current = false;
        event.preventDefault();
      }
      onMouseUp?.(event);
    };

    const handleChange: ChangeEventHandler<HTMLInputElement> = (event) => {
      const raw = event.target.value;
      if (mode === "money") {
        const digits = sanitizeMoneyDigits(raw);
        const text = digits === "" ? "" : moneyText(digits, decimals);
        setDraft(text);
        onValueChange(text);
        return;
      }
      const next = sanitizeQuantityDraft(raw, decimals);
      setDraft(next);
      onValueChange(next);
    };

    const handleBlur: FocusEventHandler<HTMLInputElement> = (event) => {
      onBlur?.(event);
      setFocused(false);
      const text =
        mode === "money"
          ? draft === ""
            ? allowEmpty
              ? ""
              : moneyText("", decimals)
            : draft
          : quantityTextFromDraft(draft, decimals, allowEmpty);
      if (text !== draft) setDraft(text);
      onValueChange(text);
    };

    return (
      <input
        {...rest}
        ref={ref}
        type="text"
        inputMode={decimals > 0 ? "decimal" : "numeric"}
        value={draft}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onMouseUp={handleMouseUp}
        className={className}
      />
    );
  },
);

DecimalInput.displayName = "DecimalInput";
