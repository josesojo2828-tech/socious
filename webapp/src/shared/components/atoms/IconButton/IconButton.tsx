import { forwardRef } from 'react';
import { cn } from '@/shared/lib/utils';
import { IconButtonProps } from './IconButton.types';

// Mapeo de clases de DaisyUI para el botón
const variantMap = {
  neutral: 'btn-neutral',
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  accent: 'btn-accent',
  ghost: 'btn-ghost',
  info: 'btn-info',
  success: 'btn-success',
  warning: 'btn-warning',
  error: 'btn-error',
};

const sizeMap = {
  xs: 'btn-xs',
  sm: 'btn-sm',
  md: 'btn-md',
  lg: 'btn-lg',
};

const shapeMap = {
  circle: 'btn-circle',
  square: 'btn-square',
};

// Mapeo para ajustar el tamaño del SVG interno automáticamente
const iconSizeMap = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({
    icon: Icon,
    className,
    variant,
    size = 'md',
    shape = 'circle',
    outline = false,
    loading = false,
    disabled,
    type = 'button',
    ...props
  }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={cn(
          'btn', // Base DaisyUI
          variant && variantMap[variant],
          sizeMap[size],
          shapeMap[shape],
          outline && 'btn-outline',
          className
        )}
        {...props}
      >
        {loading ? (
          <span className="loading loading-spinner loading-xs"></span>
        ) : (
          <Icon className={cn(iconSizeMap[size])} />
        )}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
