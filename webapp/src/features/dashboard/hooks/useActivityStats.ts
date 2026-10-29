import { apiClient } from '@/shared/api/api.client';
import { useEffect, useState, useCallback } from 'react';
import { DashboardEndpoints } from '../service/dashboard.endpoints';
import type { IActivityStats } from '@/types/backend/activity.type';

export interface ActivityStatsFilters {
  userId?: string;
  fromDate?: string;
  toDate?: string;
}

export const useActivityStats = (filters?: ActivityStatsFilters) => {
  const userId = filters?.userId;
  const fromDate = filters?.fromDate;
  const toDate = filters?.toDate;

  const [stats, setStats] = useState<IActivityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (userId) params.userId = userId;
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;

      const response = await apiClient.get<IActivityStats>(DashboardEndpoints.api.activity.stats, {
        params,
      });
      setStats(response.data);
    } catch (err: any) {
      console.error('Error fetching activity stats:', err);
      setError(err?.response?.data?.message || 'Error al obtener estadísticas de actividad');
    } finally {
      setLoading(false);
    }
  }, [userId, fromDate, toDate]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
};
