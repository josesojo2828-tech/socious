import { cn } from '@/shared/lib/utils';
import { Icon } from '@/shared/components/atoms/Icon';
import { Text } from '@/shared/components/atoms/Text';
import { EmptyStateProps } from './EmptyState.types';

export const EmptyState = ({
  icon: IconComponent,
  title,
  description,
  action,
  className,
}: EmptyStateProps) => {
  return (
    <div 
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 rounded-lg border-2 border-dashed border-base-300 bg-base-100/50 min-h-[300px]',
        className
      )}
    >
      {IconComponent && (
        <div className="bg-base-200 p-4 rounded-full mb-4">
          <Icon icon={IconComponent} size="2xl" className="text-base-content/50" />
        </div>
      )}

      <Text variant="h3" className="mb-2">
        {title}
      </Text>

      {description && (
        <Text variant="muted" className="max-w-sm mb-6">
          {description}
        </Text>
      )}

      {action && (
        <div className="mt-2">
          {action}
        </div>
      )}
    </div>
  );
};