/** Branches of the current tenant (S11 of the webapp port). */
export const BranchEndpoints = {
  list: "/api/branches",
  detail: (branchId: string) => `/api/branches/${branchId}`,
};
