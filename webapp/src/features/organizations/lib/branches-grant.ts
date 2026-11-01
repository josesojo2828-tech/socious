import type { AdminOrganizationGrant } from "../types/organization-admin.type";

/** The one grant this screen can toggle. */
export const BRANCHES_MODULE_KEY = "BRANCHES";

/**
 * True when the organization currently holds an ACTIVE BRANCHES grant —
 * the ON state of the admin toggle.
 */
export function hasActiveBranchesGrant(
  grants: readonly AdminOrganizationGrant[],
): boolean {
  return grants.some(
    (row) =>
      row.moduleKey === BRANCHES_MODULE_KEY && row.status === "ACTIVE",
  );
}

/**
 * Every OTHER active grant, for the read-only transparency chips.
 * BRANCHES is excluded: it has its own toggle column.
 */
export function otherActiveGrantChips(
  grants: readonly AdminOrganizationGrant[],
): AdminOrganizationGrant[] {
  return grants.filter(
    (row) =>
      row.moduleKey !== BRANCHES_MODULE_KEY && row.status === "ACTIVE",
  );
}
