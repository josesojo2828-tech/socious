import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '@/shared/api/api.client';
import { authStorage } from '@/shared/lib/auth.storage';
import { SidebarSection } from '@/types/backend/dashboard.type';
import { DashboardEndpoints } from '../service/dashboard.endpoints';


interface AuthState {
    isLoading: boolean;
    error: string | null;

    sidebar: SidebarSection

    loadSidebar: () => void;
}

export const useDashbaordStore = create<AuthState>()(
    persist(
        (set) => ({
            isLoading: false,
            error: null,
            sidebar: { icon: '',items: [], title:'Cargando...' },

            loadSidebar: async () => {
                set({ isLoading: true, error: null });
                set({ isLoading: false, error: null });
            },
        }),
        {
            name: 'nutringest-dashboard-ui', // Nombre en localStorage para persistir el objeto 'user'
            partialize: (state) => ({ sidebar: state.sidebar, isLoading: state.isLoading }), // Solo persistimos usuario y flag
        }
    )
);
