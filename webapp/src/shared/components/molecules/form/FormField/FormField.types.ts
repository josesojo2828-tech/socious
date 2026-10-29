import { ReactNode } from 'react';

export interface FormFieldProps {
  /** El input, select o textarea */
  children: ReactNode;

  /** Texto de la etiqueta */
  label?: ReactNode;

  /** Mensaje de error (si existe, cambia el color del texto de ayuda) */
  error?: string;

  /** Texto de ayuda o hint (se muestra si no hay error) */
  hint?: string;

  /** ID del input para accesibilidad (htmlFor) */
  htmlFor?: string;

  /** Elemento opcional en la esquina superior derecha (ej: enlace "¿Olvidaste contraseña?") */
  topRightLabel?: ReactNode;

  className?: string;

  /** Indica si el campo es obligatorio */
  required?: boolean;
}