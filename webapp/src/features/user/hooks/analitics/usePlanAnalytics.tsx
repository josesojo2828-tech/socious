import { apiClient } from '@/shared/api/api.client';
import { useEffect, useState } from 'react';

interface AsyncState<T> {
    data: T;
    loading: boolean;
    error: unknown;
}

export const usePlanAnalytics = () => {
    const [popularPlans, setPopularPlans] = useState<AsyncState<unknown>>({ data: null, loading: true, error: null });

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const response = await apiClient.get('/api/user/analytics/charts/popular-plans');
                setPopularPlans({ data: response.data, loading: false, error: null });
            } catch (error) {
                setPopularPlans({ data: null, loading: false, error: error });
            }
        };

        fetchPlans();
    }, []);

    return { popularPlans };
};