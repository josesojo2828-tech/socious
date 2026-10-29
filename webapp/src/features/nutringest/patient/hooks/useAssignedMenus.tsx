import { useState } from 'react';
import { apiClient } from "@/shared/api/api.client";
import { NutritionalPlanEndpoints } from '../services/nutritional-plan.endpoint';

export const useAssignedMenus = (planId: string) => {
    const [isLoading, setIsLoading] = useState(false);

    const assignMenu = async (menuId: string, eatingMoment: string, notes?: string) => {
        setIsLoading(true);
        try {
            await apiClient.post(`${NutritionalPlanEndpoints.actions.unique(planId)}/menus`, { menuId,eatingMoment,notes });
            return true;
        } catch (error) {
            console.error("Error asignando menú:", error);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    // Quitar menú del plan
    const removeMenu = async (assignmentId: string) => {
        if (!confirm("¿Quitar este menú del plan?")) return false;
        setIsLoading(true);
        try {
            // DELETE /api/plans/menus/:assignmentId
            await apiClient.delete(`${NutritionalPlanEndpoints.actions.list()}/menus/${assignmentId}`);
            return true;
        } catch (error) {
            console.error("Error eliminando asignación:", error);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    return { assignMenu, removeMenu, isLoading };
};
