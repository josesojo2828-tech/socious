import { cn } from '@/shared/lib/utils';
import { Icon } from '@/shared/components/atoms/Icon';
import { CloseButton } from '@/shared/components/atoms/CloseButton';
import { Info, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { ToastProps } from './Toast.types';

const typeStyles = {
  info: 'alert-info',
  success: 'alert-success',
  warning: 'alert-warning',
  error: 'alert-error',
};

const iconMap = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
};

export const Toast = ({ id, message, title, type = 'info', onClose, className }: ToastProps) => {
  return (
    <div className={cn('alert shadow-lg flex flex-row items-center gap-3 w-full min-w-0 sm:min-w-[300px]', typeStyles[type], className)}>
      <Icon icon={iconMap[type]} size="lg" className="mt-1 shrink-0" />
      
      <div className="flex-1 min-w-0">
        {title && <h3 className="font-bold text-sm whitespace-normal break-words">{title}</h3>}
        <div className="text-sm whitespace-normal break-words">{message}</div>
      </div>

      <CloseButton 
        size="xs" 
        onClick={() => onClose(id)} 
        className="btn-ghost btn-sm -mr-2 -mt-1 shrink-0"
      />
    </div>
  );
};