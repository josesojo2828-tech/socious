import { cn } from '@/shared/lib/utils';
import { Icon } from '@/shared/components/atoms/Icon';
import { TabItemProps } from './TabItem.types';

const sizeMap = {
  xs: 'tab-xs',
  sm: 'tab-sm',
  md: '', // Default
  lg: 'tab-lg',
};

export const TabItem = ({
  label,
  value,
  isActive,
  icon: IconComponent,
  size = 'md',
  onClick,
  className,
}: TabItemProps) => {
  return (
    <a
      role="tab"
      className={cn(
        'tab', // Clase base DaisyUI
        isActive && 'tab-active',
        sizeMap[size],
        className
      )}
      onClick={() => onClick?.(value)}
    >
      {IconComponent && <Icon icon={IconComponent} size="sm" className="mr-2" />}
      {label}
    </a>
  );
};