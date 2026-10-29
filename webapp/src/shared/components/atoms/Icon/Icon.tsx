import { cn } from '@/shared/lib/utils';
import { IconProps } from './Icon.types';

// Mapeo de tamaños a clases de Tailwind
// Lucide usa 'currentColor' por defecto, así que el color se hereda del texto
const sizeMap = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5', // Tamaño estándar recomendado para UI (20px)
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
  '2xl': 'w-10 h-10',
};

export const Icon = ({
  icon: IconComponent,
  size = 'md',
  spin = false,
  className,
  ...props // Pasa props extra como strokeWidth, absoluteStrokeWidth, etc.
}: IconProps) => {
  return (
    <IconComponent
      className={cn(
        sizeMap[size],
        spin && 'animate-spin',
        className
      )}
      {...props}
    />
  );
};