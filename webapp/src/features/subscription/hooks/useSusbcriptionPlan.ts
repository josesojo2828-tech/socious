import { useState, useEffect } from 'react';
import { apiClient } from '@/shared/api/api.client';
import { SubscriptionPlanEndpoints } from '../services/subscription.endpoints';
import { SubscriptionPlan } from '@/types/backend/schema.types';

interface Props {
  action?: 'findmany' | 'unique' | 'ignore';
  id?: string
}

export const useSubscriptionPlan = ({ action, id }: Props) => {
  const [entities, setEntities] = useState<SubscriptionPlan[]>([]);
  // El estado inicial ya es `true`; el loader solo lo pone en false tras el
  // fetch (setState tras await, no sincrónicamente en el effect).
  const [loading, setLoading] = useState(true);
  const [entity] = useState<SubscriptionPlan | null>(null);

  useEffect(() => {
    console.clear();
    // Loader definido dentro del effect para que el setState ocurra después
    // del await (la regla set-state-in-effect bandera funciones del cuerpo).
    const load = async () => {
      if (action === 'findmany') {
        try {
          const response = await apiClient.get(SubscriptionPlanEndpoints.data.list);
          setEntities(response.data.list);
          setLoading(false);
        } catch (e) {
          console.error(e);
          setLoading(false);
        }
      } else if (action === 'unique' && id) {
        await apiClient.get<SubscriptionPlan>(SubscriptionPlanEndpoints.data.unique(id));
        setLoading(false);
      }
    };
    void load();
  }, []);

  return { entities, loading, entity };
};
