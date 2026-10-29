import { InputHTMLAttributes } from 'react';

export type ToggleVariant = 
  | 'primary' 
  | 'secondary' 
  | 'accent' 
  | 'success' 
  | 'warning' 
  | 'error' 
  | 'info';

export type ToggleSize = 'xs' | 'sm' | 'md' | 'lg';

export interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Color del interruptor al estar activo */
  variant?: ToggleVariant;
  
  /** Tamaño del interruptor */
  size?: ToggleSize;
  
  /** Clases adicionales */
  className?: string;
}