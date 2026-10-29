import { forwardRef } from 'react';
import { cn } from '@/shared/lib/utils';
import { ExternalLinkProps } from './ExternalLink.types';

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

export const ExternalLink = forwardRef<HTMLAnchorElement, ExternalLinkProps>(
  ({ 
    children, 
    className, 
    variant, 
    showIcon = false, 
    noUnderline = false,
    target = '_blank', // Por defecto abre nueva pestaña
    rel, 
    ...props 
  }, ref) => {
    
    // Seguridad automática: si es _blank, forzamos noopener noreferrer
    const secureRel = target === '_blank' 
      ? (rel ? `${rel} noopener noreferrer` : 'noopener noreferrer') 
      : rel;

    return (
      <a
        ref={ref}
        target={target}
        rel={secureRel}
        className={cn(
          'link', // Clase base DaisyUI
          variant && variantMap[variant],
          noUnderline && 'no-underline hover:underline', // Utilidad visual común
          'inline-flex items-center gap-1', // Alineación para el icono
          className
        )}
        {...props}
      >
        {children}
        
        {showIcon && (
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 20 20" 
            fill="currentColor" 
            className="w-3 h-3 opacity-70" // Icono pequeño y sutil
          >
            <path 
              fillRule="evenodd" 
              d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z" 
              clipRule="evenodd" 
            />
            <path 
              fillRule="evenodd" 
              d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z" 
              clipRule="evenodd" 
            />
          </svg>
        )}
      </a>
    );
  }
);

ExternalLink.displayName = 'ExternalLink';