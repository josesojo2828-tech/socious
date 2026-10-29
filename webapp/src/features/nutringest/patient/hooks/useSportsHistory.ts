import { useState, useCallback, useEffect } from 'react';
import { apiClient } from "@/shared/api/api.client";
import { SportHistoryEndpoints } from '../services/sport-history.endpoint';

export const useSportsHistory = (patientId: string) => {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // --- 1. FETCH HISTORIAL (última historia deportiva activa) ---
    const fetchHistory = useCallback(async () => {
        if (!patientId) return;
        setLoading(true);
        setError(null);
        try {
            // GET /api/sport-history?patientId=...
            const response = await apiClient.get(SportHistoryEndpoints.actions.list(), {
                params: { patientId }
            });
            const body = response.data;
            setHistory(Array.isArray(body) ? body : body ? [body] : []);
        } catch (error: any) {
            console.error("Error cargando historia deportiva:", error);
            setError(error.response?.data?.message || "Error al cargar la historia deportiva.");
        } finally {
            setLoading(false);
        }
    }, [patientId]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    // --- 2. CREAR HISTORIA ---
    const createHistory = async (data: Partial<any>) => {
        try {
            await apiClient.post(SportHistoryEndpoints.actions.create(), {
                ...data,
                patientId // Aseguramos que el ID vaya siempre
            });
            await fetchHistory();
            return { success: true };
        } catch (error: any) {
            console.error("Error creando historia deportiva:", error);
            const msg = error.response?.data?.message || "Error al crear la historia deportiva.";
            return { success: false, error: Array.isArray(msg) ? msg.join(', ') : msg };
        }
    };

    // --- 3. ACTUALIZAR HISTORIA ---
    const updateHistory = async (id: string, data: Partial<any>) => {
        try {
            await apiClient.post(SportHistoryEndpoints.actions.update(id), data);
            await fetchHistory();
            return { success: true };
        } catch (error: any) {
            console.error("Error actualizando historia deportiva:", error);
            const msg = error.response?.data?.message || "Error al actualizar la historia deportiva.";
            return { success: false, error: Array.isArray(msg) ? msg.join(', ') : msg };
        }
    };

    // --- 4. ELIMINAR HISTORIA ---
    const deleteHistory = async (id: string) => {
        try {
            await apiClient.post(SportHistoryEndpoints.actions.delete(id));
            setHistory(prev => prev.filter(item => item.id !== id));
            return { success: true };
        } catch (error: any) {
            console.error("Error eliminando historia deportiva:", error);
            const msg = error.response?.data?.message || "Error al eliminar la historia deportiva.";
            return { success: false, error: Array.isArray(msg) ? msg.join(', ') : msg };
        }
    };

    return {
        history,
        loading,
        error,
        createHistory,
        updateHistory,
        deleteHistory
    };
};
