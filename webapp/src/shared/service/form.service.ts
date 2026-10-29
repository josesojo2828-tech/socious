import { Form } from "@/types/backend/form";
import { apiClient } from "../api/api.client"

interface CacheEntry {
    form: Form;
    timestamp: number;
}

const formCache: Record<string, CacheEntry> = {};
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutos de tiempo de vida (TTL)

export const GetFormByPath = async ({ 
    path, 
    forceReload = false,
    ttlMs = DEFAULT_TTL_MS
}: { 
    path: string; 
    forceReload?: boolean; 
    ttlMs?: number;
}) => {
    const now = Date.now();
    const cached = formCache[path];

    if (!forceReload && cached && (now - cached.timestamp < ttlMs)) {
        return cached.form;
    }
    const response = await apiClient.get<Form>(path);
    formCache[path] = {
        form: response.data,
        timestamp: now
    };
    return response.data;
}

/**
 * Invalida una ruta específica de la caché o toda la caché por completo.
 * Útil para forzar recargas tras modificaciones o al cerrar sesión.
 */
export const invalidateFormCache = (path?: string) => {
    if (path) {
        delete formCache[path];
    } else {
        Object.keys(formCache).forEach(key => delete formCache[key]);
    }
}
