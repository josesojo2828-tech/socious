import { create } from 'zustand';

interface SidebarState {
    isOpen: boolean;        // Para mobile overlay
    isCollapsed: boolean;   // Para desktop collapse
    toggle: () => void;
    close: () => void;
    toggleCollapse: () => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
    isOpen: false,
    isCollapsed: false,
    // Mobile overlay toggle — al abrir en mobile, reseteamos collapsed
    // para que el sidebar muestre labels completos
    toggle: () => set((state) => ({
        isOpen: !state.isOpen,
        isCollapsed: !state.isOpen ? false : state.isCollapsed,
    })),
    close: () => set({ isOpen: false }),
    // Desktop collapse — al colapsar en desktop, cerramos el overlay mobile
    // para evitar estados cruzados entre breakpoints
    toggleCollapse: () => set((state) => ({
        isCollapsed: !state.isCollapsed,
        isOpen: false,
    })),
}));