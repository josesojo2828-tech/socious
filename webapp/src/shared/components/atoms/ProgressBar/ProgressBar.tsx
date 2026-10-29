import { forwardRef } from 'react';
import { cn } from '@/shared/lib/utils';
import { ProgressBarProps } from './ProgressBar.types';

const variantMap = {
  neutral: 'progress-neutral',
  primary: 'progress-primary',
  secondary: 'progress-secondary',
  accent: 'progress-accent',
  info: 'progress-info',
  success: 'progress-success',
  warning: 'progress-warning',
  error: 'progress-error',
};

// DaisyUI no tiene clases explícitas de height (xs, sm...) para progress bars en todas las versiones,
// pero a menudo respeta h-1, h-2, etc. O usa w-full por defecto.
// DaisyUI v4: La clase base .progress ya tiene un height, pero podemos forzar tamaños con clases utilitarias de altura si es necesario
// O usar las clases semánticas si DaisyUI las soporta en tu configuración. 
// Generalmente .progress es h-2.
const sizeMap = {
  xs: 'h-1',
  sm: 'h-2',
  md: 'h-4',
  lg: 'h-6',
};

export const ProgressBar = forwardRef<HTMLProgressElement, ProgressBarProps>(
  ({ 
    value, 
    max = 100, 
    variant, 
    size = 'md', 
    className, 
    ...props 
  }, ref) => {
    return (
      <progress
        ref={ref}
        value={value}
        max={max}
        className={cn(
          'progress', // Clase base de DaisyUI
          'w-full',   // Por defecto ocupa todo el ancho del contenedor
          variant && variantMap[variant],
          sizeMap[size], // Ajustamos altura manualmente con Tailwind
          className
        )}
        {...props}
      />
    );
  }
);

ProgressBar.displayName = 'ProgressBar';