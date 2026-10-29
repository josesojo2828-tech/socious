import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

export interface EmptyStateProps {
  /** Icono principal de Lucide */
  icon?: LucideIcon;

  /** Título principal */
  title: string;

  /** Descripción detallada */
  description?: string;

  /** Acción opcional (Botón) */
  action?: ReactNode;

  /** Clases adicionales */
  className?: string;
}