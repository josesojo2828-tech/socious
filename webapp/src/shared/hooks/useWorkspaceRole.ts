import { useWorkspaceStore } from '@/shared/store/workspace/useWorkspaceStore';
import { useAuthStore } from '@/shared/store/auth/useAuthStore';

export type WorkspaceViewScope = 'GLOBAL' | 'PERSONAL';

export function useWorkspaceRole() {
  const { activeWorkspace, workspaces } = useWorkspaceStore();
  const { user } = useAuthStore();

  const isOrganization = activeWorkspace?.type === 'ORGANIZATION';

  const isGlobalAdmin =
    activeWorkspace?.role === 'CLINIC_ADMIN' ||
    activeWorkspace?.role === 'CLINIC_MANAGER' ||
    user?.permits?.name === 'ADMIN' ||
    user?.permits?.name === 'SUPERADMIN';

  const isNutritionist = isOrganization && !isGlobalAdmin;

  const currentRole = activeWorkspace?.role || null;

  // Only resolve orgId when on ORGANIZATION workspace (data isolation)
  const targetOrgWorkspace = isOrganization ? activeWorkspace : null;
  const orgId = isOrganization ? (activeWorkspace?.id || null) : null;

  return {
    activeWorkspace,
    isOrganization,
    isGlobalAdmin,
    isNutritionist,
    currentRole,
    targetOrgWorkspace,
    orgId,
  };
}
