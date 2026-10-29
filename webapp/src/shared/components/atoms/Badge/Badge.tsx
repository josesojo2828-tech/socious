import { cn } from '@/shared/lib/utils';
import { BadgeProps } from './Badge.types';

const variantMap = {
  neutral: 'badge-neutral',
  primary: 'badge-primary',
  secondary: 'badge-secondary',
  accent: 'badge-accent',
  ghost: 'badge-ghost',
  info: 'badge-info',
  success: 'badge-success',
  warning: 'badge-warning',
  error: 'badge-error',
};

const sizeMap = {
  xs: 'badge-xs',
  sm: 'badge-sm',
  md: 'badge-md',
  lg: 'badge-lg',
};

export const Badge = ({
  children,
  variant = 'neutral',
  size = 'md',
  outline = false,
  className,
  ...props
}: BadgeProps) => {
  return (
    <div
      className={cn(
        'badge', // Clase base de DaisyUI
        variantMap[variant],
        sizeMap[size],
        outline && 'badge-outline',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};