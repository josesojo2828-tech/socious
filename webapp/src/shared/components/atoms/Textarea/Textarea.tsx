import { forwardRef } from 'react';
import { cn } from '@/shared/lib/utils';
import { TextareaProps } from './Textarea.types';

const sizeMap = {
  xs: 'p-2 text-xs rounded-lg min-h-[60px]',
  sm: 'p-2.5 text-xs rounded-xl min-h-[80px]',
  md: 'p-3.5 text-sm rounded-xl min-h-[100px]',
  lg: 'p-4 text-base rounded-2xl min-h-[120px]',
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ 
    className, 
    color = 'primary', 
    size = 'md', 
    bordered = true, 
    ghost = false, 
    ...props 
  }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'w-full text-base-content font-sans',
          'placeholder:text-base-content/50',
          'transition-all duration-200 ease-in-out',
          'focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-base-200',
          bordered 
            ? 'border border-base-300 bg-base-100/80 hover:border-base-300 focus:bg-base-100'
            : 'border-0 bg-transparent',
          ghost && 'border-0 bg-transparent hover:bg-base-200',
          sizeMap[size || 'md'],
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';