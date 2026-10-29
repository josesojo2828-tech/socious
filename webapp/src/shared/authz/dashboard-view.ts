import { hasPermit, isAdmin, type AuthzUser } from "./index";

export type DashboardView = "patient" | "admin" | "clinic" | "user";

/**
 * Pure routing decision for the `/dashboard` root.
 *
 * - `PATIENT` permit → patient dashboard.
 * - Platform admin (`ADMIN`/`SUPERADMIN` — `isAdmin` is a superset — or the
 *   `USER_LIST` permit) OUTSIDE a clinic workspace → admin analytics. Using
 *   `isAdmin` (rather than only `SUPERADMIN`) makes the routing independent of
 *   whether the `ADMIN` permit happens to include `USER_LIST`.
 * - Inside a clinic/org workspace → clinic dashboard.
 * - Otherwise → the individual nutritionist dashboard.
 *
 * Extracted from the component so the authz routing can be unit-tested
 * without a DOM/testing-library setup.
 */
export function resolveDashboardView(
  user: AuthzUser | null | undefined,
  isClinicWorkspace: boolean,
): DashboardView {
  if (user?.permits?.name === "PATIENT") return "patient";
  if (!isClinicWorkspace && (isAdmin(user) || hasPermit(user, "USER_LIST"))) {
    return "admin";
  }
  if (isClinicWorkspace) return "clinic";
  return "user";
}
