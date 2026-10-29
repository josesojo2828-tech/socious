'use client';

import { cn } from '@/shared/lib/utils';
import { AvatarProps } from './Avatar.types';
import { HOST } from '@/constants';

// Mapas de configuración para mantener el JSX limpio
const sizeMap = {
  xs: 'w-8 text-xs',
  sm: 'w-12 text-sm',
  md: 'w-16 text-base',
  lg: 'w-24 text-xl',
  xl: 'w-32 text-2xl',
};

const shapeMap = {
  circle: 'rounded-full',
  square: 'rounded-btn',
  squircle: 'mask mask-squircle',
  hexagon: 'mask mask-hexagon',
  triangle: 'mask mask-triangle',
};

export const Avatar = ({
  src,
  alt = 'Avatar',
  initials = '?',
  size = 'md',
  shape = 'circle',
  status,
  className,
  onClick,
  prefix = false
}: AvatarProps) => {
  const isPlaceholder = !src;

  let imageUrl = null;
  if (src) {
    if (src.startsWith('http') || src.startsWith('/')) {
      imageUrl = src;
    } else {
      imageUrl = prefix ? `${HOST}${src}` : src;
    }
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'avatar', // Clase base de DaisyUI
        isPlaceholder && 'placeholder', // Activa estilos de texto centrado
        status && status, // 'online' u 'offline' aplican directamente en DaisyUI
        className,
      )}
    >
      <div className={cn(
        sizeMap[size],
        shapeMap[shape],
        // Fondo neutro por defecto si es placeholder
        isPlaceholder && 'bg-slate-100 text-slate-500 font-bold',
        "flex items-center justify-center relative overflow-hidden"
      )}>
        {imageUrl ? (
          <img
            className='absolute top-0 left-0 w-full h-full object-cover'
            src={imageUrl}
            alt={alt}
            onError={(e) => {
              // Fallback en caso de que la imagen falle al cargar
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).parentElement?.classList.add('placeholder', 'bg-slate-100', 'text-slate-500');
            }}
          />
        ) : (
          <span className="uppercase select-none">
            {initials}
          </span>
        )}
      </div>
    </div>
  );
};