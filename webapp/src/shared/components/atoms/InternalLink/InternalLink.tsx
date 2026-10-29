import Link from 'next/link';
import { forwardRef } from 'react';
import { cn } from '@/shared/lib/utils';
import { InternalLinkProps } from './InternalLink.types';

const variantMap = {
  neutral: 'link-neutral',
  primary: 'link-primary',
  secondary: 'link-secondary',
  accent: 'link-accent',
  info: 'link-info',
  success: 'link-success',
  warning: 'link-warning',
  error: 'link-error',
  hover: 'link-hover',
};

export const InternalLink = forwardRef<HTMLAnchorElement, InternalLinkProps>(
  ({ 
    children, 
    className, 
    variant, 
    noUnderline = false, 
    ...props // Aquí van href, replace, scroll, prefetch, etc.
  }, ref) => {
    return (
      <Link
        ref={ref}
        className={cn(
          'link', // Clase base de DaisyUI
          variant && variantMap[variant],
          noUnderline && 'no-underline hover:underline',
          className
        )}
        {...props}
      >
        {children}
      </Link>
    );
  }
);

InternalLink.displayName = 'InternalLink';