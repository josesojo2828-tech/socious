import { useState, useEffect } from 'react';
import { IPaymentMethod } from '@/types/backend/schema.types';
import { PaymentMethodEndpoints } from '../services/payment-method.endpoints';
import { apiClient } from '@/shared/api/api.client';

export const usePaymentMethod = () => {
  const [list, setList] = useState<IPaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const { data } = await apiClient.get<{ list: IPaymentMethod[] }>(PaymentMethodEndpoints.data.list);
        setList(data.list);
        setLoading(false);
        
      } catch (e) {
        console.error(e);
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  return { list, loading };
};
