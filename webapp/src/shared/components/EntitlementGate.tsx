'use client';

import { useEffect } from 'react';
import { Lock } from 'lucide-react';
import { useEntitlementStore } from '@/shared/store/entitlement/useEntitlementStore';
import { useWorkspaceStore } from '@/shared/store/workspace/useWorkspaceStore';

interface EntitlementGateProps {
  children: React.ReactNode;
  /** Module key (sidebar/route registry) required to render the children. */
  module?: string;
  /** Machine entitlement key required to render the children. */
  entitlement?: string;
  /** Custom UI rendered when access is denied. */
  fallback?: React.ReactNode;
  /** Custom UI rendered while the resolution is loading. */
  loadingFallback?: React.ReactNode;
}

/**
 * Client-side gate for entitlement-driven modules. Resolves the effective
 * entitlements for the active workspace from `/api/entitlements/me` (via
 * `useEntitlementStore`) and renders `children` only when every requested key is
 * granted. Refetches when the active workspace changes.
 */
export function EntitlementGate({
  children,
  module,
  entitlement,
  fallback,
  loadingFallback,
}: EntitlementGateProps) {
  const activeWorkspaceId = useWorkspaceStore(
    (state) => state.activeWorkspace?.id,
  );
  const hydrated = useEntitlementStore((state) => state.hydrated);
  const isLoading = useEntitlementStore((state) => state.isLoading);
  const workspaceId = useEntitlementStore((state) => state.workspaceId);
  const fetchEntitlements = useEntitlementStore(
    (state) => state.fetchEntitlements,
  );
  const hasEntitlement = useEntitlementStore((state) => state.hasEntitlement);
  const canAccessModule = useEntitlementStore((state) => state.canAccessModule);

  useEffect(() => {
    if (!hydrated || workspaceId !== activeWorkspaceId) {
      void fetchEntitlements();
    }
  }, [activeWorkspaceId, hydrated, workspaceId, fetchEntitlements]);

  if (!hydrated || isLoading) {
    return (
      loadingFallback ?? (
        <div className="flex justify-center items-center h-64">
          <span className="loading loading-spinner loading-lg" />
        </div>
      )
    );
  }

  const isAllowed =
    (!module || canAccessModule(module)) &&
    (!entitlement || hasEntitlement(entitlement));

  if (!isAllowed) {
    return (
      fallback ?? (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="text-center">
            <Lock className="w-10 h-10 text-base-content/40 mx-auto mb-3" />
            <h2 className="text-2xl font-bold text-base-content">
              Módulo no habilitado
            </h2>
            <p className="text-base-content/60 mt-2">
              Tu plan actual no incluye este módulo.
            </p>
            <p className="text-base-content/40 text-sm mt-1">
              Habilitalo desde la configuración de add-ons de tu organización.
            </p>
          </div>
        </div>
      )
    );
  }

  return <>{children}</>;
}
