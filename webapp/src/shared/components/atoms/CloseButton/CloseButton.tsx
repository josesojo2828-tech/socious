import { forwardRef } from 'react';
import { cn } from '@/shared/lib/utils';
import { CloseButtonProps } from './CloseButton.types';

const sizeMap = {
  xs: 'btn-xs',
  sm: 'btn-sm',
  md: 'btn-md',
  lg: 'btn-lg',
};

const iconSizeMap = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

export const CloseButton = forwardRef<HTMLButtonElement, CloseButtonProps>(
  ({ className, size = 'md', absolute = false, type = 'button', ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        aria-label="Cerrar"
        className={cn(
          'btn btn-circle btn-ghost', // Estilo base DaisyUI
          sizeMap[size],
          absolute && 'absolute right-2 top-2', // Posicionamiento típico en Modales/Alertas
          className
        )}
        {...props}
      >
        {/* SVG de la "X" */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={cn(iconSizeMap[size])}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    );
  }
);

CloseButton.displayName = 'CloseButton';