/**
 * Tenant settings routes (S4). Both verbs share the resource: the backend
 * resolves the workspace from the `X-Workspace-Id` header the api client
 * already sends for organization workspaces.
 */
export const SettingsEndpoints = {
  get: "/api/settings",
  update: "/api/settings",
};
