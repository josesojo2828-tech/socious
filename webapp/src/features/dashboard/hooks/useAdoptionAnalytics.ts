import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/api.client';
import { useWorkspaceStore } from '@/shared/store/workspace/useWorkspaceStore';
import { DashboardEndpoints } from '../service/dashboard.endpoints';

/**
 * Adoption analytics data contracts (mirrors the backend DTOs of
 * `serverapp/src/modules/dashboard/dto/adoption.type.ts`).
 */
export type AdoptionScope = 'org' | 'global';
export type CohortGranularity = 'week' | 'month';

export interface IAdoptionActiveUsers {
  tz: string;
  asOf: string;
  dau: number;
  wau: number;
  mau: number;
}

export interface IDormantUsers {
  days: 30;
  count: number;
  users: Array<{
    id: string;
    name: string;
    lastSeenAt: string | null;
    logins: number;
  }>;
}

export interface IClinicalFunnelStage {
  key: 'patients' | 'anamnesis' | 'anthropometry' | 'consultation' | 'plan';
  count: number;
  conversionFromPrevious: number;
  conversionFromFirst: number;
}

export interface IClinicalFunnel {
  stages: IClinicalFunnelStage[];
}

export interface ICohortRetention {
  granularity: CohortGranularity;
  cohorts: Array<{ cohort: string; size: number; retention: number[] }>;
}

export interface IFeatureDepth {
  calculators: number;
  menus: number;
  exchangeLists: number;
}

export interface UseAdoptionAnalyticsParams {
  /** `org` (default) reads the active organization; `global` reads the whole platform. */
  scope?: AdoptionScope;
  /** Optional bucket timezone override; falls back to the backend `ADOPTION_TZ`. */
  tz?: string;
  cohortGranularity?: CohortGranularity;
  cohortPeriods?: number;
  dormantWindowDays?: number;
  /** When `false`, no request is fired (e.g. the viewer lacks permission). */
  enabled?: boolean;
}

interface AdoptionRequest {
  params: Record<string, string | number>;
  headers: Record<string, string>;
}

const extractErrorMessage = (error: unknown): string | null => {
  if (!error) return null;
  const err = error as { response?: { data?: { message?: string } }; message?: string };
  return err?.response?.data?.message || err?.message || 'Error al obtener métricas de adopción';
};

/**
 * Fetches the five adoption metrics for the resolved scope.
 *
 * Gating contract (mirrors the backend):
 * - `org` scope sends the active `x-workspace-id` and requires `PERMIT_DASHBOARD`.
 * - `global` scope sends an explicit `scope=global` and requires `SUPERADMIN`/`ADMIN`.
 *   There is no implicit global fallback.
 */
export const useAdoptionAnalytics = ({
  scope = 'org',
  tz,
  cohortGranularity = 'week',
  cohortPeriods,
  dormantWindowDays,
  enabled = true,
}: UseAdoptionAnalyticsParams = {}) => {
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);

  const workspaceId =
    activeWorkspace?.type === 'ORGANIZATION' && activeWorkspace?.id
      ? activeWorkspace.id
      : undefined;

  const buildRequest = (extra?: Record<string, string | number | undefined>): AdoptionRequest => {
    const params: Record<string, string | number> = {};
    if (scope === 'global') params.scope = 'global';
    if (tz) params.tz = tz;
    if (extra) {
      for (const [key, value] of Object.entries(extra)) {
        if (value !== undefined && value !== null && value !== '') params[key] = value;
      }
    }

    const headers: Record<string, string> = {};
    if (scope === 'org' && workspaceId) headers['x-workspace-id'] = workspaceId;

    return { params, headers };
  };

  const activeUsers = useQuery({
    queryKey: ['adoption', 'active-users', scope, tz, workspaceId],
    queryFn: async () => {
      const { params, headers } = buildRequest();
      const res = await apiClient.get<IAdoptionActiveUsers>(
        DashboardEndpoints.api.adoption.activeUsers,
        { params, headers },
      );
      return res.data;
    },
    enabled,
  });

  const dormant = useQuery({
    queryKey: ['adoption', 'dormant', scope, dormantWindowDays, workspaceId],
    queryFn: async () => {
      const { params, headers } = buildRequest({ windowDays: dormantWindowDays });
      const res = await apiClient.get<IDormantUsers>(
        DashboardEndpoints.api.adoption.dormant,
        { params, headers },
      );
      return res.data;
    },
    enabled,
  });

  const cohorts = useQuery({
    queryKey: ['adoption', 'cohorts', scope, cohortGranularity, cohortPeriods, tz, workspaceId],
    queryFn: async () => {
      const { params, headers } = buildRequest({
        granularity: cohortGranularity,
        periods: cohortPeriods,
      });
      const res = await apiClient.get<ICohortRetention>(
        DashboardEndpoints.api.adoption.cohorts,
        { params, headers },
      );
      return res.data;
    },
    enabled,
  });

  const funnel = useQuery({
    queryKey: ['adoption', 'funnel', scope, workspaceId],
    queryFn: async () => {
      const { params, headers } = buildRequest();
      const res = await apiClient.get<IClinicalFunnel>(
        DashboardEndpoints.api.adoption.funnel,
        { params, headers },
      );
      return res.data;
    },
    enabled,
  });

  const depth = useQuery({
    queryKey: ['adoption', 'depth', scope, workspaceId],
    queryFn: async () => {
      const { params, headers } = buildRequest();
      const res = await apiClient.get<IFeatureDepth>(
        DashboardEndpoints.api.adoption.depth,
        { params, headers },
      );
      return res.data;
    },
    enabled,
  });

  const queries = [activeUsers, dormant, cohorts, funnel, depth];
  const firstError = queries.find((q) => q.error)?.error ?? null;

  const refetch = () => {
    queries.forEach((q) => q.refetch());
  };

  return {
    scope,
    activeUsers: activeUsers.data ?? null,
    dormant: dormant.data ?? null,
    cohorts: cohorts.data ?? null,
    funnel: funnel.data ?? null,
    depth: depth.data ?? null,
    loading: queries.some((q) => q.isLoading),
    error: extractErrorMessage(firstError),
    refetch,
  };
};
