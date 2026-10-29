import { ButtonHTMLAttributes } from 'react';

export type CloseButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface CloseButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Tamaño del botón */
  size?: CloseButtonSize;
  
  /** Si es true, añade clases para posicionamiento absoluto en esquina (top-2 right-2) */
  absolute?: boolean;

  /** Clases adicionales */
  className?: string;
}