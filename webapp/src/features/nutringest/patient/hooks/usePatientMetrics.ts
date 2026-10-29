import { useState, useEffect, useCallback } from 'react';
import { apiClient } from "@/shared/api/api.client";
import { PatientEndpoints } from '../services/patient.endpoint';

export interface DashboardMetrics {
    overview: {
        total: number;
        newThisMonth: number;
        growth: number;
        avgAge: number;
    };
    distribution: {
        gender: { label: string; value: number }[];
        activity: { label: string; value: number }[];
        age: Record<string, number>;
    };
}

export const usePatientMetrics = () => {
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchMetrics = useCallback(async () => {
        try {
            setIsLoading(true);
            // Asegúrate de tener este endpoint en tu objeto PatientEndpoints, 
            // si no, usa la ruta directa '/api/patients/dashboard'
            const response = await apiClient.get<DashboardMetrics>('/api/patients/dashboard');
            setMetrics(response.data);
        } catch (err: any) {
            console.error("Error fetching patient metrics:", err);
            setError("Error cargando estadísticas.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMetrics();
    }, [fetchMetrics]);

    return { metrics, isLoading, error, refetch: fetchMetrics };
};