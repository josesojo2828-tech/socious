import { forwardRef } from 'react';
import { cn } from '@/shared/lib/utils';
import { SelectProps } from './Select.types';

const variantMap = {
  bordered: 'border border-base-300 bg-base-100 hover:border-base-300 focus:bg-base-100 focus:border-primary focus:ring-4 focus:ring-primary/10 text-base-content',
  ghost: 'select-ghost border-0 bg-transparent hover:bg-base-200 text-base-content',
};

const sizeMap = {
  xs: 'h-8 px-2.5 text-xs rounded-lg',
  sm: 'h-9 px-3 text-xs rounded-xl',
  md: 'h-11 px-4 text-sm rounded-xl',
  lg: 'h-13 px-5 text-base rounded-2xl',
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({
    options,
    placeholder,
    className,
    csize = 'md',
    variant = 'bordered',
    color = 'primary',
    error,
    fullWidth = true,
    children,
    ...props
  }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          'select w-full text-base-content font-sans',
          'transition-all duration-200 ease-in-out cursor-pointer',
          'focus:outline-none',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-base-200',
          variantMap[variant || 'bordered'],
          sizeMap[csize || 'md'],
          error && 'border-error bg-error/10 text-error focus:ring-error/15 focus:border-error',
          fullWidth ? 'w-full' : 'w-auto',
          className
        )}
        {...props}
      >
        {placeholder && (
          <option disabled value="" className="bg-base-100 text-base-content/50">
            {placeholder}
          </option>
        )}

        {options && options.length > 0
          ? options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled} className="bg-base-100 text-base-content">
                {opt.label}
              </option>
            ))
          : children}
      </select>
    );
  }
);

Select.displayName = 'Select';