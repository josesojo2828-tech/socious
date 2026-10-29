import { forwardRef } from 'react';
import { cn } from '@/shared/lib/utils';
import { ButtonProps } from './Button.types';

const variantMap = {
  neutral: 'btn-neutral rounded-xl',
  primary: 'bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white border-0 shadow-lg shadow-primary/25 hover:shadow-primary/40 rounded-xl',
  secondary: 'btn-secondary rounded-xl',
  accent: 'btn-accent rounded-xl',
  ghost: 'btn-ghost hover:bg-base-200/60 rounded-xl',
  link: 'btn-link text-indigo-600 dark:text-indigo-400 no-underline hover:underline',
  info: 'btn-info rounded-xl',
  success: 'btn-success rounded-xl',
  warning: 'btn-warning rounded-xl',
  error: 'btn-error rounded-xl',
  outline: 'btn-outline border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl',
};

const sizeMap = {
  xs: 'btn-xs text-xs px-2.5 py-1',
  sm: 'btn-sm text-xs px-3.5 py-1.5 font-medium',
  md: 'btn-md text-sm px-5 py-2.5 font-semibold',
  lg: 'btn-lg text-base px-6 py-3 font-semibold',
};

const shapeMap = {
  square: 'btn-square',
  circle: 'btn-circle',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant = 'primary',
      size = 'md',
      shape,
      outline = false,
      block = false,
      wide = false,
      loading = false,
      loadingText,
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={cn(
          'btn font-sans border-0 transition-all duration-200 ease-in-out active:scale-[0.98]',
          'focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:active:scale-100',
          variant && variantMap[variant],
          size && sizeMap[size],
          shape && shapeMap[shape],
          outline && 'btn-outline',
          block && 'w-full',
          wide && 'btn-wide',
          className
        )}
        {...props}
      >
        {loading && <span className="loading loading-spinner loading-xs mr-2"></span>}
        {loading && loadingText ? loadingText : children}
      </button>
    );
  }
);

Button.displayName = 'Button';