import { HTMLAttributes, ReactNode } from 'react';

export type ParagraphSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type ParagraphWeight = 'normal' | 'medium' | 'semibold' | 'bold';
export type ParagraphAlign = 'left' | 'center' | 'right' | 'justify';
export type ParagraphVariant = 
  | 'default'   // Color normal del tema
  | 'muted'     // Color suavizado (grisáceo/opaco)
  | 'primary' 
  | 'secondary' 
  | 'accent' 
  | 'success' 
  | 'error' 
  | 'warning';

export interface ParagraphProps extends HTMLAttributes<HTMLParagraphElement> {
  /** Contenido del texto */
  children: ReactNode;

  /** Tamaño de la fuente */
  size?: ParagraphSize;

  /** Peso de la fuente */
  weight?: ParagraphWeight;

  /** Alineación del texto */
  align?: ParagraphAlign;

  /** Variante de color (integrado con DaisyUI) */
  variant?: ParagraphVariant;

  /** Si es true, trunca el texto con "..." si es muy largo (1 línea) */
  truncate?: boolean;

  /** Clases adicionales */
  className?: string;
}