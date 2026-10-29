export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type AvatarShape = 'circle' | 'square' | 'squircle' | 'hexagon' | 'triangle';
export type AvatarStatus = 'online' | 'offline';

export interface AvatarProps {
  /** URL de la imagen. Si es null o undefined, se activa el modo placeholder */
  src?: string | null;
  
  /** Texto alternativo para la imagen */
  alt?: string;
  
  /** Iniciales a mostrar si no hay imagen (máximo 2 caracteres recomendados) */
  initials?: string;
  
  /** Tamaño del avatar (controla width y tamaño de fuente) */
  size?: AvatarSize;
  
  /** Forma de la máscara (DaisyUI mask) */
  shape?: AvatarShape;
  
  /** Estado de conexión (online/offline) - punto de color de DaisyUI */
  status?: AvatarStatus;
  
  /** Clases CSS adicionales para el contenedor externo */
  className?: string;
  
  /** Evento click */
  onClick?: () => void;

  prefix?: boolean
}