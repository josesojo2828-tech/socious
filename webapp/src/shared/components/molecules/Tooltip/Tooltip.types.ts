import { ReactNode } from 'react';

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';
export type TooltipColor = 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error';

export interface TooltipProps {
  /** El elemento sobre el que se hace hover */
  children: ReactNode;

  /** El texto a mostrar en el tooltip */
  content: string;

  /** Posición del tooltip */
  position?: TooltipPosition;

  /** Color del tooltip */
  color?: TooltipColor;

  /** Si es true, fuerza que el tooltip esté siempre visible */
  forceOpen?: boolean;

  className?: string;
}