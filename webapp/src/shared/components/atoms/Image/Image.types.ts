import { ImageProps as NextImageProps, StaticImageData } from 'next/image';

// No necesitamos re-definir src, alt, width, height, etc. ya vienen en NextImageProps.

export interface ImageProps extends NextImageProps {
  /** * URL o import estático opcional para mostrar si la imagen principal (`src`) falla al cargar.
   * Útil para avatares de usuario rotos o imágenes de productos faltantes.
   */
  fallbackSrc?: string | StaticImageData;

  /**
   * Clases adicionales de Tailwind. 
   * Se unirán inteligentemente usando cn().
   */
  className?: string;
}