import { apiClient } from '@/shared/api/api.client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { DashboardEndpoints } from '../service/dashboard.endpoints';
import type { IActivityLog, IActivityFeedResponse } from '@/types/backend/activity.type';

export interface ActivityFeedFilters {
  action?: string;
  userId?: string;
  fromDate?: string;
  toDate?: string;
}

export const useActivityFeed = () => {
  const [data, setData] = useState<IActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<ActivityFeedFilters>({});

  const cursorRef = useRef<string | null>(null);

  const fetchFeed = useCallback(async (cursor?: string | null, append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const params: Record<string, string> = {};
      if (cursor) params.cursor = cursor;
      if (filters.action) params.action = filters.action;
      if (filters.userId) params.userId = filters.userId;
      if (filters.fromDate) params.fromDate = filters.fromDate;
      if (filters.toDate) params.toDate = filters.toDate;

      const response = await apiClient.get<IActivityFeedResponse>(
        DashboardEndpoints.api.activity.feed,
        { params },
      );

      const result = response.data;
      if (append) {
        setData(prev => [...prev, ...result.data]);
      } else {
        setData(result.data);
      }
      setNextCursor(result.nextCursor);
      cursorRef.current = result.nextCursor;
    } catch (err: unknown) {
      console.error('Error fetching activity feed:', err);
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message || 'Error al obtener el feed de actividad');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters]);

  const loadMore = useCallback(() => {
    if (cursorRef.current && !loadingMore) {
      fetchFeed(cursorRef.current, true);
    }
  }, [fetchFeed, loadingMore]);

  const setFilters = useCallback((newFilters: ActivityFeedFilters) => {
    setFiltersState(newFilters);
    cursorRef.current = null;
    setNextCursor(null);
    setData([]);
  }, []);

  const refetch = useCallback(() => {
    cursorRef.current = null;
    setNextCursor(null);
    fetchFeed(null, false);
  }, [fetchFeed]);

  // Carga inicial al montar y recarga cuando cambian los filtros
  useEffect(() => {
    fetchFeed(null, false);
  }, [fetchFeed]);

  return {
    data,
    loading,
    loadingMore,
    error,
    nextCursor,
    filters,
    loadMore,
    setFilters,
    refetch,
    fetchFeed,
  };
};
