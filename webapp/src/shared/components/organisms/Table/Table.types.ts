import { Column } from '@/types/backend/table.type';
import { ActionsType } from '@/types/requets';
import { ReactNode } from 'react';

/**
 * Definición de una columna para un tipo de dato T
 */
export interface TableColumn<T> {
  /** Título de la cabecera */
  header: ReactNode;
  
  /** * Clave de la propiedad a mostrar directamente (ej: 'name').
   * Si necesitas formateo complejo, usa 'render'.
   */
  accessor_key?: keyof T;
  
  /** * Función personalizada para renderizar la celda.
   * Tiene prioridad sobre accessor_key.
   */
  render?: (item: T) => ReactNode;
  
  /** Clases para la celda (th y td), útil para anchos (w-20) o alineación (text-right) */
  className?: string;
}

export interface TableProps<T> {
  /** Array de datos */
  data: T[];

  actions: ActionsType;
  
  /** Configuración de columnas */
  columns: Column[];
  
  /** Función para obtener la key única de cada fila (ej: item => item.id) */
  keyExtractor: (item: T) => string | number;
  
  /** Estado de carga */
  isLoading?: boolean;
  
  /** Componente a mostrar si no hay datos (EmptyState molecule) */
  emptyState?: ReactNode;
  
  /** Evento al hacer click en una fila */
  onRowClick?: (item: T) => void;

  onAction?: (actionKey: string, item: any) => void;

  renderCell?: (field: string, entity: any) => ReactNode | undefined;

  /** Extra action buttons rendered in the actions column */
  extraActions?: (item: T, openModal: (view: React.ReactNode) => void) => ReactNode;

  /** Modal store open function (needed by extraActions) */
  openModal?: (view: React.ReactNode) => void;
  
  /** Estilo de filas alternadas (Zebra) */
  zebra?: boolean;
  
  /** Tabla compacta (menos padding) */
  compact?: boolean;
  
  /** Sticky Header (Cabecera fija al hacer scroll) */
  stickyHeader?: boolean;
  
  className?: string;
}
