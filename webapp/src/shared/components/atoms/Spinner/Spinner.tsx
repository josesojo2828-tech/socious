import { cn } from '@/shared/lib/utils';
import { SpinnerProps } from './Spinner.types';

const typeMap = {
  spinner: 'loading-spinner',
  dots: 'loading-dots',
  ring: 'loading-ring',
  ball: 'loading-ball',
  bars: 'loading-bars',
  infinity: 'loading-infinity',
};

const sizeMap = {
  xs: 'loading-xs',
  sm: 'loading-sm',
  md: 'loading-md',
  lg: 'loading-lg',
};

const colorMap = {
  primary: 'text-primary',
  secondary: 'text-secondary',
  accent: 'text-accent',
  neutral: 'text-neutral',
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error',
};

export const Spinner = ({
  variant = 'spinner',
  size = 'md',
  color,
  className,
  ...props
}: SpinnerProps) => {
  return (
    <span
      className={cn(
        'loading',
        typeMap[variant],
        sizeMap[size],
        color && colorMap[color],
        className
      )}
      {...props}
    />
  );
};