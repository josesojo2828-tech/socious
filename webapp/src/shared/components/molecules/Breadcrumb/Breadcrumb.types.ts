import { ReactNode } from 'react';

export interface BreadcrumbItem {
  /** Texto a mostrar */
  label: string;
  /** URL destino (si se omite, se renderiza como texto plano/activo) */
  href?: string;
  /** Icono opcional al inicio del item */
  icon?: ReactNode;
}

export interface BreadcrumbProps {
  /** Array de rutas */
  items: BreadcrumbItem[];
  
  /** Clases adicionales */
  className?: string;
}