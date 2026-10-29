import { forwardRef } from 'react';
import { cn } from '@/shared/lib/utils';
import { ToggleProps } from './Toggle.types';

const variantMap = {
  primary: 'toggle-primary focus:ring-indigo-500/20',
  secondary: 'toggle-secondary',
  accent: 'toggle-accent',
  success: 'toggle-success',
  warning: 'toggle-warning',
  error: 'toggle-error',
  info: 'toggle-info',
};

const sizeMap = {
  xs: 'toggle-xs',
  sm: 'toggle-sm',
  md: 'toggle-md',
  lg: 'toggle-lg',
};

export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <input
        ref={ref}
        type="checkbox"
        className={cn(
          'toggle', // Base DaisyUI class
          'transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1',
          variant && variantMap[variant],
          sizeMap[size],
          className
        )}
        {...props}
      />
    );
  }
);

Toggle.displayName = 'Toggle';