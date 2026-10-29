import { useState, useEffect } from 'react';
import { RenderPieChart } from '@/types/backend/dashboard.type';
import { apiClient } from '@/shared/api/api.client';
import { SubscriptionPlanEndpoints } from '../services/subscription.endpoints';

export const useSubscriptionDashboard = () => {
  const [stats, setStats] = useState<RenderPieChart | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulación de carga
    const loadStats = async () => {
      try {
        // const { data } = await apiClient.get(SubscriptionEndpoints.data.stats);
        // setStats(data);
        
        // MOCK DATA (Reemplazar con llamada real)
        setTimeout(() => {
          setStats({
            id: 'chart-1',
            title: 'Estadísticas de Subscription',
            keyLabel: 'label',
            keyValue: 'value',
            type: 'doughnut',
            data: [
              { label: 'Activos', value: 12 },
              { label: 'Pendientes', value: 5 },
              { label: 'Cancelados', value: 3 }
            ]
          });
          setLoading(false);
        }, 800);
      } catch (e) {
        console.error(e);
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  return { stats, loading };
};
