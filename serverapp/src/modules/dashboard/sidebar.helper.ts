import { SidebarSection } from "src/shared/types/dashboard.type";
import { DashboardService } from "./dashboard.service";

/**
 * Minimal structural view of the session user needed to build the sidebar.
 * `RequestWithUser.user` (a `User & { entitlements }`) and the freshly loaded
 * user from `UserService` both satisfy it.
 */
export interface SidebarUser {
  id: string;
  permits?: { name?: string | null; list?: string[] | null } | null;
  userPermissions?: { permission: string }[] | null;
}

/** Resolved-entitlements subset consumed by the sidebar. */
export interface SidebarEntitlements {
  permissions?: string[] | null;
  modules?: { key: string }[] | null;
}

/**
 * SINGLE source of truth for the sidebar derivation (task 3.4).
 *
 * The sidebar is built in two places — `DashboardController.sidebar()` and
 * `InjectUserInterceptor` — and they MUST NOT drift. Both delegate here:
 * the resolved entitlement union wins, with a fallback to the explicit
 * permits/userPermissions when entitlements were not attached (flag off).
 */
export function buildSidebarSections(
  dashboardService: DashboardService,
  user: SidebarUser,
  resolved?: SidebarEntitlements | null,
  /** Resolved workspace of the caller: gates tenant-only entries (S8). */
  organizationId?: string | null,
): Promise<SidebarSection[]> {
  const permits = resolved?.permissions ?? [
    ...(user.permits?.list ?? []),
    ...(user.userPermissions?.map((permission) => permission.permission) ?? []),
  ];
  const modules = resolved?.modules?.map((module) => module.key) ?? [];
  const isGlobalRole =
    user.permits?.name === "SUPERADMIN" || user.permits?.name === "ADMIN";
  const isPatient = user.permits?.name === "PATIENT";

  console.log('[SIDEBAR DEBUG] Permits count:', permits?.length, 'Modules:', JSON.stringify(modules));
  console.log('[SIDEBAR DEBUG] Has INSTITUTIONAL_FOOD_ACCESS?', permits?.includes('INSTITUTIONAL_FOOD_ACCESS'), 'Has INSTITUTIONAL_FOOD module?', modules?.includes('INSTITUTIONAL_FOOD'));

  return dashboardService.getSidebarSections({
    id: user.id,
    permits,
    modules,
    isPatient,
    isGlobalRole,
    organizationId,
  });
}
