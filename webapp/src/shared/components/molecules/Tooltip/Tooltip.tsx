import { cn } from '@/shared/lib/utils';
import { TooltipProps } from './Tooltip.types';

const positionMap = {
  top: 'tooltip-top',
  bottom: 'tooltip-bottom',
  left: 'tooltip-left',
  right: 'tooltip-right',
};

const colorMap = {
  primary: 'tooltip-primary',
  secondary: 'tooltip-secondary',
  accent: 'tooltip-accent',
  info: 'tooltip-info',
  success: 'tooltip-success',
  warning: 'tooltip-warning',
  error: 'tooltip-error',
};

export const Tooltip = ({
  children,
  content,
  position = 'top',
  color,
  forceOpen = false,
  className,
}: TooltipProps) => {
  return (
    <div
      className={cn(
        'tooltip', // Clase base DaisyUI
        positionMap[position],
        color && colorMap[color],
        forceOpen && 'tooltip-open',
        className
      )}
      data-tip={content} // DaisyUI usa este atributo para el texto
    >
      {children}
    </div>
  );
};