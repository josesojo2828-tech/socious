import { ProgressHTMLAttributes } from 'react';

export type ProgressBarVariant =
  | 'neutral'
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'info'
  | 'success'
  | 'warning'
  | 'error';

export type ProgressBarSize = 'xs' | 'sm' | 'md' | 'lg';

export interface ProgressBarProps extends ProgressHTMLAttributes<HTMLProgressElement> {
  /** * Valor actual del progreso (generalmente entre 0 y 100).
   * IMPORTANTE: Si se omite o es undefined, la barra entra en modo "Indeterminado" 
   * (animación de carga infinita de izquierda a derecha).
   */
  value?: number;

  /** Valor máximo (por defecto 100) */
  max?: number;

  /** Color de la barra */
  variant?: ProgressBarVariant;

  /** Grosor de la barra */
  size?: ProgressBarSize;

  /** Clases adicionales */
  className?: string;
}