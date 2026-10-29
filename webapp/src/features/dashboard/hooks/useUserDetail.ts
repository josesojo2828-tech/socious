import { apiClient } from '@/shared/api/api.client';
import { useEffect, useState } from 'react';
import { DashboardEndpoints } from '../service/dashboard.endpoints';
import type { UserDetailResponse } from '@/types/backend/user-detail.type';

export const useUserDetail = (userId: string | undefined) => {
  const [userDetail, setUserDetail] = useState<UserDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<UserDetailResponse>(
        `${DashboardEndpoints.api.userDetail}/${userId}`,
      );
      setUserDetail(response.data);
    } catch (err: any) {
      console.error("Error fetching user detail:", err);
      setError(err?.response?.data?.message || 'Error al obtener la ficha del usuario');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [userId]);

  return { userDetail, loading, error, refetch: fetchDetail };
};
