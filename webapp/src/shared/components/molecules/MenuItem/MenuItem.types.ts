import { ReactNode, MouseEvent } from 'react';
import { LucideIcon } from 'lucide-react';

export interface MenuItemProps {
  /** Etiqueta del menú */
  label: string;

  /** URL destino. Si existe, se renderiza un Link. Si no, un button. */
  href?: string;

  /** Icono de Lucide */
  icon?: LucideIcon;

  /** Si el ítem está seleccionado actualmente */
  isActive?: boolean;

  /** Elemento opcional al final (Badge, Chevron, etc.) */
  endContent?: ReactNode;

  /** Si está deshabilitado */
  disabled?: boolean;

  /** Evento click (si no es href) */
  onClick?: (e: MouseEvent<HTMLElement>) => void;

  className?: string;
}