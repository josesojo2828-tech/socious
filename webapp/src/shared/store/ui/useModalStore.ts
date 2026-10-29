import { create } from 'zustand';
import { ReactNode } from 'react';

interface ModalState {
    isOpen: boolean;
    view: ReactNode | null; // El componente a renderizar dentro

    // Opciones extra si las necesitas (ej: no cerrar al hacer click fuera)
    options?: {
        preventClose?: boolean;
        size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
        className?: string;
    };

    openModal: (view: ReactNode, options?: ModalState['options']) => void;
    closeModal: () => void;
}

export const useModalStore = create<ModalState>((set) => ({
    isOpen: false,
    view: null,
    options: {},

    openModal: (view, options = {}) => set({
        isOpen: true,
        view,
        options
    }),

    closeModal: () => set({
        isOpen: false,
        view: null,
        options: {}
    }),
}));