import { useState } from 'react';
import { apiClient } from "@/shared/api/api.client";

interface AssignExchangePayload {
    exchangeListId: string;
    portions: number;
    eatingMoment?: string; // "Cena"
}

export const usePatientExchangeAssignment = (patientId: string) => {
    const [isLoading, setIsLoading] = useState(false);

    /**
     * ASIGNAR (Usa PatientController)
     */
    const assignExchangeList = async (payload: AssignExchangePayload) => {
        setIsLoading(true);
        try {
            await apiClient.post(`/api/patients/${patientId}/assign/list`, payload);
            return true;
        } catch (error: any) {
            console.error("Error asignando lista:", error);
            alert(error.response?.data?.message || "Error al asignar lista.");
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * REMOVER (Usa AssignedExchangeController)
     */
    const removeAssignedExchangeList = async (assignmentId: string) => {
        if (!confirm("¿Quitar este grupo del plan?")) return false;

        setIsLoading(true);
        try {
            await apiClient.delete(`/api/assigned-exchanges/${assignmentId}`);
            return true;
        } catch (error: any) {
            console.error("Error eliminando asignación:", error);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    return {
        assignExchangeList,
        removeAssignedExchangeList,
        isLoading
    };
};