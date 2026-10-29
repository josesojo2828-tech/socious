import { cn } from '@/shared/lib/utils';
import { ParagraphProps } from './Paragraph.types';

const sizeMap = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
};

const weightMap = {
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
};

const alignMap = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
  justify: 'text-justify',
};

const variantMap = {
  default: 'text-base-content', // Color base de DaisyUI
  muted: 'text-base-content/60', // Opacidad para texto secundario
  primary: 'text-primary',
  secondary: 'text-secondary',
  accent: 'text-accent',
  success: 'text-success',
  error: 'text-error',
  warning: 'text-warning',
};

export const Paragraph = ({
  children,
  size = 'md',
  weight = 'normal',
  align = 'left',
  variant = 'default',
  truncate = false,
  className,
  ...props
}: ParagraphProps) => {
  return (
    <p
      className={cn(
        sizeMap[size],
        weightMap[weight],
        alignMap[align],
        variantMap[variant],
        truncate && 'truncate',
        'leading-relaxed', // Mejora la legibilidad general
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
};