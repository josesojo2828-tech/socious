import { AnchorHTMLAttributes, ReactNode } from 'react';

export type LinkVariant = 
  | 'neutral' 
  | 'primary' 
  | 'secondary' 
  | 'accent' 
  | 'info' 
  | 'success' 
  | 'warning' 
  | 'error' 
  | 'hover'; // 'hover' solo subraya al pasar el mouse

export interface ExternalLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Contenido del enlace */
  children: ReactNode;
  
  /** URL de destino (Requerido) */
  href: string;

  /** Estilo visual del enlace (DaisyUI link classes) */
  variant?: LinkVariant;

  /** Si es true, quita el subrayado por defecto */
  noUnderline?: boolean;

  /** Muestra un pequeño icono de flecha indicando sitio externo */
  showIcon?: boolean;

  /** Clases adicionales */
  className?: string;
}