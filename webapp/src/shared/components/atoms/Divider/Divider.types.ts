import { HTMLAttributes, ReactNode } from 'react';

export type DividerVariant =
  | 'neutral'
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'info'
  | 'success'
  | 'warning'
  | 'error';

export type DividerOrientation = 'horizontal' | 'vertical';

export type DividerPosition = 'center' | 'start' | 'end';

export interface DividerProps extends HTMLAttributes<HTMLDivElement> {
  /** Texto o contenido opcional dentro del divisor */
  children?: ReactNode;

  /** Color semántico */
  variant?: DividerVariant;

  /** * Orientación visual de la línea.
   * - 'horizontal': Línea acostada (—) para separar elementos apilados verticalmente.
   * - 'vertical': Línea parada (|) para separar elementos puestos lado a lado.
   */
  orientation?: DividerOrientation;

  /** Posición del texto (si hay children) */
  position?: DividerPosition;

  /** Clases adicionales */
  className?: string;
}