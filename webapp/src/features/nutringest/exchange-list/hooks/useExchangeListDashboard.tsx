"use client";

import { useState, useEffect, useCallback } from 'react';
import { ExchangeDashboardMetrics } from '../types/exchange-list.dashbaord.type';
import { apiClient } from '@/shared/api/api.client';
import { ExchangeListEndpoints } from '../services/exchange-list.endpoint';

export const useExchangeMetrics = () => {
  const [data, setData] = useState<ExchangeDashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiClient.get<ExchangeDashboardMetrics>(ExchangeListEndpoints.metrics.dashboard(''));

      setData(response.data);
    } catch (err: any) {
      console.error('Error fetching exchange metrics:', err);
      setError(err.response?.data?.message || 'Error al cargar las métricas de intercambio');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Cargar datos al montar el componente
  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchMetrics, // Útil para recargar datos después de crear/editar una lista
  };
};