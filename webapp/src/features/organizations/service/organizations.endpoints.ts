/** Platform-admin organization routes (global roles only). */
export const OrganizationsEndpoints = {
  /** `GET` lists every org with plan + active grants; global roles only. */
  list: "/api/organizations",
  /** `PATCH` marca al cliente como mayorista (S1); global roles only. */
  wholesaler: (organizationId: string) =>
    `/api/organizations/${organizationId}/wholesaler`,
};
