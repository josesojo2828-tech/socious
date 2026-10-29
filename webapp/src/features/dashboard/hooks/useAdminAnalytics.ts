import { apiClient } from '@/shared/api/api.client';
import { useEffect, useState } from 'react';
import { DashboardEndpoints } from '../service/dashboard.endpoints';

export interface AdminStats {
  kpi: {
    mrr: number;
    totalNutritionists: number;
    totalPatients: number;
    churnRate: number;
    totalConsultations?: number;
    totalDietPlans?: number;
    pendingPaymentsCount?: number;
  };
  charts: {
    revenueByMonth: Array<{
      month: string;
      income: number;
      failed: number;
    }>;
    subscriptionsByPlan: Array<{
      label: string;
      count: number;
      color: string;
    }>;
    userGrowth: Array<{
      month: string;
      count: number;
    }>;
    clinicalActivity?: Array<{
      month: string;
      consultations: number;
      plans: number;
    }>;
  };
  tables: {
    topUsers: Array<{
      name: string;
      patients: number;
      plan: string;
    }>;
    recentTransactions: any[];
    pendingTransactions?: any[];
  };
}

export const useAdminAnalytics = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<AdminStats>(DashboardEndpoints.api.stats);
      setStats(response.data);
    } catch (err: any) {
      console.error("Error fetching admin stats:", err);
      setError(err?.response?.data?.message || 'Error al obtener estadísticas del servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return { stats, loading, error, refetch: fetchStats };
};
