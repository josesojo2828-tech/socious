import { ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';

export const ModalFooter = ({ children, className }: { children: ReactNode; className?: string }) => {
  return (
    <div className={cn('modal-action mt-6 flex justify-end gap-2', className)}>
      {children}
    </div>
  );
};