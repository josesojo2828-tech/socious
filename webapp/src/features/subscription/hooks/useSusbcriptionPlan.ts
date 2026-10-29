import { useState, useEffect } from 'react';
import { apiClient } from '@/shared/api/api.client';
import { SubscriptionPlanEndpoints } from '../services/subscription.endpoints';
import { SubscriptionPlan } from '@/types/backend/schema.types';
import { set } from 'react-hook-form';

interface Props {
  action?: 'findmany' | 'unique' | 'ignore';
  id?: string
}

export const useSubscriptionPlan = ({ action, id }: Props) => {
  const [entities, setEntities] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [entity, setEntity] = useState<SubscriptionPlan | null>(null);

  const LoadList = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(SubscriptionPlanEndpoints.data.list);
      setEntities(response.data.list);
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const FindOne = async (id: string) => {
    setLoading(true);
    const response = await apiClient.get<SubscriptionPlan>(SubscriptionPlanEndpoints.data.unique(id));
    setLoading(false);
    // setEntity(response.data);
  }

  useEffect(() => {
    console.clear();
    if(action === 'findmany') LoadList();
    else if(action === 'unique' && id) FindOne(id);
  }, []);

  return { entities, loading,entity };
};
