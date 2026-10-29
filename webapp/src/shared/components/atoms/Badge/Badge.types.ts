import { HTMLAttributes, ReactNode } from 'react';

export type BadgeVariant = 
  | 'neutral' 
  | 'primary' 
  | 'secondary' 
  | 'accent' 
  | 'ghost' 
  | 'info' 
  | 'success' 
  | 'warning' 
  | 'error';

export type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  /** Contenido del badge */
  children: ReactNode;
  
  /** Color semántico del badge */
  variant?: BadgeVariant;
  
  /** Tamaño del badge */
  size?: BadgeSize;
  
  /** Si es true, muestra solo el borde (estilo outline) */
  outline?: boolean;
  
  /** Clases adicionales */
  className?: string;
}