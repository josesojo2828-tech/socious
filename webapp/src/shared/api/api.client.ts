import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { authStorage } from '@/shared/lib/auth.storage';
import { HOST } from '@/constants';
import { useToastStore } from '../store/ui/useToastStore';

const getBaseUrl = () => {
    let host = HOST || '';
    if (host.endsWith('/api/')) {
        host = host.slice(0, -5);
    } else if (host.endsWith('/api')) {
        host = host.slice(0, -4);
    }
    return host;
};

export const apiClient = axios.create({
    baseURL: getBaseUrl(),
    headers: { 'Content-Type': 'application/json' },
});

// =====================================================================
// MAINTENANCE MODE — Marketing phase (no backend deployed).
// Mientras sea `true`, TODAS las peticiones al backend se rechazan antes
// de salir y se muestra un aviso amigable al usuario.
// -> Cambiar a `false` cuando el backend esté disponible para restaurar
//    el comportamiento normal (token + interceptores 401 intactos).
// =====================================================================
const MAINTENANCE_MODE = false;

// Interceptor de Petición (MAINTENANCE): se registra ANTES del que añade el token,
// de modo que en modo mantenimiento ninguna request llega a salir ni al 401-handler.
apiClient.interceptors.request.use((config) => {
    if (MAINTENANCE_MODE) {
        useToastStore.getState().addToast({
            type: 'warning',
            message: 'Estamos en mantenimiento — volvé pronto',
            title: 'Mantenimiento'
        });
        return Promise.reject(new Error('Estamos en mantenimiento — volvé pronto'));
    }
    return config;
}, (error) => Promise.reject(error));

// Interceptor de Petición: Solo añade el token y el header de workspace activo, y desduplica /api/api/
// Import dinámico (en vez de `require`) para no romper el ciclo de módulos con el store;
// axios encadena los interceptores con promesas, así que el header se resuelve antes de salir.
apiClient.interceptors.request.use(async (config) => {
    if (config.url && config.url.startsWith('/api/api/')) {
        config.url = config.url.replace(/^\/api\/api\//, '/api/');
    }

    const token = authStorage.getAccessToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    try {
        const { useWorkspaceStore } = await import('../store/workspace/useWorkspaceStore');
        const activeWorkspace = useWorkspaceStore.getState().activeWorkspace;
        // Only send workspace header for organization workspaces
        if (activeWorkspace?.type === 'ORGANIZATION' && activeWorkspace?.id) {
            config.headers['X-Workspace-Id'] = activeWorkspace.id;
        }
        // Don't send header for personal workspace — backend will treat absence as null
    } catch {
        // Fallback silencioso
    }

    return config;
}, (error) => Promise.reject(error));

// Estado para la cola de peticiones en espera durante el refresco silencioso
let isRefreshing = false;
let failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else if (token) {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

// Helper para cerrar sesión silenciosamente y mostrar toast solo si estamos en /dashboard/*
const handleSessionExpiration = () => {
    authStorage.clearTokens();
    import('../store/auth/useAuthStore')
        .then(({ useAuthStore }) => useAuthStore.getState().logout(true))
        .catch(() => {});

    const isDashboardRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/dashboard');
    if (isDashboardRoute) {
        useToastStore.getState().addToast({
            type: 'error',
            message: 'Tu sesión ha expirado',
            title: 'Acceso denegado'
        });
    }

    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login') && window.location.pathname !== '/') {
        window.location.href = '/login';
    }
};

// Interceptor de Respuesta: Maneja 401 con refresco silencioso y reintento
apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const status = error.response?.status;
        const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
        const url = originalRequest?.url || '';

        const isAuthOrPublicRoute =
            url.includes('/auth/login') ||
            url.includes('/auth/logout') ||
            url.includes('/auth/refresh') ||
            url.includes('/public/');

        // Si la petición falla con 401 y NO es una ruta excluida ni se reintentó previamente
        if (status === 401 && !isAuthOrPublicRoute && originalRequest && !originalRequest._retry) {
            originalRequest._retry = true;
            const refreshToken = authStorage.getRefreshToken();

            if (refreshToken) {
                if (isRefreshing) {
                    return new Promise<string>((resolve, reject) => {
                        failedQueue.push({ resolve, reject });
                    })
                        .then((newToken) => {
                            if (originalRequest.headers) {
                                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                            }
                            return apiClient(originalRequest);
                        })
                        .catch((err) => Promise.reject(err));
                }

                isRefreshing = true;

                try {
                    const refreshUrl = `${getBaseUrl()}/api/auth/refresh`;
                    const { data } = await axios.post<{ access_token: string; refresh_token: string }>(
                        refreshUrl,
                        {},
                        {
                            headers: {
                                Authorization: `Bearer ${refreshToken}`,
                            },
                        }
                    );

                    const { access_token, refresh_token } = data;
                    authStorage.setTokens(access_token, refresh_token);

                    if (originalRequest.headers) {
                        originalRequest.headers.Authorization = `Bearer ${access_token}`;
                    }

                    processQueue(null, access_token);
                    isRefreshing = false;

                    return apiClient(originalRequest);
                } catch (refreshError) {
                    processQueue(refreshError, null);
                    isRefreshing = false;

                    handleSessionExpiration();
                    return Promise.reject(refreshError);
                }
            } else {
                handleSessionExpiration();
                return Promise.reject(error);
            }
        }

        // Si es un login fallido, mostramos su propio error (sin bucles)
        if (status === 401 && url.includes('/auth/login')) {
            useToastStore.getState().addToast({
                type: 'error',
                message: 'Credenciales inválidas',
                title: 'Error'
            });
        }

        // Manejo de suscripción vencida (403 SUBSCRIPTION_EXPIRED_BLOCKED)
        const resData = error.response?.data as { code?: string; message?: string } | undefined;
        if (status === 403 && (resData?.code === 'SUBSCRIPTION_EXPIRED_BLOCKED' || resData?.message?.includes('suscripción'))) {
            useToastStore.getState().addToast({
                type: 'error',
                message: typeof resData?.message === 'string' ? resData.message : 'Tu suscripción y tu período de gracia de 10 días han finalizado. Por favor renueva tu plan.',
                title: 'Suscripción Vencida'
            });
        }

        return Promise.reject(error);
    }
);