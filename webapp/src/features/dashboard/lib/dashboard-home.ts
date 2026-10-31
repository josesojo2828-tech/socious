export type DashboardHomeRoute =
  | "org-workspace"
  | "platform-admin"
  | "login"
  | "choose-workspace";

/**
 * Pure routing decision for the `/dashboard` root.
 *
 * The workspace store defaults to PERSONAL until
 * `/api/organizations/my-workspaces` answers, so the caller must wait for
 * `hasLoaded` before invoking this — routing on the default bounces real
 * organization users to the public landing page.
 *
 * - Organization workspace → the sales floor (`/dashboard/ventas`).
 * - Platform admin (ADMIN/SUPERADMIN or USER_LIST) outside an org → `/dashboard/users`.
 * - No user after the session check → `/login` (never the public site).
 * - Authenticated, no organization → stay put and ask for a workspace.
 */
export function resolveDashboardHome(input: {
  workspaceType: string | null | undefined;
  isAdmin: boolean;
  hasUserListPermit: boolean;
  hasUser: boolean;
}): DashboardHomeRoute {
  if (!input.hasUser) return "login";
  if (input.workspaceType === "ORGANIZATION") return "org-workspace";
  if (input.isAdmin || input.hasUserListPermit) return "platform-admin";
  return "choose-workspace";
}
