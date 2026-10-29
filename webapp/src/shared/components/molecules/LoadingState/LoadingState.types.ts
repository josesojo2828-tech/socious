import { HTMLAttributes } from 'react';
import { SpinnerProps } from '@/shared/components/atoms/Spinner/Spinner.types';

export interface LoadingStateProps extends HTMLAttributes<HTMLDivElement> {
  /** Texto opcional debajo del spinner (ej: "Cargando datos...") */
  text?: string;

  /** Tamaño del spinner interno */
  spinnerSize?: SpinnerProps['size'];

  /** Color del spinner */
  spinnerColor?: SpinnerProps['color'];

  /** Si es true, ocupa toda la altura de la pantalla (h-screen) */
  fullScreen?: boolean;
  
  /** Clases adicionales */
  className?: string;
}