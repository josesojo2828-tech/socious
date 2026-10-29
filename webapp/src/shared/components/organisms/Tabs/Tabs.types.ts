import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

export type TabsVariant = 'bordered' | 'lifted' | 'boxed';

export interface TabEntry {
  /** Etiqueta visible en la pestaña */
  label: string;
  
  /** Valor único para identificar la pestaña */
  value: string;
  
  /** Contenido que se mostrará cuando esta pestaña esté activa */
  content: ReactNode;
  
  /** Icono opcional */
  icon?: LucideIcon;
  
  /** Si está deshabilitada */
  disabled?: boolean;
}

export interface TabsProps {
  /** Lista de pestañas */
  items: TabEntry[];
  
  /** Valor de la pestaña seleccionada por defecto */
  defaultValue?: string;
  
  /** Estilo visual del contenedor de pestañas */
  variant?: TabsVariant;
  
  /** Si es true, las pestañas ocupan todo el ancho disponible */
  fullWidth?: boolean;
  
  /** Callback opcional al cambiar de tab */
  onChange?: (value: string) => void;
  
  /** Clases extra para el contenedor principal */
  className?: string;
  
  /** Clases extra para el área de contenido */
  contentClassName?: string;
}