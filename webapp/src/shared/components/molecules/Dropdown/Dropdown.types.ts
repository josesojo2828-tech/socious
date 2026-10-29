import { ReactNode, HTMLAttributes } from 'react';

export type DropdownPosition = 'end' | 'top' | 'bottom' | 'left' | 'right';

export interface DropdownProps extends HTMLAttributes<HTMLDivElement> {
  /** * El elemento que activa el dropdown.
   * Puede ser un <Button>, <Avatar>, o texto simple.
   */
  trigger: ReactNode;

  /** El contenido del menú (generalmente <li><a>Item</a></li>) */
  children: ReactNode;

  /** Alineación del menú desplegable */
  position?: DropdownPosition;

  /** Si es true, se abre al pasar el mouse (hover) en vez de click */
  hover?: boolean;

  /** Si es true, el menú se mantiene abierto (útil para debug o estados forzados) */
  isOpen?: boolean;

  /** Ancho del menú desplegable (ej: w-52) */
  menuClass?: string;
}