import Image from 'next/image';
import { cn } from '@/shared/lib/utils';
import { LogoProps } from './Logo.types';

// Mapeo de rutas basado en los archivos que listaste
const assetMap = {
  full: {
    blue: '/png/ImagotipoAzul.png',
    white: '/png/ImagotipoBlanco.png',
    black: '/png/ImagotipoNegro.png',
    purple: '/png/ImagotipoPurpura.png',
  },
  icon: {
    blue: '/png/IsologoAzul.png',
    white: '/png/IsologoBlanco.png',
    black: '/png/IsologoNegro.png',
    purple: '/png/IsologoPurpura.png',
  },
};

const sizeMap = {
  xs: 28,  // 28px
  sm: 40,  // 40px
  md: 64,  // 64px
  lg: 140, // 140px
  xl: 220, // 220px
};

export const Logo = ({
  variant = 'full',
  color = 'blue',
  size = 'md',
  className,
  ...props
}: LogoProps) => {
  
  const src = assetMap[variant][color];
  const width = sizeMap[size];

  return (
    <div 
      className={cn('relative flex items-center justify-center select-none', className)} 
      {...props}
    >
      <Image
        src={src}
        alt={`NutriNgest Logo ${variant}`}
        width={width}
        height={0} // height 0 + style auto mantiene el aspect ratio
        className="h-auto w-auto object-contain"
        priority={size === 'xl' || size === 'lg'} // Prioridad alta si es grande (LCP optimization)
      />
    </div>
  );
};