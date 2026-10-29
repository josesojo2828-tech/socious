import { ToastMessage } from '@/shared/store/ui/useToastStore'; // Ajusta la ruta según creaste el store

export interface ToastProps extends ToastMessage {
  onClose: (id: string) => void;
  className?: string;
}