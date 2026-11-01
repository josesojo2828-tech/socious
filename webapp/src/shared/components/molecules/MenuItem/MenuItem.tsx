import { cn } from '@/shared/lib/utils';
import { Icon } from '@/shared/components/atoms/Icon';
import { InternalLink } from '@/shared/components/atoms/InternalLink';
import { MenuItemProps } from './MenuItem.types';
import type { ReactNode } from 'react';

interface InnerContentProps {
  IconComponent?: MenuItemProps['icon'];
  label: ReactNode;
  endContent?: ReactNode;
}

// Declarado fuera del render: crear componentes durante el render resetea su estado.
const InnerContent = ({ IconComponent, label, endContent }: InnerContentProps) => (
  <>
    {IconComponent && <Icon icon={IconComponent} size="sm" />}
    <span className="flex-1 text-start">{label}</span>
    {endContent && <span>{endContent}</span>}
  </>
);

export const MenuItem = ({
  label,
  href,
  icon: IconComponent,
  isActive,
  endContent,
  disabled,
  onClick,
  className,
}: MenuItemProps) => {
  
  // Clases comunes para el elemento interactivo (<a> o <button>)
  // DaisyUI usa la clase 'active' dentro de los <li> de un .menu
  const contentClasses = cn(
    'flex items-center gap-3 py-2 px-3 rounded-lg transition-colors w-full',
    isActive ? 'active' : '',
    disabled ? 'opacity-50 pointer-events-none' : ''
  );

  return (
    <li className={cn(disabled && 'disabled', className)}>
      {href ? (
        <InternalLink href={href} className={contentClasses}>
          <InnerContent IconComponent={IconComponent} label={label} endContent={endContent} />
        </InternalLink>
      ) : (
        <button onClick={onClick} className={contentClasses} disabled={disabled}>
          <InnerContent IconComponent={IconComponent} label={label} endContent={endContent} />
        </button>
      )}
    </li>
  );
};