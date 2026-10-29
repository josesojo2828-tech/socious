import { useState } from 'react';
import { apiClient } from "@/shared/api/api.client";

// Interfaces locales
interface AssignMenuPayload {
    menuId: string;
    eatingMoment?: string; // "Desayuno"
    notes?: string;
}

export const usePatientMenuAssignment = (patientId: string) => {
    const [isLoading, setIsLoading] = useState(false);

    /**
     * ASIGNAR (Usa PatientController para lógica inteligente de Plan Activo)
     */
    const assignMenu = async (payload: AssignMenuPayload) => {
        setIsLoading(true);
        try {
            await apiClient.post(`/api/patients/${patientId}/assign/menu`, payload);
            return true;
        } catch (error: any) {
            console.error("Error asignando menú:", error);
            alert(error.response?.data?.message || "Error al asignar menú.");
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * REMOVER (Usa AssignedMenuController directo)
     */
    const removeAssignedMenu = async (assignmentId: string) => {
        if (!confirm("¿Quitar este menú del plan actual?")) return false;
        
        setIsLoading(true);
        try {
            await apiClient.delete(`/api/assigned-menus/${assignmentId}`);
            return true;
        } catch (error: any) {
            console.error("Error eliminando asignación:", error);
            alert("No se pudo quitar el menú.");
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    return {
        assignMenu,
        removeAssignedMenu,
        isLoading
    };
};