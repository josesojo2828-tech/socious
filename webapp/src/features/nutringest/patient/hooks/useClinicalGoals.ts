import { useState, useCallback } from 'react';
import { apiClient } from "@/shared/api/api.client";
import { GoalEndpoints } from '../services/goal.endpoint';
import { Goal } from '@/types/nutringest/goal.interface';

// Interfaz para las métricas que devuelve el backend
export interface GoalMetrics {
    totalGoals: number;
    achievedGoals: number;
    activeGoals: number;
    successRate: number;
}

export const useClinicalGoals = (patientId: string) => {
    // Estado de la lista
    const [goals, setGoals] = useState<Goal[]>([]);
    // Estado de las métricas (KPIs)
    const [metrics, setMetrics] = useState<GoalMetrics | null>(null);
    
    const [isLoading, setIsLoading] = useState(false);

    // --- 1. FETCH DATA (Lista + Métricas) ---
    const fetchGoals = useCallback(async () => {
        if (!patientId) return;
        setIsLoading(true);
        try {
            // Ejecutamos ambas peticiones en paralelo para velocidad
            const [listResponse, metricsResponse] = await Promise.all([
                apiClient.get(GoalEndpoints.actions.list(), { params: { patientId } }),
                apiClient.get<GoalMetrics>(`/api/goals/metrics/${patientId}`) // Endpoint nuevo del backend
            ]);

            setGoals(listResponse.data.list || []);
            setMetrics(metricsResponse.data);

        } catch (error) {
            console.error("Error cargando metas y estadísticas:", error);
        } finally {
            setIsLoading(false);
        }
    }, [patientId]);

    // --- 2. CREAR META ---
    const addGoal = async (payload: any) => {
        try {
            await apiClient.post(GoalEndpoints.actions.create(), { ...payload, patientId });
            await fetchGoals(); // Recargamos para actualizar lista y gráficas
            return true;
        } catch (error) {
            console.error("Error creando meta:", error);
            return false;
        }
    };

    // --- 3. ACTUALIZAR PROGRESO ---
    const updateGoal = async (id: string, updates: any) => {
        // Optimistic UI: Actualizamos visualmente la lista inmediatamente
        const prevGoals = [...goals];
        setGoals(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));

        try {
            await apiClient.post(GoalEndpoints.actions.update(id), updates);
            // IMPORTANTE: Recargar métricas en segundo plano para que el % de éxito se actualice
            // si marcamos una meta como lograda
            const metricsResponse = await apiClient.get<GoalMetrics>(`/api/goals/metrics/${patientId}`);
            setMetrics(metricsResponse.data);
        } catch (error) {
            console.error("Error actualizando meta:", error);
            setGoals(prevGoals); // Revertir lista si falla
        }
    };

    // --- 4. ELIMINAR META ---
    const deleteGoal = async (id: string) => {
        try {
            await apiClient.post(GoalEndpoints.actions.delete(id));
            // Actualizamos estado local
            setGoals(prev => prev.filter(g => g.id !== id));
            // Recargamos métricas
            const metricsResponse = await apiClient.get<GoalMetrics>(`/api/goals/metrics/${patientId}`);
            setMetrics(metricsResponse.data);
        } catch (error) {
            console.error("Error eliminando meta:", error);
        }
    };

    return {
        goals,
        metrics, // Exponemos las métricas para la UI
        isLoading,
        fetchGoals,
        addGoal,
        updateGoal,
        deleteGoal
    };
};