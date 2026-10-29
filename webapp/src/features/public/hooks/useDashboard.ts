import { useState, useEffect } from 'react';
import { RenderPieChart } from '@/types/backend/dashboard.type';
// import { apiClient } from '@/shared/api/api.client';
// import { PublicEndpoints } from '../services/public.endpoints';

export const usePublicDashboard = () => {
  const [stats, setStats] = useState<RenderPieChart | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulación de carga
    const loadStats = async () => {
      try {
        // const { data } = await apiClient.get(PublicEndpoints.data.stats);
        // setStats(data);
        
      } catch (e) {
        console.error(e);
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  return { stats, loading };
};
