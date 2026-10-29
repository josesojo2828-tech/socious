import { create } from 'zustand';
import { apiClient } from '@/shared/api/api.client';
import { useWorkspaceStore } from '@/shared/store/workspace/useWorkspaceStore';

export type EntitlementModuleSource = 'PLAN' | 'ADDON' | string;

export interface ResolvedEntitlementModule {
  key: string;
  source: EntitlementModuleSource;
  addOnId?: string | null;
}

/** Shape returned by `GET /api/entitlements/me`. */
export interface ResolvedEntitlements {
  permissions: string[];
  modules: ResolvedEntitlementModule[];
  fieldPolicies: Record<string, unknown>;
  organizationId: string | null;
}

interface EntitlementState {
  permissions: string[];
  modules: ResolvedEntitlementModule[];
  fieldPolicies: Record<string, unknown>;
  organizationId: string | null;
  /** Active workspace id the current resolution was fetched for. */
  workspaceId: string | null;
  hydrated: boolean;
  isLoading: boolean;
  error: string | null;

  /**
   * Resolve the effective entitlements for the active workspace (the api client
   * already sends `X-Workspace-Id`). No-op when already hydrated for the same
   * workspace unless `force` is set.
   */
  fetchEntitlements: (options?: { force?: boolean }) => Promise<void>;
  /** Clear resolved entitlements (logout / workspace teardown). */
  reset: () => void;
  hasEntitlement: (key: string) => boolean;
  canAccessModule: (moduleKey: string) => boolean;
}

const EMPTY: Pick<
  EntitlementState,
  'permissions' | 'modules' | 'fieldPolicies' | 'organizationId' | 'workspaceId'
> = {
  permissions: [],
  modules: [],
  fieldPolicies: {},
  organizationId: null,
  workspaceId: null,
};

export const useEntitlementStore = create<EntitlementState>((set, get) => ({
  ...EMPTY,
  hydrated: false,
  isLoading: false,
  error: null,

  fetchEntitlements: async (options) => {
    const workspaceId =
      useWorkspaceStore.getState().activeWorkspace?.id ?? null;
    const state = get();

    if (state.isLoading) return;
    if (!options?.force && state.hydrated && state.workspaceId === workspaceId) {
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const { data } = await apiClient.get<ResolvedEntitlements>(
        '/api/entitlements/me',
      );
      set({
        permissions: data?.permissions ?? [],
        modules: data?.modules ?? [],
        fieldPolicies: data?.fieldPolicies ?? {},
        organizationId: data?.organizationId ?? null,
        workspaceId,
        hydrated: true,
        isLoading: false,
      });
    } catch (err) {
      // Fail-closed: mark hydrated with empty entitlements so gates deny and the
      // fetch effect does not loop. Consumers surface `error` for messaging.
      console.error('Error al resolver entitlements:', err);
      set({
        ...EMPTY,
        workspaceId,
        hydrated: true,
        isLoading: false,
        error: 'No se pudieron resolver los permisos del módulo',
      });
    }
  },

  reset: () =>
    set({
      ...EMPTY,
      hydrated: false,
      isLoading: false,
      error: null,
    }),

  hasEntitlement: (key) => get().permissions.includes(key),

  canAccessModule: (moduleKey) =>
    get().modules.some((module) => module?.key === moduleKey),
}));
