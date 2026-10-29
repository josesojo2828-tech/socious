import { SelectHTMLAttributes } from 'react';

export interface SelectOption {
  label: string;
  value: string | number;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Lista de opciones */
  options: SelectOption[];

  /** Texto del placeholder (opción deshabilitada por defecto) */
  placeholder?: string;

  /** Tamaño */
  csize?: 'xs' | 'sm' | 'md' | 'lg';

  /** Estilo del borde */
  variant?: 'bordered' | 'ghost';

  /** Color semántico */
  color?: 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error';

  /** Estado de error */
  error?: boolean;

  /** Ocupar todo el ancho */
  fullWidth?: boolean;
}