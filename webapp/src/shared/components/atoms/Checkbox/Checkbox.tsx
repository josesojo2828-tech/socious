import { forwardRef } from 'react';
import { cn } from '@/shared/lib/utils';
import { CheckboxProps } from './Checkbox.types';

const variantMap = {
  primary: 'checkbox-primary focus:ring-indigo-500/20',
  secondary: 'checkbox-secondary',
  accent: 'checkbox-accent',
  success: 'checkbox-success',
  warning: 'checkbox-warning',
  error: 'checkbox-error',
  info: 'checkbox-info',
};

const sizeMap = {
  xs: 'checkbox-xs rounded',
  sm: 'checkbox-sm rounded',
  md: 'checkbox-md rounded-md',
  lg: 'checkbox-lg rounded-lg',
};

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <input
        ref={ref}
        type="checkbox"
        className={cn(
          'checkbox', // Base DaisyUI class
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

Checkbox.displayName = 'Checkbox';