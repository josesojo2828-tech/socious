import { apiClient } from '@/shared/api/api.client';
import { useEffect, useState } from 'react';

export const usePaymentAnalytics = () => {
    const [methodsChart, setMethodsChart] = useState({ data: null, loading: true, error: null });
    const [history, setHistory] = useState({ data: [], loading: true, error: null });

    useEffect(() => {
        const fetchMethods = async () => {
            try {
                const response = await apiClient.get('/api/user/analytics/charts/payment-methods');
                setMethodsChart({ data: response.data.data, loading: false, error: null });
            } catch (error: any) {
                setMethodsChart({ data: null, loading: false, error: error });
            }
        };

        const fetchHistory = async () => {
            try {
                const response = await apiClient.get('/api/user/analytics/tables/payments');
                setHistory({ data: response.data.data || [], loading: false, error: null });
            } catch (error: any) {
                setHistory({ data: [], loading: false, error: error });
            }
        };

        fetchMethods();
        fetchHistory();
    }, []);

    return { methodsChart, history };
};
