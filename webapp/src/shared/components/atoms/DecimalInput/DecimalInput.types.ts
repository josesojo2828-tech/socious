import type { InputHTMLAttributes } from "react";

export type DecimalInputMode = "money" | "quantity";

/**
 * A numeric field with a fixed 2-decimal presentation.
 *
 * - `money`: cash-register mask. The typed digits are cents (`1` → `0.01`).
 * - `quantity`: plain decimal entry (`01` → `1`); `decimals = 0` for COUNT
 *   units of measure so only whole numbers are accepted.
 *
 * `onValueChange` receives canonical text (`"12.50"`, or `""` when the field
 * allows an empty value), which keeps string-based form state working as-is.
 */
export interface DecimalInputProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "type" | "value" | "onChange" | "defaultValue" | "inputMode" | "step"
  > {
  value: string | number | null | undefined;
  onValueChange: (text: string) => void;
  mode?: DecimalInputMode;
  /** Decimal places accepted and displayed. Default 2. */
  decimals?: number;
  /** When true, an empty field stays empty instead of becoming `0.00`. */
  allowEmpty?: boolean;
}
