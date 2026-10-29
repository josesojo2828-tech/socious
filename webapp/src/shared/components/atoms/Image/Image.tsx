'use client';

import { useState, useEffect } from 'react';
import NextImage from 'next/image';
import { cn } from '@/shared/lib/utils';
import { ImageProps } from './Image.types';

export const Image = ({
  src,
  fallbackSrc,
  alt,
  className,
  onError, // Capturamos el onError original si existiera
  ...props // Resto de props de next/image (width, height, priority, fill...)
}: ImageProps) => {
  
  // Estado interno para manejar la fuente actual de la imagen
  const [imgSrc, setImgSrc] = useState(src);

  // Si la prop 'src' cambia externamente, actualizamos el estado interno
  useEffect(() => {
    setImgSrc(src);
  }, [src]);

  return (
    <NextImage
      {...props}
      src={imgSrc}
      alt={alt}
      className={cn(
        // Clases base para asegurar buen comportamiento
        'align-middle', 
        className
      )}
      onError={(e) => {
        // Si tenemos un fallback y la imagen actual no es ya el fallback
        if (fallbackSrc && imgSrc !== fallbackSrc) {
           // Intentamos cargar el fallback
           setImgSrc(fallbackSrc);
        }
        
        // Ejecutamos el onError original si se pasó como prop
        if (onError) {
            onError(e);
        }
      }}
    />
  );
};

// displayName ayuda en las devtools de React
Image.displayName = 'ImageAtom';