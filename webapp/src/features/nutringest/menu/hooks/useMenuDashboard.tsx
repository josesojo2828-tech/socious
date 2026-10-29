import { useState, useEffect, useCallback } from 'react';
import { MenuDashboardMetrics, UseMenuMetricsParams } from '../types/menus.dashboard.type';
import { apiClient } from '@/shared/api/api.client';
import { MenuEndpoints } from '../services/menu.endpoint';

export const useMenuDashboard = ({ startDate, endDate }: UseMenuMetricsParams = {}) => {
    const [data, setData] = useState<MenuDashboardMetrics | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchMetrics = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            // Preparamos los query params
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate.toISOString());
            if (endDate) params.append('endDate', endDate.toISOString());

            const response = await apiClient.get<MenuDashboardMetrics>(
                MenuEndpoints.metrics.dashboard(params.toString())
            );

            setData(response.data);
        } catch (err: any) {
            console.error('Error fetching menu metrics:', err);
            setError(err.response?.data?.message || 'Error al cargar las métricas del menú');
        } finally {
            setIsLoading(false);
        }
    }, [startDate, endDate]);

    // Efecto para cargar datos cuando cambian las fechas
    useEffect(() => {
        fetchMetrics();
    }, [fetchMetrics]);

    return {
        data,
        isLoading,
        error,
        refetch: fetchMetrics,
    };
};