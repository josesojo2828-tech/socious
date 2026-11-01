import { apiClient } from '@/shared/api/api.client';
import { useEffect, useState } from 'react';

interface AsyncState<T> {
    data: T;
    loading: boolean;
    error: unknown;
}

export const useSessionAnalytics = () => {
    const [sessions, setSessions] = useState<AsyncState<unknown[]>>({ data: [], loading: true, error: null });

    useEffect(() => {
        const fetchSessions = async () => {
            try {
                const response = await apiClient.get('/api/user/analytics/tables/sessions');
                setSessions({ data: response.data || [], loading: false, error: null });
            } catch (error) {
                setSessions({ data: [], loading: false, error: error });
            }
        };

        fetchSessions();
    }, []);

    return { sessions };
};