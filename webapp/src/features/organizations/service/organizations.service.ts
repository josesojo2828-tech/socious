import { apiClient } from "@/shared/api/api.client";
import { moduleService } from "@/features/modules/service/module.service";
import type { ModuleGrant } from "@/features/modules/service/module.service";
import { OrganizationsEndpoints } from "./organizations.endpoints";
import { BRANCHES_MODULE_KEY } from "../lib/branches-grant";
import type { AdminOrganization } from "../types/organization-admin.type";

/**
 * Admin client for the platform-wide organization list (`GET
 * /api/organizations`) and the BRANCHES grant toggle.
 *
 * The toggle reuses the existing module-grant endpoints unchanged:
 *   POST   /api/modules/grants            (assign/reactivate, MANUAL)
 *   DELETE /api/modules/grants/:id        (revoke → REVOKED)
 * The list endpoint is the only new backend surface; it is global-roles-only
 * and answers each org with its ACTIVE plan and ACTIVE module grants.
 */
export const organizationsService = {
  /** Every non-deleted organization with plan + active grants. */
  async listAll(): Promise<AdminOrganization[]> {
    const { data } = await apiClient.get<AdminOrganization[]>(
      OrganizationsEndpoints.list,
    );
    return Array.isArray(data) ? data : [];
  },

  /**
   * Turn the BRANCHES grant ON (assign/reactivate) or OFF (revoke) for one
   * organization. Returns the grant row so the caller can refresh the row
   * with the server's authoritative id/status.
   */
  async setBranchesGrant(
    organizationId: string,
    enabled: boolean,
    currentGrants: readonly { id: string; moduleKey: string; status: string }[],
  ): Promise<ModuleGrant> {
    if (enabled) {
      return moduleService.assign({
        moduleKey: BRANCHES_MODULE_KEY,
        organizationId,
      });
    }

    const active = currentGrants.find(
      (row) =>
        row.moduleKey === BRANCHES_MODULE_KEY && row.status === "ACTIVE",
    );
    if (!active) {
      // Nothing to revoke: the row was already OFF (e.g. a stale list).
      // Surface it as a no-op the caller can treat as success.
      throw new Error("No hay permiso BRANCHES activo para revocar.");
    }
    return moduleService.revoke(active.id);
  },
};
