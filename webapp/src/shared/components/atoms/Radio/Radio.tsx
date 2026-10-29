import { forwardRef } from 'react';
import { cn } from '@/shared/lib/utils';
import { RadioProps } from './Radio.types';

const variantMap = {
  primary: 'radio-primary',
  secondary: 'radio-secondary',
  accent: 'radio-accent',
  success: 'radio-success',
  warning: 'radio-warning',
  error: 'radio-error',
  info: 'radio-info',
};

const sizeMap = {
  xs: 'radio-xs',
  sm: 'radio-sm',
  md: 'radio-md',
  lg: 'radio-lg',
};

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ className, variant, size = 'md', ...props }, ref) => {
    return (
      <input
        ref={ref}
        type="radio"
        className={cn(
          'radio',
          variant && variantMap[variant],
          sizeMap[size],
          className
        )}
        {...props}
      />
    );
  }
);
Radio.displayName = 'Radio';