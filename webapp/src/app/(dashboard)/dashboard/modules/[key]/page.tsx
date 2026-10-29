'use client';

import { useParams } from 'next/navigation';
import { EntitlementGate } from '@/shared/components/EntitlementGate';
import { ModuleDashboardHost } from '@/features/modules/components/ModuleDashboardHost';

/**
 * Tenant-scoped module dashboard (`/dashboard/modules/[key]`). The module key
 * is the stable `Module.key` from the catalog. Access is gated client-side by
 * the resolved entitlements (plan + add-on + MANUAL grants).
 */
export default function ModuleDashboardPage() {
  const params = useParams();
  const key = typeof params?.key === 'string' ? params.key : '';

  if (!key) return null;

  return (
    <EntitlementGate module={key}>
      <ModuleDashboardHost moduleKey={key} scope="TENANT" />
    </EntitlementGate>
  );
}
