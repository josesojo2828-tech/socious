import { useState, useCallback } from 'react';
import { apiClient } from "@/shared/api/api.client";
import { NutritionalPlanEndpoints } from '../services/nutritional-plan.endpoint';

export const useNutritionalPlans = (patientId: string) => {
    const [plans, setPlans] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchPlans = useCallback(async () => {
        if (!patientId) return;
        setIsLoading(true);
        try {
            const response = await apiClient.get(NutritionalPlanEndpoints.actions.list(), {
                params: { patientId }
            });
            setPlans(response.data.list || []);
        } catch (error) {
            console.error("Error cargando planes:", error);
        } finally {
            setIsLoading(false);
        }
    }, [patientId]);

    // Crear un plan nuevo
    const createPlan = async (name: string, kcalTarget: number) => {
        try {
            const response = await apiClient.post(NutritionalPlanEndpoints.actions.create(), {
                patientId,
                name,
                kcalTarget,
                // Valores por defecto
                proteinTarget: 0,
                carbsTarget: 0,
                fatsTarget: 0,
                status: 'ACTIVE'
            });
            // Redirigir al editor o recargar lista
            await fetchPlans();
            return response.data.entity; // Retorna el plan creado para redirigir
        } catch (error) {
            console.error("Error creando plan:", error);
            return null;
        }
    };

    const deletePlan = async (id: string) => {
        if(!confirm("¿Archivar este plan?")) return;
        try {
            await apiClient.post(NutritionalPlanEndpoints.actions.delete(id));
            setPlans(prev => prev.filter(p => p.id !== id));
        } catch (error) {
            console.error("Error eliminando plan:", error);
        }
    };

    return {
        plans,
        isLoading,
        fetchPlans,
        createPlan,
        deletePlan
    };
};