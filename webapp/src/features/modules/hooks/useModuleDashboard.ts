'use client';

import { useCallback, useEffect, useState } from 'react';
import { moduleService } from '../service/module.service';
import type { ModuleDashboardPayload, ModuleScope } from '../types';

interface UseModuleDashboardOptions {
  moduleKey: string;
  scope: ModuleScope;
  /** Only sent for the `USER` scope. */
  userId?: string | null;
  /** Skip the request when the module has no registered dashboard. */
  enabled?: boolean;
}

interface UseModuleDashboardResult {
  payload: ModuleDashboardPayload | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Loads the scope-adapted dashboard payload for a module key from
 * `GET /api/modules/:key/dashboard`.
 */
export function useModuleDashboard({
  moduleKey,
  scope,
  userId,
  enabled = true,
}: UseModuleDashboardOptions): UseModuleDashboardResult {
  const [payload, setPayload] = useState<ModuleDashboardPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled || !moduleKey) return;
    setLoading(true);
    setError(null);
    try {
      const data = await moduleService.getDashboard(moduleKey, {
        scope,
        userId: userId ?? undefined,
      });
      setPayload(data);
    } catch (err) {
      console.error(`Error al cargar el dashboard del módulo "${moduleKey}":`, err);
      setPayload(null);
      setError('No se pudo cargar el panel de este módulo.');
    } finally {
      setLoading(false);
    }
  }, [enabled, moduleKey, scope, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { payload, loading, error, refetch: load };
}
