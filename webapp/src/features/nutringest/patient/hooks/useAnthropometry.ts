import { useState, useCallback } from 'react';
import { apiClient } from "@/shared/api/api.client";
import { AnthropometryEndpoints } from '../../patient/services/anthropometry.endpoint';

export const useAnthropometry = (patientId: string) => {
    const [history, setHistory] = useState<any[]>([]); 
    const [isLoading, setIsLoading] = useState(false);
    
    // --- 1. FETCH HISTORIAL ---
    const fetchHistory = useCallback(async () => {
        if (!patientId) return;
        setIsLoading(true);
        try {
            // GET /api/anthropometry?patientId=...
            const response = await apiClient.get(AnthropometryEndpoints.actions.list(), {
                params: { patientId }
            });
            // apiClient suele devolver la respuesta de axios completa o la data directa según config.
            // Asumimos comportamiento estándar de axios aquí (response.data)
            setHistory(Array.isArray(response.data) ? response.data : response.data.list);
        } catch (error) {
            console.error("Error cargando antropometría:", error);
        } finally {
            setIsLoading(false);
        }
    }, [patientId]);

    // --- 2. REGISTRAR MEDICIÓN ---
    const addMeasurement = async (data: Partial<any>) => {
        try {
            await apiClient.post(AnthropometryEndpoints.actions.create(), {
                ...data,
                patientId // Aseguramos que el ID vaya siempre
            });
            
            // Recargar para actualizar gráficas/tablas
            await fetchHistory();
            return { success: true };
        } catch (error: any) {
            console.error("Error guardando medidas:", error);
            const msg = error.response?.data?.message || "Error al registrar medición.";
            return { 
                success: false, 
                error: Array.isArray(msg) ? msg.join(', ') : msg 
            };
        }
    };

    // --- 2.5. ACTUALIZAR MEDICIÓN ---
    const updateMeasurement = async (id: string, data: Partial<any>) => {
        try {
            await apiClient.post(AnthropometryEndpoints.actions.update(id), data);
            await fetchHistory();
            return { success: true };
        } catch (error: any) {
            console.error("Error actualizando medidas:", error);
            const msg = error.response?.data?.message || "Error al actualizar medición.";
            return { 
                success: false, 
                error: Array.isArray(msg) ? msg.join(', ') : msg 
            };
        }
    };

    // --- 3. ELIMINAR ---
    const removeMeasurement = async (id: string) => {
        if (!confirm("¿Eliminar este registro?")) return { success: false, cancelled: true };
        try {
            await apiClient.post(AnthropometryEndpoints.actions.delete(id));
            setHistory(prev => prev.filter(item => item.id !== id));
            return { success: true };
        } catch (error: any) {
            console.error("Error eliminando:", error);
            const msg = error.response?.data?.message || "Error al eliminar medición.";
            return { success: false, error: Array.isArray(msg) ? msg.join(', ') : msg };
        }
    };

    return {
        history,
        isLoading,
        fetchHistory,
        addMeasurement,
        updateMeasurement,
        removeMeasurement
    };
};