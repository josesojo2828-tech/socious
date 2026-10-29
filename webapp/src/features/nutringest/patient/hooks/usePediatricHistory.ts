import { useState, useCallback, useEffect } from 'react';
import { apiClient } from "@/shared/api/api.client";
import { PediatricHistoryEndpoints } from '../services/pediatric-history.endpoint';

export const usePediatricHistory = (patientId: string) => {
    const [history, setHistory] = useState<any[]>([]);
    const [infantFormulas, setInfantFormulas] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // --- 1. FETCH FÓRMULAS LÁCTEAS de una historia pediátrica ---
    const fetchInfantFormulas = useCallback(async (historyId: string) => {
        if (!historyId) return;
        try {
            // GET /api/pediatric-history/:id/infant-formulas
            const response = await apiClient.get(PediatricHistoryEndpoints.actions.infantFormulas(historyId));
            setInfantFormulas(Array.isArray(response.data) ? response.data : response.data.list ?? []);
        } catch (error: any) {
            console.error("Error cargando fórmulas lácteas:", error);
            setInfantFormulas([]);
        }
    }, []);

    // --- 2. FETCH HISTORIAL (última historia pediátrica activa) ---
    const fetchHistory = useCallback(async () => {
        if (!patientId) return;
        setLoading(true);
        setError(null);
        try {
            // GET /api/pediatric-history?patientId=...
            const response = await apiClient.get(PediatricHistoryEndpoints.actions.list(), {
                params: { patientId }
            });
            const body = response.data;
            const list = Array.isArray(body) ? body : body ? [body] : [];
            setHistory(list);
            // Cargamos las fórmulas de la historia activa
            await fetchInfantFormulas(list?.[0]?.id);
        } catch (error: any) {
            console.error("Error cargando historia pediátrica:", error);
            setError(error.response?.data?.message || "Error al cargar la historia pediátrica.");
        } finally {
            setLoading(false);
        }
    }, [patientId, fetchInfantFormulas]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    // --- 3. CREAR HISTORIA ---
    const createHistory = async (data: Partial<any>) => {
        try {
            await apiClient.post(PediatricHistoryEndpoints.actions.create(), {
                ...data,
                patientId
            });
            await fetchHistory();
            return { success: true };
        } catch (error: any) {
            console.error("Error creando historia pediátrica:", error);
            const msg = error.response?.data?.message || "Error al crear la historia pediátrica.";
            return { success: false, error: Array.isArray(msg) ? msg.join(', ') : msg };
        }
    };

    // --- 4. ACTUALIZAR HISTORIA ---
    const updateHistory = async (id: string, data: Partial<any>) => {
        try {
            await apiClient.post(PediatricHistoryEndpoints.actions.update(id), data);
            await fetchHistory();
            return { success: true };
        } catch (error: any) {
            console.error("Error actualizando historia pediátrica:", error);
            const msg = error.response?.data?.message || "Error al actualizar la historia pediátrica.";
            return { success: false, error: Array.isArray(msg) ? msg.join(', ') : msg };
        }
    };

    // --- 5. ELIMINAR HISTORIA ---
    const deleteHistory = async (id: string) => {
        try {
            await apiClient.post(PediatricHistoryEndpoints.actions.delete(id));
            setHistory(prev => prev.filter(item => item.id !== id));
            setInfantFormulas([]);
            return { success: true };
        } catch (error: any) {
            console.error("Error eliminando historia pediátrica:", error);
            const msg = error.response?.data?.message || "Error al eliminar la historia pediátrica.";
            return { success: false, error: Array.isArray(msg) ? msg.join(', ') : msg };
        }
    };

    // --- 6. FÓRMULAS LÁCTEAS: CREAR ---
    const createInfantFormula = async (historyId: string, data: Partial<any>) => {
        try {
            await apiClient.post(PediatricHistoryEndpoints.actions.createInfantFormula(historyId), data);
            await fetchInfantFormulas(historyId);
            return { success: true };
        } catch (error: any) {
            console.error("Error creando fórmula láctea:", error);
            const msg = error.response?.data?.message || "Error al crear la fórmula láctea.";
            return { success: false, error: Array.isArray(msg) ? msg.join(', ') : msg };
        }
    };

    // --- 7. FÓRMULAS LÁCTEAS: ACTUALIZAR ---
    const updateInfantFormula = async (fid: string, data: Partial<any>) => {
        try {
            await apiClient.post(PediatricHistoryEndpoints.actions.updateInfantFormula(fid), data);
            const activeId = history[0]?.id;
            if (activeId) await fetchInfantFormulas(activeId);
            return { success: true };
        } catch (error: any) {
            console.error("Error actualizando fórmula láctea:", error);
            const msg = error.response?.data?.message || "Error al actualizar la fórmula láctea.";
            return { success: false, error: Array.isArray(msg) ? msg.join(', ') : msg };
        }
    };

    // --- 8. FÓRMULAS LÁCTEAS: ELIMINAR ---
    const deleteInfantFormula = async (fid: string) => {
        try {
            await apiClient.post(PediatricHistoryEndpoints.actions.deleteInfantFormula(fid));
            setInfantFormulas(prev => prev.filter(f => f.id !== fid));
            return { success: true };
        } catch (error: any) {
            console.error("Error eliminando fórmula láctea:", error);
            const msg = error.response?.data?.message || "Error al eliminar la fórmula láctea.";
            return { success: false, error: Array.isArray(msg) ? msg.join(', ') : msg };
        }
    };

    return {
        history,
        infantFormulas,
        loading,
        error,
        createHistory,
        updateHistory,
        deleteHistory,
        createInfantFormula,
        updateInfantFormula,
        deleteInfantFormula
    };
};
