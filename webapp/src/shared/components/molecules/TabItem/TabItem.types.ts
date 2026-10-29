import { ReactNode, MouseEvent } from 'react';
import { LucideIcon } from 'lucide-react';

export type TabSize = 'xs' | 'sm' | 'md' | 'lg';
export type TabVariant = 'bordered' | 'lifted' | 'boxed';

export interface TabItemProps {
  /** Texto de la pestaña */
  label: string;

  /** Valor único para identificar la tab */
  value: string | number;

  /** Si está activa */
  isActive?: boolean;

  /** Icono opcional */
  icon?: LucideIcon;

  /** Tamaño (debe coincidir con el contenedor padre idealmente) */
  size?: TabSize;

  /** Callback al hacer click */
  onClick?: (value: string | number) => void;

  className?: string;
}