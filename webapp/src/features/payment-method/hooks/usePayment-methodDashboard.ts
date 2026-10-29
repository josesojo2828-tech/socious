import { useState, useEffect } from 'react';
import { RenderPieChart } from '@/types/backend/dashboard.type';
// import { apiClient } from '@/shared/api/api.client';
// import { Payment-methodEndpoints } from '../services/payment-method.endpoints';

export const usePaymentMethodDashboard = () => {
  const [stats, setStats] = useState<RenderPieChart | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulación de carga
    const loadStats = async () => {
      try {
        // const { data } = await apiClient.get(Payment-methodEndpoints.data.stats);
        // setStats(data);
        
        // MOCK DATA (Reemplazar con llamada real)
        setTimeout(() => {
          setStats({
            id: 'chart-1',
            title: 'Estadísticas de Payment-method',
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
