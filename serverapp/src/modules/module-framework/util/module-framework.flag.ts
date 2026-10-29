/**
 * Feature flag `MODULE_FRAMEWORK_ENABLED` (design "Rollout / Flags").
 *
 * Off by default so the module framework stays inert until it is rolled out
 * together with `ENTITLEMENTS_ENABLED` (the sidebar needs the entitlement union
 * to be live). Mirrors `isEntitlementsEnabled()` in
 * `permit/guards/entitlement.guard.ts` so both flags are read the same way.
 *
 * Gates THREE surfaces, which MUST be enabled together for the sidebar to be
 * live:
 *   1. MANUAL `ModuleGrant` inclusion in the entitlement resolution
 *      (`EntitlementService.resolve`).
 *   2. The grouped admin "Módulos" sidebar section (`DashboardService`).
 *   3. The module routes (`ModuleController` / `ModuleDashboardController`).
 */
export function isModuleFrameworkEnabled(): boolean {
  const value = process.env.MODULE_FRAMEWORK_ENABLED;
  return value === "true" || value === "1";
}
