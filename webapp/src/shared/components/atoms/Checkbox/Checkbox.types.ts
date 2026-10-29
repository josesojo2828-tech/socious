import { InputHTMLAttributes } from 'react';

export type CheckboxVariant =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'success'
  | 'warning'
  | 'error'
  | 'info';

export type CheckboxSize = 'xs' | 'sm' | 'md' | 'lg';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Color del checkbox al estar marcado */
  variant?: CheckboxVariant;

  /** Tamaño del checkbox */
  size?: CheckboxSize;

  /** Clases adicionales */
  className?: string;
}