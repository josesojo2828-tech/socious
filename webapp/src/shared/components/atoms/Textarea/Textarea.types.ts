import { TextareaHTMLAttributes } from 'react';

export type TextareaColor = 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error';
export type TextareaSize = 'xs' | 'sm' | 'md' | 'lg';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Color del borde/focus */
  color?: TextareaColor;
  
  /** Altura/Tamaño del texto */
  size?: TextareaSize;
  
  /** Si es true, muestra el borde (default). False para estilo flat. */
  bordered?: boolean;
  
  /** Estilo transparente sin fondo */
  ghost?: boolean;
  
  /** Clases extra (ej: h-24 para altura fija) */
  className?: string;
}