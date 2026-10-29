import { create } from 'zustand';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastMessage {
  id: string;
  title?: string;
  message: string;
  type?: ToastType;
  duration?: number; // ms
}

interface ToastState {
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9); // Genera ID único
    const newToast = { ...toast, id };

    set((state) => {
      // Evitar agregar toasts duplicados si ya hay uno visible con el mismo mensaje
      if (state.toasts.some((t) => t.message === toast.message)) {
        return state;
      }
      return { toasts: [...state.toasts, newToast] };
    });

    // Auto-eliminación
    if (toast.duration !== Infinity) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, toast.duration || 3000); // 3 segundos por defecto
    }
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));