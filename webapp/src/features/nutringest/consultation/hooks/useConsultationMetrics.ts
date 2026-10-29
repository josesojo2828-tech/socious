import { useState, useEffect, useCallback } from 'react';
import { apiClient } from "@/shared/api/api.client";

export interface ConsultationMetrics {
    totalConsultations: number;
    workspace: string;
}

export const useConsultationMetrics = () => {
    const [metrics, setMetrics] = useState<ConsultationMetrics | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchMetrics = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await apiClient.get<ConsultationMetrics>('/api/consultations/dashboard');
            setMetrics(response.data);
        } catch (err: any) {
            console.error("Error fetching consultation metrics:", err);
            setError("Error cargando estadísticas de consultas.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMetrics();
    }, [fetchMetrics]);

    return { metrics, isLoading, error, refetch: fetchMetrics };
};
