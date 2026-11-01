import { apiClient } from '@/shared/api/api.client';
import { useEffect, useState } from 'react';
import type { BarChartDataDto, WalletMetricsDto } from '@/types/backend/user-analitics';

export interface MonthlyHistoryData {
    title: string;
    labels: string[];
    datasets: {
        label: string;
        data: number[]; // Array de números
        type: string;
    }[];
}

export interface StatusChartData {
    title: string;
    type: 'pie' | 'doughnut';
    keyLabel: string;
    keyValue: string;
    data: { status: string; count: number }[];
}

// Helper para el tipo del Estado
interface AsyncState<T> {
    data: T | null;
    loading: boolean;
    error: unknown;
}

export const useWalletAnalytics = () => {
    // Estado para Gráfico de Volumen
    const [volumeChart, setVolumeChart] = useState<AsyncState<BarChartDataDto>>({ data: null, loading: true, error: null });
    const [wallet, setWallet] = useState<AsyncState<WalletMetricsDto>>({ data: null, loading: true, error: null });

    // 2. Aquí aplicamos el tipado correcto <AsyncState<MonthlyHistoryData>>
    const [monthlyHistory, setMonthlyHistory] = useState<AsyncState<MonthlyHistoryData>>({
        data: null,
        loading: true,
        error: null
    });

    // 3. Tipamos también el de status
    const [statusChart, setStatusChart] = useState<AsyncState<StatusChartData>>({
        data: null,
        loading: true,
        error: null
    });

    useEffect(() => {
        const fetchWalletData = async () => {
            try {
                const response = await apiClient.get('/api/user/analytics/dashboard/wallet');
                setWallet({ data: response.data.data, loading: false, error: null });
            } catch (error) {
                setWallet({ data: null, loading: false, error: error });
            }
        };

        const fetchVolumeData = async () => {
            try {
                const response = await apiClient.get('/api/user/analytics/charts/transactions-volume');
                setVolumeChart({ data: response.data.data, loading: false, error: null });
            } catch (error) {
                setVolumeChart({ data: null, loading: false, error: error });
            }
        };

        const fetchHistory = async () => {
            try {
                const response = await apiClient.get('/api/user/analytics/charts/monthly-history');
                setMonthlyHistory({ data: response.data.data, loading: false, error: null });
            } catch (error) {
                setMonthlyHistory({ data: null, loading: false, error: error });
            }
        };

        const fetchStatus = async () => {
            try {
                const response = await apiClient.get('/api/user/analytics/charts/status-distribution');
                setStatusChart({ data: response.data.data, loading: false, error: null });
            } catch (error) {
                setStatusChart({ data: null, loading: false, error: error });
            }
        };

        // Ejecutamos ambos
        fetchWalletData();
        fetchVolumeData();
        fetchHistory();
        fetchStatus();
    }, []);

    return { wallet, volumeChart, monthlyHistory, statusChart };
};