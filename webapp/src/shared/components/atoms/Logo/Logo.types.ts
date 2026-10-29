import { HTMLAttributes } from 'react';

export type LogoVariant = 'full' | 'icon'; // Imagotipo vs Isologo
export type LogoColor = 'blue' | 'purple' | 'white' | 'black'; // Azul, Púrpura, Blanco, Negro
export type LogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface LogoProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Variante del logo:
   * - 'full': Muestra el imagotipo completo (Icono + Texto)
   * - 'icon': Muestra solo el isologo (Solo icono)
   */
  variant?: LogoVariant;

  /**
   * Color del logo.
   * Nota: Si seleccionas variant='full', por defecto usará el azul si no existe versión púrpura.
   */
  color?: LogoColor;

  /** Tamaño predefinido del logo */
  size?: LogoSize;
  
  /** Clases adicionales */
  className?: string;
}