import { apiClient } from '@/shared/api/api.client';
import {
  moduleService,
  isModuleGrantActive,
  type AssignModulePayload,
  type ModuleCatalogEntry,
  type ModuleGrant,
} from '@/features/modules/service/module.service';

/**
 * Admin CRUD for the add-on entitlement engine.
 *
 * Mirrors the backend contract (`serverapp/src/modules/organization/entitlement.controller.ts`):
 *   GET    /api/entitlements/addons
 *   GET    /api/entitlements/users/:id
 *   POST   /api/entitlements/users/:id
 *   DELETE /api/entitlements/users/:id/:entitlementId
 *   GET    /api/entitlements/organizations/:id
 *   POST   /api/entitlements/organizations/:id
 *   DELETE /api/entitlements/organizations/:id/:entitlementId
 *
 * Also exposes the module-framework assignment surface (delegated to
 * `moduleService`, the single API client for `/api/modules`).
 */

export type { AssignModulePayload, ModuleCatalogEntry, ModuleGrant };
export { isModuleGrantActive };

export type EntitlementStatus = 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'CANCELED';

/** Catalog add-on. `price` is a Prisma `Decimal` serialized as a string. */
export interface AddOn {
  id: string;
  key: string;
  name: string;
  description: string | null;
  price: string | number;
  currency: string;
  billingPeriod: string;
  grants: string[];
  modules: string[];
  active: boolean;
}

/** An owner-scoped entitlement (organization or personal). */
export interface Entitlement {
  id: string;
  organizationId: string | null;
  userId: string | null;
  addOnId: string;
  status: EntitlementStatus;
  startDate: string;
  endDate: string | null;
  quantity: number;
  priceAtPurchase: string | number;
  currency: string;
  addOn: AddOn;
}

export interface EnableEntitlementPayload {
  addOnId: string;
  quantity?: number;
}

/** True when the entitlement currently grants access (ACTIVE and not expired). */
export function isEntitlementActive(
  entitlement: Pick<Entitlement, 'status' | 'endDate'>,
): boolean {
  if (entitlement.status !== 'ACTIVE') return false;
  if (!entitlement.endDate) return true;
  const end = new Date(entitlement.endDate).getTime();
  return Number.isNaN(end) || end > Date.now();
}

export const entitlementService = {
  /** Active add-on catalog offered to owners. */
  async listAddOns(): Promise<AddOn[]> {
    const { data } = await apiClient.get<AddOn[]>('/api/entitlements/addons');
    return data ?? [];
  },

  async listForUser(userId: string): Promise<Entitlement[]> {
    const { data } = await apiClient.get<Entitlement[]>(
      `/api/entitlements/users/${userId}`,
    );
    return data ?? [];
  },

  async enableForUser(
    userId: string,
    payload: EnableEntitlementPayload,
  ): Promise<Entitlement> {
    const { data } = await apiClient.post<Entitlement>(
      `/api/entitlements/users/${userId}`,
      payload,
    );
    return data;
  },

  async disableForUser(
    userId: string,
    entitlementId: string,
  ): Promise<Entitlement> {
    const { data } = await apiClient.delete<Entitlement>(
      `/api/entitlements/users/${userId}/${entitlementId}`,
    );
    return data;
  },

  async listForOrganization(organizationId: string): Promise<Entitlement[]> {
    const { data } = await apiClient.get<Entitlement[]>(
      `/api/entitlements/organizations/${organizationId}`,
    );
    return data ?? [];
  },

  async enableForOrganization(
    organizationId: string,
    payload: EnableEntitlementPayload,
  ): Promise<Entitlement> {
    const { data } = await apiClient.post<Entitlement>(
      `/api/entitlements/organizations/${organizationId}`,
      payload,
    );
    return data;
  },

  async disableForOrganization(
    organizationId: string,
    entitlementId: string,
  ): Promise<Entitlement> {
    const { data } = await apiClient.delete<Entitlement>(
      `/api/entitlements/organizations/${organizationId}/${entitlementId}`,
    );
    return data;
  },

  // ---------------------------------------------------------------------------
  // Module framework (MANUAL grants) — thin wrappers over `moduleService`.
  // ---------------------------------------------------------------------------

  /** Active module catalog (`GET /api/modules`). */
  async listModules(): Promise<ModuleCatalogEntry[]> {
    return moduleService.listCatalog();
  },

  /** Owner-scoped module grants (`GET /api/modules/grants`). */
  async listModuleGrants(query: {
    userId?: string;
    organizationId?: string;
  } = {}): Promise<ModuleGrant[]> {
    return moduleService.listGrants(query);
  },

  /** Assign (or reactivate) a MANUAL module grant for an owner. */
  async assignModule(payload: AssignModulePayload): Promise<ModuleGrant> {
    return moduleService.assign(payload);
  },

  /** Revoke a module grant (`status=REVOKED`). */
  async revokeModule(id: string): Promise<ModuleGrant> {
    return moduleService.revoke(id);
  },
};
