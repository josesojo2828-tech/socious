import { HTMLAttributes } from 'react';

export interface OverlayProps extends HTMLAttributes<HTMLDivElement> {
  /** * Controla la visibilidad del overlay.
   * Usamos clases CSS (opacity/visibility) en lugar de renderizado condicional
   * para permitir animaciones de transición suaves.
   */
  isVisible?: boolean;

  /** * Si es true, aplica un efecto de desenfoque (glassmorphism) al fondo.
   */
  blur?: boolean;

  /**
   * Z-Index personalizado.
   * Por defecto usa z-40 para estar por debajo de modales (z-50) pero encima del contenido.
   */
  zIndex?: string;

  /** Clases adicionales */
  className?: string;

  /** Evento al hacer click (generalmente para cerrar lo que esté abierto) */
  onClick?: () => void;
}