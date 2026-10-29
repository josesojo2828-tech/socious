"use client";

import { useCallback, useEffect, useState } from "react";
import { CategorizedFoodMetrics, UseCategorizedMetricsParams } from "../types/food.dashboard.type";
import { apiClient } from "@/shared/api/api.client";
import { ExchangeEndpoints } from "../services/exchange-food.endpoint";

export const useCategorizedFoodMetrics = (params: UseCategorizedMetricsParams = {}) => {
  const [data, setData] = useState<CategorizedFoodMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (params.searchQuery) queryParams.append('searchQuery', params.searchQuery);

      const response = await apiClient(ExchangeEndpoints.metrics.dashboard(queryParams.toString()));
      const result = await response.data;
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [params.searchQuery]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return { data, loading, error, refetch: fetchMetrics };
};