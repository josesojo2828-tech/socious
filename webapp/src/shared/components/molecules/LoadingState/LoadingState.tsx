import { cn } from '@/shared/lib/utils';
import { Spinner } from '@/shared/components/atoms/Spinner';
import { Text } from '@/shared/components/atoms/Text';
import { LoadingStateProps } from './LoadingState.types';

export const LoadingState = ({
  text,
  spinnerSize = 'lg',
  spinnerColor = 'primary',
  fullScreen = false,
  className,
  ...props
}: LoadingStateProps) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 p-4',
        fullScreen ? 'min-h-screen w-full' : 'w-full h-full min-h-[200px]',
        className
      )}
      {...props}
    >
      <Spinner size={spinnerSize} color={spinnerColor} />
      
      {text && (
        <Text variant="muted" className="animate-pulse">
          {text}
        </Text>
      )}
    </div>
  );
};