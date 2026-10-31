import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '@/shared/api/api.client';
import { ACCESS_KEYS, normalizePlanContent } from '@/shared/authz';
import { User } from '@/types/backend/schema.types';

export type WorkspaceType = 'PERSONAL' | 'ORGANIZATION' | 'PATIENT_NUTRITIONIST';

export interface WorkspaceItem {
  id: string; // 'personal' or organization UUID
  name: string;
  type: WorkspaceType;
  role?: string;
  userColorHex?: string;
  logoUrl?: string;
  maxSeats?: number;
  requiresSubscription?: boolean;
  subscriptionStatus?: 'ACTIVE' | 'TRIAL' | 'GRACE_PERIOD' | 'NONE';
  subscriptionEndDate?: string;
  // PATIENT_NUTRITIONIST specific fields
  nutritionistId?: string;
  nutritionistName?: string;
}

interface WorkspaceState {
  activeWorkspace: WorkspaceItem;
  workspaces: WorkspaceItem[];
  isLoading: boolean;
  /** True once fetchWorkspaces has answered (success or failure). Never persisted. */
  hasLoaded: boolean;
  setActiveWorkspace: (workspace: WorkspaceItem) => void;
  fetchWorkspaces: (user?: User | null, options?: { preserveSelection?: boolean }) => Promise<void>;
}

const DEFAULT_PERSONAL_WORKSPACE: WorkspaceItem = {
  id: 'personal',
  name: 'Consulta Personal (Mi Perfil)',
  type: 'PERSONAL',
  userColorHex: '#4F46E5',
};

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      activeWorkspace: DEFAULT_PERSONAL_WORKSPACE,
      workspaces: [DEFAULT_PERSONAL_WORKSPACE],
      isLoading: false,
      hasLoaded: false,

      setActiveWorkspace: (workspace: WorkspaceItem) => {
        if (workspace.type === 'PERSONAL' && get().workspaces.every(w => w.type === 'ORGANIZATION')) {
          return;
        }
        set({ activeWorkspace: workspace });
      },

      fetchWorkspaces: async (user?: User | null, options?: { preserveSelection?: boolean }) => {
        // One in-flight load per store: the dashboard router and the header
        // switcher may both ask for the list on the same mount.
        if (get().isLoading) return;
        set({ isLoading: true });
        try {
          const response = await apiClient.get('/api/organizations/my-workspaces');
        const orgs: WorkspaceItem[] = (response.data || []).map((org: any) => ({
          id: org.id,
          name: org.name,
          type: 'ORGANIZATION' as WorkspaceType,
          role: org.userRole,
          userColorHex: org.userColorHex || '#4F46E5',
          logoUrl: org.logoUrl,
          maxSeats: org.maxSeats,
          requiresSubscription: org.requiresSubscription || false,
          subscriptionStatus: org.subscriptionStatus || 'NONE',
          subscriptionEndDate: org.subscriptionEndDate,
        }));

          // Entitlement-driven: the personal workspace is covered when the user
          // has an active personal plan granting a stable premium machine key.
          // Plan DISPLAY names are never used for gating.
          const currentUser = user !== undefined ? user : require('../auth/useAuthStore').useAuthStore.getState().user;
          const personalPlanGrants = (currentUser?.subscriptions ?? [])
            .filter((sub: any) => sub.organizationId === null && sub.status === 'ACTIVE')
            .flatMap((sub: any) => normalizePlanContent(sub.plan?.content).grants);

          const hasPersonalPlan =
            personalPlanGrants.includes(ACCESS_KEYS.PREMIUM) ||
            personalPlanGrants.includes(ACCESS_KEYS.COMMUNITY);

          const personalWorkspace: WorkspaceItem = {
            ...DEFAULT_PERSONAL_WORKSPACE,
            requiresSubscription: !hasPersonalPlan,
          };

          const isClinicAdmin = orgs.some(o => o.role === 'CLINIC_ADMIN');
          const allWorkspaces = isClinicAdmin ? orgs : [personalWorkspace, ...orgs];

          if (options?.preserveSelection) {
            set({ workspaces: allWorkspaces, isLoading: false, hasLoaded: true });
            return;
          }

          const currentId = get().activeWorkspace.id;
          const matched = allWorkspaces.find((w) => w.id === currentId);
          const primaryOrg = orgs.find((o) => o.role === 'CLINIC_ADMIN') || orgs[0];
          const selectedWorkspace = isClinicAdmin
            ? (matched && matched.type === 'ORGANIZATION' ? matched : orgs.find((o) => o.role === 'CLINIC_ADMIN') || orgs[0])
            : (matched || (primaryOrg || personalWorkspace));

          set({
            workspaces: allWorkspaces,
            activeWorkspace: selectedWorkspace,
            isLoading: false,
            hasLoaded: true,
          });
        } catch (error) {
          console.error('Error al cargar workspaces:', error);
          // Mark the load as settled even on failure so routers never wait forever.
          set({ isLoading: false, hasLoaded: true });
        }
      },
    }),
    {
      name: 'nutringest-workspace-storage',
      partialize: (state) => ({
        activeWorkspace: state.activeWorkspace,
        workspaces: state.workspaces,
      }),
    }
  )
);
