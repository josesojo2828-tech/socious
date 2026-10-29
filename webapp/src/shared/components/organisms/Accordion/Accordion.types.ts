import { ReactNode } from 'react';

export interface AccordionItem {
  /** ID único del ítem */
  id: string;
  
  /** Título o cabecera del ítem */
  title: string;
  
  /** Contenido interno */
  content: ReactNode;
  
  /** Si true, este ítem inicia abierto por defecto */
  defaultOpen?: boolean;
}

export type AccordionVariant = 'arrow' | 'plus';

export interface AccordionProps {
  /** Array de datos a renderizar */
  items: AccordionItem[];

  /** * Comportamiento de apertura:
   * - 'single': Solo uno abierto a la vez (tipo radio).
   * - 'multiple': Independientes (tipo checkbox).
   */
  behavior?: 'single' | 'multiple';

  /** Estilo del icono indicador */
  variant?: AccordionVariant;

  /** * ID único para el grupo de inputs (necesario para behavior='single').
   * Si tienes varios acordeones en la misma página, dales ids distintos.
   */
  name?: string;

  /** Si es true, une los items visualmente sin espacios (estilo .join) */
  joined?: boolean;

  /** Clases extra para el contenedor */
  className?: string;
}