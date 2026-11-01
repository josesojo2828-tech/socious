import axios from 'axios';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '@/shared/api/api.client';
import { authStorage, isTokenExpired } from '@/shared/lib/auth.storage';
import { DashboardEndpoints } from '@/features/dashboard/service/dashboard.endpoints';
import { SidebarSection, TabItem } from '@/types/backend/dashboard.type';
import { User } from '@/types/backend/schema.types';
import { invalidateFormCache } from '@/shared/service/form.service';

export interface LoginResponse {
    user: User;
    tokens: {
        access_token: string;
        refresh_token: string;
    };
}

interface SidebarResponse {
    sections: SidebarSection[];
}

interface TabsResponse {
    sections: TabItem[];
}

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    sidebar: SidebarSection[];
    tabs: TabItem[];

    updateStorageUser: (user: User) => void;
    refreshSession: () => Promise<void>;

    // Acciones
    login: (email: string, password: string) => Promise<void>;
    changePassword: (oldPassword: string, newPassword: string) => Promise<{ message: string }>;

    // Añadimos un parámetro para evitar bucles infinitos
    logout: (localOnly?: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            sidebar: [{ icon: '', items: [], title: 'Cargando...' }],
            tabs: [],

            login: async (email, password) => {
                set({ isLoading: true, error: null });
                try {
                    const url = '/api/auth/login';
                    const { data } = await apiClient.post<LoginResponse>(url, { email, password });

                    authStorage.setTokens(data.tokens.access_token, data.tokens.refresh_token);

                    const sidebarPromise = apiClient.get<SidebarResponse>(DashboardEndpoints.ui.sidebar);
                    const tabsPromise = apiClient.get<TabsResponse>(DashboardEndpoints.ui.tabs);

                    const [sidebarRes, tabsRes] = await Promise.all([sidebarPromise, tabsPromise]);

                    set({
                        user: data.user,
                        isAuthenticated: true,
                        isLoading: false,
                        sidebar: sidebarRes.data.sections,
                        tabs: tabsRes.data.sections,
                    });

                } catch (err: unknown) {
                    let errorMessage = 'Error al iniciar sesión';

                    if (axios.isAxiosError(err)) {
                        errorMessage = (err.response?.data as { message?: string })?.message || errorMessage;
                    }

                    set({
                        error: errorMessage,
                        isLoading: false,
                        isAuthenticated: false
                    });
                    throw err;
                }
            },

            refreshSession: async () => {
                try {
                    const token = authStorage.getAccessToken();
                    const refreshToken = authStorage.getRefreshToken();

                    if (!token || isTokenExpired(token)) {
                        if (!refreshToken) {
                            throw new Error('No refresh token available');
                        }

                        const refreshUrl = '/api/auth/refresh';
                        const { data } = await axios.post<{ access_token: string; refresh_token: string }>(
                            refreshUrl,
                            {},
                            {
                                headers: {
                                    Authorization: `Bearer ${refreshToken}`,
                                },
                            }
                        );

                        authStorage.setTokens(data.access_token, data.refresh_token);
                    }

                    const sidebarPromise = apiClient.get<SidebarResponse>(DashboardEndpoints.ui.sidebar);
                    const tabsPromise = apiClient.get<TabsResponse>(DashboardEndpoints.ui.tabs);
                    const mePromise = apiClient.get<{ data: User | null }>('/api/user/me');

                    const [sidebarRes, tabsRes, meRes] = await Promise.all([sidebarPromise, tabsPromise, mePromise]);

                    set({
                        sidebar: sidebarRes.data.sections,
                        tabs: tabsRes.data.sections,
                        user: meRes.data.data,
                    });
                } catch (err: unknown) {
                    console.error("Error al refrescar la sesión/sidebar:", err);
                    if (axios.isAxiosError(err)) {
                        if (err.response?.status === 401) {
                            get().logout(true);
                        }
                    } else if (err instanceof Error && err.message === 'No refresh token available') {
                        get().logout(true);
                    }
                    throw err;
                }
            },

            updateStorageUser: async (user: User) => {
                set({ user });
            },

            changePassword: async (oldPassword, newPassword) => {
                const url = '/api/auth/change-password';
                const { data } = await apiClient.post<{ message: string }>(url, { oldPassword, newPassword });

                const currentUser = useAuthStore.getState().user;
                if (currentUser) {
                    set({ user: { ...currentUser, mustChangePassword: false } as User });
                }

                return data;
            },

            logout: (localOnly = false) => {
                authStorage.clearTokens();
                // Limpiar la caché de formularios dinámicos para evitar fugas de sesión o esquemas obsoletos
                invalidateFormCache();
                set({
                    user: null,
                    isAuthenticated: false,
                    error: null,
                    sidebar: [],
                    tabs: []
                });

                if (!localOnly) {
                    apiClient.post('/api/auth/logout').catch(() => { });
                }
            },
        }),
        {
            name: 'nutringest-auth-storage',
            partialize: (state) => ({
                user: state.user,
                isAuthenticated: state.isAuthenticated,
                sidebar: state.sidebar,
                tabs: state.tabs
            }),

            onRehydrateStorage: () => (state) => {
                const token = authStorage.getAccessToken();
                if (!token && state && state.isAuthenticated) {
                    console.warn("Estado hidratado pero sin token físico. Cerrando sesión...");
                    state.logout(true);
                } else if (token && state && state.isAuthenticated) {
                    // Refrescar el sidebar silenciosamente al arrancar para asegurar los permisos más recientes
                    state.refreshSession().catch(() => {});
                }
            }
        }
    )
);