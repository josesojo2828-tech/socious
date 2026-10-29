import { LinkProps as NextLinkProps } from 'next/link';
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
  | 'hover'; // Solo subraya al pasar el mouse

// Combinamos props de Next.js + props de HTML <a>
export interface InternalLinkProps extends NextLinkProps, Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof NextLinkProps> {
  /** Contenido del enlace */
  children: ReactNode;

  /** Estilo visual (DaisyUI link classes) */
  variant?: LinkVariant;

  /** Si es true, elimina el subrayado por defecto */
  noUnderline?: boolean;
}