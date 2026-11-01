'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/shared/api/api.client';

interface ExchangeRate {
  rate: number;
  timestamp: string;
}

interface ConversionResult {
  amount: number;
  from: string;
  to: string;
  rate: number;
  converted: number;
  timestamp: string;
}

export function useExchangeRate() {
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRate = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<ExchangeRate>('/api/exchange/bcv');
      setRate(res.data.rate);
      setError(null);
    } catch (err) {
      console.error('Error fetching exchange rate:', err);
      setError('Error al obtener tasa de cambio');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRate();
    // Refresh every 5 minutes
    const interval = setInterval(fetchRate, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchRate]);

  const convert = useCallback(
    async (amount: number, from: 'USD' | 'VES', to: 'USD' | 'VES'): Promise<ConversionResult | null> => {
      try {
        const res = await apiClient.get<ConversionResult>('/api/exchange/convert', {
          params: { amount, from, to },
        });
        return res.data;
      } catch (err) {
        console.error('Error converting:', err);
        return null;
      }
    },
    [],
  );

  const convertUsdToVes = useCallback(
    (amountUsd: number): number => {
      if (!rate) return 0;
      return amountUsd * rate;
    },
    [rate],
  );

  const convertVesToUsd = useCallback(
    (amountVes: number): number => {
      if (!rate) return 0;
      return amountVes / rate;
    },
    [rate],
  );

  return {
    rate,
    loading,
    error,
    fetchRate,
    convert,
    convertUsdToVes,
    convertVesToUsd,
  };
}
