import { ReactNode } from 'react';

export interface DrawerProps {
  /** * ID único para conectar el toggle (input) con los botones que lo abren.
   * Es obligatorio para que funcione la magia de CSS de DaisyUI.
   */
  id: string;

  /** Contenido principal de la página (lo que se empuja o cubre) */
  children: ReactNode;

  /** Contenido del panel lateral (Sidebar, Menú, Filtros) */
  sideContent: ReactNode;

  /** * Posición del drawer:
   * - 'start': Izquierda (Default)
   * - 'end': Derecha
   */
  position?: 'start' | 'end';

  /** * Estado controlado: Si se pasa, el drawer ignora el checkbox nativo
   * y obedece a esta variable.
   */
  isOpen?: boolean;

  /** Evento al cerrar (click en overlay). Necesario si usas isOpen. */
  onClose?: () => void;

  /** Clases extra para el contenedor principal */
  className?: string;
  
  /** Clases extra para el panel lateral (ej: w-80, bg-base-200) */
  sideClassName?: string;
}