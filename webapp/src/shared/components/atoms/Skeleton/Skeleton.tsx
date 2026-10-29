import { cn } from '@/shared/lib/utils';
import { SkeletonProps } from './Skeleton.types';

const variantMap = {
  circle: 'py-4 rounded-full',
  rect: 'py-4 rounded-none', // O rounded-lg dependiendo del diseño de tus cards
  text: 'py-4 rounded-md',   // Estándar para simular texto o botones,
  input: 'py-4'
};

export const Skeleton = ({
  variant = 'text',
  className,
  ...props
}: SkeletonProps) => {
  return (
    <div
      className={cn(
        'skeleton', // Clase mágica de DaisyUI (bg-base-300 + animate-pulse)
        variantMap[variant],
        className
      )}
      {...props}
    />
  );
};