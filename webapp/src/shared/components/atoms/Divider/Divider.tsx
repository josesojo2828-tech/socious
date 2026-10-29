import { cn } from '@/shared/lib/utils';
import { DividerProps } from './Divider.types';

const variantMap = {
  neutral: 'divider-neutral',
  primary: 'divider-primary',
  secondary: 'divider-secondary',
  accent: 'divider-accent',
  info: 'divider-info',
  success: 'divider-success',
  warning: 'divider-warning',
  error: 'divider-error',
};

const positionMap = {
  center: '', // Default
  start: 'divider-start',
  end: 'divider-end',
};

export const Divider = ({
  children,
  variant,
  orientation = 'horizontal',
  position = 'center',
  className,
  ...props
}: DividerProps) => {
  return (
    <div
      className={cn(
        'divider', // Clase base
        // Lógica inversa de DaisyUI: divider-horizontal crea una línea vertical visual
        orientation === 'vertical' && 'divider-horizontal',
        variant && variantMap[variant],
        position && positionMap[position],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};