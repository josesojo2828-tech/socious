import { HTMLAttributes } from 'react';

export type SkeletonVariant = 'circle' | 'rect' | 'text' | 'input';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** * Forma del esqueleto:
   * - 'circle': Totalmente redondo (Avatares).
   * - 'rect': Esquinas rectas (Imágenes, Banners).
   * - 'text': Esquinas ligeramente redondeadas (Líneas de texto, Inputs).
   */
  variant?: SkeletonVariant;

  /** * Clases adicionales.
   * IMPRESCINDIBLE: Aquí debes definir el ancho (w-*) y alto (h-*) 
   * del esqueleto para que coincida con el contenido real.
   */
  className?: string;
}