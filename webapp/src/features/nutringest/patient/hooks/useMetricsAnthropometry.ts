import { useState, useEffect, useCallback } from 'react';
import { apiClient } from "@/shared/api/api.client";

// Estructura que devuelve el backend (AnthropometryService.getMetrics)
export interface AnthroMetricsResponse {
    labels: string[]; // Eje X (Fechas)
    datasets: {
        weight: number[];
        bmi: number[];
        waist: number[];
        hip: number[];
        fatPercentage: number[];
        muscleMass: number[];
        boneMass?: number[];
        adiposeMass?: number[];
        residualMass?: (number | null)[];
        endomorphy?: number[];
        mesomorphy?: number[];
        ectomorphy?: number[];
    };
}

export const useAnthropometryMetrics = (patientId: string) => {
    const [metrics, setMetrics] = useState<AnthroMetricsResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchMetrics = useCallback(async () => {
        if (!patientId) return;
        setIsLoading(true);
        setError(null);
        try {
            // GET /api/anthropometry/metrics/:patientId
            const response = await apiClient.get<AnthroMetricsResponse>(`/api/anthropometry/metrics/${patientId}`);
            setMetrics(response.data);
        } catch (err: any) {
            console.error("Error fetching metrics:", err);
            setError("No se pudieron cargar los datos de la gráfica.");
        } finally {
            setIsLoading(false);
        }
    }, [patientId]);

    useEffect(() => {
        fetchMetrics();
    }, [fetchMetrics]);

    return {
        metrics,
        isLoading,
        error,
        refetch: fetchMetrics
    };
};