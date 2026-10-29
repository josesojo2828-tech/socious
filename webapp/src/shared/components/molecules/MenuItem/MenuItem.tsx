import { cn } from '@/shared/lib/utils';
import { Icon } from '@/shared/components/atoms/Icon';
import { InternalLink } from '@/shared/components/atoms/InternalLink';
import { MenuItemProps } from './MenuItem.types';

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

  const InnerContent = () => (
    <>
      {IconComponent && <Icon icon={IconComponent} size="sm" />}
      <span className="flex-1 text-start">{label}</span>
      {endContent && <span>{endContent}</span>}
    </>
  );

  return (
    <li className={cn(disabled && 'disabled', className)}>
      {href ? (
        <InternalLink href={href} className={contentClasses}>
          <InnerContent />
        </InternalLink>
      ) : (
        <button onClick={onClick} className={contentClasses} disabled={disabled}>
          <InnerContent />
        </button>
      )}
    </li>
  );
};