import { useState, useCallback } from 'react';
import { apiClient } from "@/shared/api/api.client";
import { LabResultEndpoints } from '../services/lab-result.endpoint';

export const useLabResults = (patientId: string) => {
    const [results, setResults] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchLabs = useCallback(async () => {
        if (!patientId) return;
        setIsLoading(true);
        try {
            const response = await apiClient.get(LabResultEndpoints.actions.list(), {
                params: { patientId }
            });
            setResults(response.data.list || []);
        } catch (error) {
            console.error("Error cargando laboratorios:", error);
        } finally {
            setIsLoading(false);
        }
    }, [patientId]);

    const addLabResult = async (payload: any) => {
        try {
            await apiClient.post(LabResultEndpoints.actions.create(), {
                ...payload,
                patientId
            });
            await fetchLabs();
            return true;
        } catch (error) {
            console.error("Error subiendo examen:", error);
            return false;
        }
    };

    const deleteLabResult = async (id: string) => {
        try {
            await apiClient.post(LabResultEndpoints.actions.delete(id));
            setResults(prev => prev.filter(l => l.id !== id));
        } catch (error) {
            console.error("Error eliminando examen:", error);
        }
    };

    return {
        results,
        isLoading,
        fetchLabs,
        addLabResult,
        deleteLabResult
    };
};