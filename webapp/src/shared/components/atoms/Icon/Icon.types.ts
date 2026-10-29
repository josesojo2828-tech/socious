import { LucideIcon, LucideProps } from 'lucide-react';

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

// Extendemos de Omit<LucideProps, 'ref'> para aceptar props nativas de Lucide
// excepto ref si hubiera conflicto, aunque Lucide lo maneja bien.
export interface IconProps extends Omit<LucideProps, 'ref'> {
  /** El componente de icono importado de lucide-react */
  icon: LucideIcon;

  /** Tamaño estandarizado */
  size?: IconSize;

  /** Si es true, añade la animación de spin (útil para loaders con iconos como Loader2) */
  spin?: boolean;

  /** Clases adicionales (útil para colores: text-red-500) */
  className?: string;
}
