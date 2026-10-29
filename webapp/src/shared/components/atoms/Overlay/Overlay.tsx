import { cn } from '@/shared/lib/utils';
import { OverlayProps } from './Overlay.types';

export const Overlay = ({
  isVisible = false,
  blur = false,
  zIndex = 'z-40',
  className,
  onClick,
  ...props
}: OverlayProps) => {
  return (
    <div
      aria-hidden="true"
      onClick={onClick}
      className={cn(
        // Posicionamiento fijo que cubre toda la pantalla
        'fixed inset-0 w-full h-full',
        
        // Color base (negro semitransparente estándar)
        'bg-black/50',
        
        // Transiciones suaves
        'transition-all duration-300 ease-in-out',
        
        // Estados de visibilidad
        isVisible ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none',
        
        // Opcionales
        blur && 'backdrop-blur-sm',
        zIndex,
        className
      )}
      {...props}
    />
  );
};