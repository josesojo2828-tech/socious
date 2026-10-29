import { forwardRef } from 'react';
import { cn } from '@/shared/lib/utils';
import { InputProps } from './Input.types';

const variantMap = {
  bordered: 'border border-base-300 bg-base-100/80 hover:border-base-300 focus:bg-base-100 focus:border-primary focus:ring-4 focus:ring-primary/10 text-base-content placeholder:text-base-content/50',
  ghost: 'input-ghost border-0 bg-transparent hover:bg-base-200 text-base-content placeholder:text-base-content/50',
};

const sizeMap = {
  xs: 'h-8 px-2.5 text-xs rounded-lg',
  sm: 'h-9 px-3 text-xs rounded-xl',
  md: 'h-11 px-4 text-sm rounded-xl',
  lg: 'h-13 px-5 text-base rounded-2xl',
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    variant = 'bordered', 
    color = 'primary', 
    size = 'md', 
    error = false, 
    fullWidth = true,
    type = 'text',
    ...props 
  }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          'w-full text-base-content font-sans',
          'transition-all duration-200 ease-in-out',
          'focus:outline-none',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-base-200',
          variantMap[variant || 'bordered'],
          sizeMap[size || 'md'],
          error && 'border-error bg-error/10 text-error focus:ring-error/15 focus:border-error',
          fullWidth ? 'w-full' : 'w-auto',
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';