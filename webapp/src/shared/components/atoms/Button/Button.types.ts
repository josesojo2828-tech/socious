import { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant =
  | 'neutral'
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'ghost'
  | 'link'
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'outline';

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export type ButtonShape = 'square' | 'circle';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Contenido del botón */
  children?: ReactNode;

  /** Estilo visual (color/intención) */
  variant?: ButtonVariant;

  /** Tamaño del botón */
  size?: ButtonSize;

  /** Si es true, el fondo es transparente y solo tiene borde */
  outline?: boolean;

  /** Si es true, ocupa el 100% del ancho disponible */
  block?: boolean;

  /** Si es true, añade más padding horizontal (estilo wide) */
  wide?: boolean;

  /** Muestra un spinner de carga y deshabilita el botón */
  loading?: boolean;

  /** Texto a mostrar junto al spinner de carga (opcional) */
  loadingText?: string;

  /** Forma específica (útil para botones de solo icono) */
  shape?: ButtonShape;

  /** Clases adicionales */
  className?: string;
}