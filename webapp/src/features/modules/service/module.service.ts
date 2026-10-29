import { apiClient } from '@/shared/api/api.client';
import type { ModuleDashboardPayload, ModuleScope } from '../types';

/**
 * Client for the module-framework endpoints (Phase 2/3 backend).
 *
 *   GET    /api/modules                                → active catalog
 *   GET    /api/modules/grants?userId&organizationId   → owner-scoped grants
 *   POST   /api/modules/grants                         → assign (MANUAL)
 *   DELETE /api/modules/grants/:id                     → revoke (→ REVOKED)
 *   GET    /api/modules/:key/dashboard?scope&userId    → module dashboard
 */

export type ModuleGrantSource = 'PLAN' | 'ADDON' | 'MANUAL';
export type ModuleGrantStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED';

/** A catalog entry (`Module`). `key` is the stable machine key. */
export interface ModuleCatalogEntry {
  id: string;
  key: string;
  name: string;
  description: string | null;
  icon: string | null;
  category: string | null;
  scopes: ModuleScope[];
  operatorPermit: string | null;
  dashboardKind: string | null;
  active: boolean;
  sortOrder: number;
}

/** A materialized effective assignment (`ModuleGrant`). */
export interface ModuleGrant {
  id: string;
  moduleId: string;
  userId: string | null;
  organizationId: string | null;
  source: ModuleGrantSource;
  entitlementId: string | null;
  status: ModuleGrantStatus;
  grantedAt: string;
  expiresAt: string | null;
  grantedById: string | null;
  module?: ModuleCatalogEntry;
}

/** Payload for `POST /api/modules/grants` (exactly one owner is required). */
export interface AssignModulePayload {
  moduleKey: string;
  userId?: string;
  organizationId?: string;
  /** Optional expiry (ISO date). Omitted ⇒ the grant never expires. */
  expiresAt?: string;
}

export interface ListModuleGrantsQuery {
  userId?: string;
  organizationId?: string;
}

export interface ModuleDashboardQuery {
  scope?: ModuleScope;
  userId?: string;
}

/**
 * True when a grant currently grants access: `status=ACTIVE` and not past its
 * optional `expiresAt`. Mirrors the backend `vigente` predicate (spec: Silent
 * Expiry).
 */
export function isModuleGrantActive(
  grant: Pick<ModuleGrant, 'status' | 'expiresAt'>,
): boolean {
  if (grant.status !== 'ACTIVE') return false;
  if (!grant.expiresAt) return true;
  const end = new Date(grant.expiresAt).getTime();
  return Number.isNaN(end) || end > Date.now();
}

export const moduleService = {
  /** Active module catalog. */
  async listCatalog(): Promise<ModuleCatalogEntry[]> {
    const { data } = await apiClient.get<ModuleCatalogEntry[]>('/api/modules');
    return data ?? [];
  },

  /** Grants for an owner (`?userId` or `?organizationId`). */
  async listGrants(
    query: ListModuleGrantsQuery = {},
  ): Promise<ModuleGrant[]> {
    const { data } = await apiClient.get<ModuleGrant[]>('/api/modules/grants', {
      params: query,
    });
    return data ?? [];
  },

  /** Assign (or reactivate) a MANUAL grant. */
  async assign(payload: AssignModulePayload): Promise<ModuleGrant> {
    const { data } = await apiClient.post<ModuleGrant>(
      '/api/modules/grants',
      payload,
    );
    return data;
  },

  /** Revoke a grant (`status=REVOKED`). */
  async revoke(id: string): Promise<ModuleGrant> {
    const { data } = await apiClient.delete<ModuleGrant>(
      `/api/modules/grants/${id}`,
    );
    return data;
  },

  /** Scope-adapted dashboard payload for a module key. */
  async getDashboard(
    moduleKey: string,
    query: ModuleDashboardQuery = {},
  ): Promise<ModuleDashboardPayload> {
    const { data } = await apiClient.get<ModuleDashboardPayload>(
      `/api/modules/${moduleKey}/dashboard`,
      { params: query },
    );
    return data;
  },
};
