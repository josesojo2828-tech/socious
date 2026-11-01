import { apiClient } from '@/shared/api/api.client';
import { useEffect, useState } from 'react';

/** Row shape returned by GET /api/user/analytics/tables/payments. */
export interface PaymentHistoryRow {
    id: string;
    createdAt?: string | Date | null;
    status?: string | null;
    amount?: number | string | null;
    amountUsd?: number | string | null;
    reference?: string | null;
    referenceCode?: string | null;
    method?: string | null;
    paymentMethod?: { paymentMethod?: { name?: string | null } | null } | null;
}

interface AsyncState<T> {
    data: T;
    loading: boolean;
    error: unknown;
}

export const usePaymentAnalytics = () => {
    const [methodsChart, setMethodsChart] = useState<AsyncState<unknown>>({ data: null, loading: true, error: null });
    const [history, setHistory] = useState<AsyncState<PaymentHistoryRow[]>>({ data: [], loading: true, error: null });

    useEffect(() => {
        const fetchMethods = async () => {
            try {
                const response = await apiClient.get('/api/user/analytics/charts/payment-methods');
                setMethodsChart({ data: response.data.data, loading: false, error: null });
            } catch (error) {
                setMethodsChart({ data: null, loading: false, error: error });
            }
        };

        const fetchHistory = async () => {
            try {
                const response = await apiClient.get('/api/user/analytics/tables/payments');
                setHistory({ data: response.data.data || [], loading: false, error: null });
            } catch (error) {
                setHistory({ data: [], loading: false, error: error });
            }
        };

        fetchMethods();
        fetchHistory();
    }, []);

    return { methodsChart, history };
};
