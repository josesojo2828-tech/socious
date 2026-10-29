import { ElementType } from 'react'; // Asegúrate de importar ElementType
import { cn } from '@/shared/lib/utils';
import { TextProps, TextVariant } from './Text.types';

const stylesMap: Record<TextVariant, string> = {
  h1: 'text-4xl font-extrabold tracking-tight lg:text-5xl',
  h2: 'text-3xl font-semibold tracking-tight first:mt-0',
  h3: 'text-2xl font-semibold tracking-tight',
  h4: 'text-xl font-semibold tracking-tight',
  body: 'text-base leading-7',
  small: 'text-sm font-medium leading-none',
  muted: 'text-sm text-muted-foreground',
};

const weightMap = {
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
};

// SOLUCIÓN: Mapa explícito de qué etiqueta HTML usar por defecto para cada variante
const defaultElementMap: Record<TextVariant, ElementType> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  body: 'p',
  small: 'small',
  muted: 'p', // 'muted' se renderizará como un <p> por defecto
};

export const Text = ({
  as,
  children,
  variant = 'body',
  weight,
  className,
  ...props
}: TextProps) => {

  // Si 'as' no existe, buscamos la etiqueta correcta en el mapa
  const Component = as || defaultElementMap[variant] || 'p';

  return (
    <Component
      className={cn(
        stylesMap[variant],
        weight && weightMap[weight],
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
};