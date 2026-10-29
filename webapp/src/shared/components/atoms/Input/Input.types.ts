import { InputHTMLAttributes } from 'react';

export type InputVariant = 'bordered' | 'ghost';
export type InputColor = 
  | 'neutral' 
  | 'primary' 
  | 'secondary' 
  | 'accent' 
  | 'info' 
  | 'success' 
  | 'warning' 
  | 'error';
  
export type InputSize = 'xs' | 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Estilo del borde */
  variant?: InputVariant;
  
  /** Color semántico del borde/focus */
  color?: InputColor;
  
  /** Tamaño del input */
  size?: InputSize;
  
  /** Si es true, marca el input con estado de error (color rojo) */
  error?: boolean;
  
  /** Si es true, ocupa el 100% del ancho disponible */
  fullWidth?: boolean;
  
  /** Clases adicionales */
  className?: string;
}