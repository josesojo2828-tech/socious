import { ButtonHTMLAttributes } from 'react';
import { LucideIcon } from 'lucide-react';

export type IconButtonVariant =
  | 'neutral'
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'ghost'
  | 'info'
  | 'success'
  | 'warning'
  | 'error';

export type IconButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export type IconButtonShape = 'circle' | 'square';

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** El componente de icono de Lucide-React */
  icon: LucideIcon;

  /** Variante de color/estilo */
  variant?: IconButtonVariant;

  /** Tamaño del botón */
  size?: IconButtonSize;

  /** Forma del botón (por defecto 'circle') */
  shape?: IconButtonShape;

  /** Si es true, muestra un borde sin relleno */
  outline?: boolean;

  /** Estado de carga (muestra spinner en lugar del icono) */
  loading?: boolean;

  /** Texto para tooltips (opcional, buena práctica de accesibilidad) */
  'aria-label'?: string;

  /** Clases extra */
  className?: string;
}