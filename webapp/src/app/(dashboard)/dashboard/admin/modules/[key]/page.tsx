'use client';

import { useParams } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { EntitlementGate } from '@/shared/components/EntitlementGate';
import { useAuthStore } from '@/shared/store/auth/useAuthStore';
import { isAdmin } from '@/shared/authz';
import { ModuleDashboardHost } from '@/features/modules/components/ModuleDashboardHost';

/**
 * Admin-scoped module dashboard (`/dashboard/admin/modules/[key]`). Global
 * admins (ADMIN/SUPERADMIN) see every active module from the server-driven
 * sidebar, so this route is NOT gated by module entitlement — it requires the
 * admin role instead. `EntitlementGate` (no key) is kept as the workspace
 * hydration shell so the chrome stays consistent with tenant routes.
 */
export default function AdminModuleDashboardPage() {
  const params = useParams();
  const key = typeof params?.key === 'string' ? params.key : '';
  const user = useAuthStore((state) => state.user);

  if (!key) return null;

  return (
    <EntitlementGate>
      {isAdmin(user) ? (
        <ModuleDashboardHost moduleKey={key} scope="ADMIN" />
      ) : (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
          <ShieldAlert className="w-10 h-10 text-base-content/40" />
          <div>
            <h2 className="text-xl font-bold text-base-content">
              Acceso restringido
            </h2>
            <p className="text-sm text-base-content/60 mt-1">
              No tienes permisos de administrador para ver este panel.
            </p>
          </div>
        </div>
      )}
    </EntitlementGate>
  );
}
