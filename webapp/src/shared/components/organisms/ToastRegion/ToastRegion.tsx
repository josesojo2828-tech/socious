'use client'; // Importante: usa hooks

import { useToastStore } from '@/shared/store/ui/useToastStore';
import { Toast } from '@/shared/components/molecules/Toast';

export const ToastRegion = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="toast toast-end toast-top z-50 flex flex-col gap-2 w-full max-w-sm sm:w-auto">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          {...toast}
          onClose={removeToast}
        />
      ))}
    </div>
  );
};