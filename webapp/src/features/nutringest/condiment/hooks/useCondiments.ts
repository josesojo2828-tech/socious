'use client';

import { apiClient } from '@/shared/api/api.client';
import { useCallback, useState } from 'react';
import { Condiment, CondimentPaginationResponse } from '../types/condiment.type';

interface FetchParams {
    page: number;
    limit: number;
    q: string;
}

export const useCondiments = () => {
    const [data, setData] = useState<Condiment[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [currentPage, setCurrentPage] = useState(1);
    const [limit, setLimit] = useState(20);

    const fetchData = useCallback(async (params: FetchParams) => {
        setLoading(true);
        setError(null);

        try {
            const response = await apiClient.get<CondimentPaginationResponse>('/api/condiments', {
                params: {
                    page: params.page,
                    limit: params.limit,
                    q: params.q || undefined,
                },
            });

            // La API retorna { data, total, page, limit, totalPages }
            const resData = response.data;
            setData(resData.data || []);
            setTotal(resData.total ?? 0);
            setTotalPages(resData.totalPages ?? 1);
            setCurrentPage(resData.page ?? 1);
            setLimit(resData.limit ?? 20);
        } catch (err: any) {
            console.error('Error fetching condiments:', err);
            setError(err?.response?.data?.message || 'Error al conectar con el servidor');
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        data,
        loading,
        error,
        total,
        totalPages,
        currentPage,
        limit,
        fetchData,
    };
};
