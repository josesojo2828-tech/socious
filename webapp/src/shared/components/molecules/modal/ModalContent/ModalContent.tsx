import { ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';

export const ModalContent = ({ children, className }: { children: ReactNode; className?: string }) => {
  return (
    <div className={cn('py-2 overflow-y-auto max-h-[70vh]', className)}>
      {children}
    </div>
  );
};