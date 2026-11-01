import { apiClient } from '@/shared/api/api.client';
import { useEffect, useState, useCallback } from 'react';
import { DashboardEndpoints } from '../service/dashboard.endpoints';

interface FetchParams {
  page: number;
  limit: number;
  q: string;
  status?: string;
  /** Multi-selección de roles/tipos de usuario (Permit.name). */
  permitName?: string[];
  /** Filtro por correo verificado. */
  emailVerified?: boolean;
}

export const useAdminCrud = (entity: string) => {
  const [data, setData] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const getEndpoint = (ent: string) => {
    switch (ent) {
      case 'users':
        return DashboardEndpoints.api.users;
      case 'subscriptions':
        return DashboardEndpoints.api.subscriptions;
      case 'transactions':
        return DashboardEndpoints.api.transactions;
      case 'feedback':
        return DashboardEndpoints.api.feedback;
      case 'payment-methods':
        return DashboardEndpoints.api.paymentMethods;
      case 'permits':
        return DashboardEndpoints.api.permits;
      case 'wallets':
        return DashboardEndpoints.api.wallets;
      case 'system-payment-methods':
        return DashboardEndpoints.api.systemPaymentMethods;
      case 'cms':
        return DashboardEndpoints.api.cms;
      case 'universities':
        return '/api/universities';
      default:
        return null;
    }
  };

  const fetchData = useCallback(async (params: FetchParams) => {
    const endpoint = getEndpoint(entity);
    if (!endpoint) {
      setError(`Entidad no configurada: ${entity}`);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<{
        list?: Array<Record<string, unknown>>;
        total?: number;
        totalPages?: number;
        currentPage?: number;
        limit?: number;
      }>(endpoint, {
        params: {
          page: params.page,
          limit: params.limit,
          q: params.q || undefined,
          status: params.status || undefined,
          permitName:
            params.permitName && params.permitName.length
              ? params.permitName.join(',')
              : undefined,
          emailVerified: params.emailVerified,
        },
      });

      // La API retorna { list, total, totalPages, currentPage, limit }
      const resData = response.data;
      setData(resData.list || []);
      setTotal(resData.total ?? 0);
      setTotalPages(resData.totalPages ?? 1);
      setCurrentPage(resData.currentPage ?? 1);
      setLimit(resData.limit ?? 10);
    } catch (err: unknown) {
      console.error(`Error fetching entity ${entity}:`, err);
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message || 'Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  }, [entity]);

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
