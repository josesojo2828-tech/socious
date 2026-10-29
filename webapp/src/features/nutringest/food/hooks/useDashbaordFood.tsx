"use client";

import { useCallback, useEffect, useState } from "react";
import { FoodDatabaseMetrics, UseFoodMetricsParams } from "../types/food.dashboard.type";
import { apiClient } from "@/shared/api/api.client";
import { FoodEndpoints } from "../services/food.endpoint";

export const useFoodMetrics = (params: UseFoodMetricsParams = {}) => {
    const [data, setData] = useState<FoodDatabaseMetrics | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchMetrics = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const queryParams = new URLSearchParams();
            if (params.includeInactive) queryParams.append('includeInactive', 'true');
            if (params.searchQuery) queryParams.append('searchQuery', params.searchQuery);

            const response = await apiClient(FoodEndpoints.metrics.dashboard(queryParams.toString()));

            // console.log(response.data());

            const result = await response.data;
            setData(result);
        } catch (err: any) {
            setError(err.message || 'Error desconocido');
        } finally {
            setLoading(false);
        }
    }, [params.includeInactive, params.searchQuery]);

    useEffect(() => {
        fetchMetrics();
    }, [fetchMetrics]);

    return { data, loading, error, refetch: fetchMetrics };
};
