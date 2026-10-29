'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '@/shared/api/api.client';
import { Condiment } from '../types/condiment.type';
import { CondimentEndpoints } from '../services/condiment.endpoint';

export const useCondimentDetail = (id: string) => {
    const [condiment, setCondiment] = useState<Condiment | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const mountedRef = useRef(true);

    const fetchCondiment = useCallback(async () => {
        if (!id) return;

        try {
            setIsLoading(true);
            setError(null);

            const response = await apiClient.get<Condiment>(CondimentEndpoints.actions.unique(id));
            if (!mountedRef.current) return;

            if (response.data) {
                setCondiment(response.data);
            } else {
                setCondiment(null);
            }
        } catch (err: any) {
            if (!mountedRef.current) return;
            console.error('Error cargando condimento:', err);
            setError(err?.response?.data?.message || 'Error al cargar el condimento.');
        } finally {
            if (mountedRef.current) setIsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        mountedRef.current = true;
        fetchCondiment();

        return () => {
            mountedRef.current = false;
        };
    }, [fetchCondiment]);

    return {
        condiment,
        isLoading,
        error,
        refetch: fetchCondiment,
    };
};
