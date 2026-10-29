import { ReactNode } from 'react';
import { useModalStore } from '@/shared/store/ui/useModalStore';
import { CloseButton } from '@/shared/components/atoms/CloseButton';

interface ModalHeaderProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}

export const ModalHeader = ({ title, subtitle, children }: ModalHeaderProps) => {
  const { closeModal } = useModalStore();

  return (
    <div className="flex items-start justify-between pb-4 mb-5 border-b border-slate-100">
      <div className="flex-1 pr-4">
        <h3 className="text-xl font-bold tracking-tight text-slate-900">
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs text-slate-500 mt-1">
            {subtitle}
          </p>
        )}
        {children}
      </div>
      <CloseButton onClick={closeModal} className="ml-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors" />
    </div>
  );
};