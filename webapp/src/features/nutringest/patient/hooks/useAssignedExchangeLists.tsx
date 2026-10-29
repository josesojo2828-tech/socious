import { useState } from 'react';
import { apiClient } from "@/shared/api/api.client";
import { NutritionalPlanEndpoints } from '../services/nutritional-plan.endpoint';

export const useAssignedExchangeLists = (planId: string) => {
    const [isLoading, setIsLoading] = useState(false);

    const assignList = async (exchangeListId: string, portions: number, eatingMoment: string) => {
        setIsLoading(true);
        try {
            await apiClient.post(`${NutritionalPlanEndpoints.actions.unique(planId)}/exchange-lists`, {
                exchangeListId,
                portions: Number(portions),
                eatingMoment
            });
            return true;
        } catch (error) {
            console.error("Error asignando lista:", error);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const removeList = async (assignmentId: string) => {
        if (!confirm("¿Quitar este grupo del plan?")) return false;
        setIsLoading(true);
        try {
            await apiClient.delete(`${NutritionalPlanEndpoints.actions.list()}/exchange-lists/${assignmentId}`);
            return true;
        } catch (error) {
            console.error("Error eliminando asignación:", error);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    return { assignList, removeList, isLoading };
};