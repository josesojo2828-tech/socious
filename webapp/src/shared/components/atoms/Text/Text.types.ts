import { ElementType, HTMLAttributes, ReactNode } from 'react';

export type TextVariant = 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'small' | 'muted';
export type TextWeight = 'normal' | 'medium' | 'semibold' | 'bold';

export interface TextProps extends HTMLAttributes<HTMLElement> {
  /** Etiqueta HTML a renderizar (ej: 'h1', 'span', 'p'). Por defecto 'p' o 'span' según variante */
  as?: ElementType;
  children: ReactNode;
  variant?: TextVariant;
  weight?: TextWeight;
  className?: string;
}