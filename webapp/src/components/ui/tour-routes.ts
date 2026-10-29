export type TourKind = "dashboard" | "profile" | "wallet";

export interface TourRoute {
  kind: TourKind;
  storageKey: string;
}

const TOUR_STORAGE_KEYS: Record<TourKind, string> = {
  dashboard: "nutringest.dashboard.tour.v1",
  profile: "nutringest.profile.tour.v1",
  wallet: "nutringest.wallet.tour.v1",
};

/**
 * Explicit allowlist: only these EXACT routes own a tour. Anything else under
 * `/dashboard/**` (subroutes, CRUD pages, adoption, patients, …) resolves to
 * `null` so it never inherits the dashboard walkthrough.
 */
const TOUR_ROUTES: Record<string, TourKind> = {
  "/dashboard": "dashboard",
  "/dashboard/profile": "profile",
  "/dashboard/wallet": "wallet",
};

export function normalizePathname(pathname: string | null | undefined): string {
  if (!pathname) return "";
  const withoutQuery = pathname.split(/[?#]/, 1)[0];
  const trimmed = withoutQuery.replace(/\/+$/, "");
  return trimmed || "/";
}

export function resolveTourRoute(pathname: string | null | undefined): TourRoute | null {
  const kind = TOUR_ROUTES[normalizePathname(pathname)];
  if (!kind) return null;
  return { kind, storageKey: TOUR_STORAGE_KEYS[kind] };
}

/**
 * Minimal shape the gate needs from the authenticated user. Mirrors the field
 * the webapp already trusts for role gating: the resolved `permits.name`.
 */
export interface TourUser {
  permits?: { name?: string | null } | null;
}

/**
 * Permits that identify an individual NUTRITIONIST.
 *
 * `USER` is the canonical one: the backend creates a `nutritionistProfile`
 * exclusively for `permitId === "USER"` (serverapp `user.service.ts`) and its
 * permit description is literally "User / Nutritionist Permit"
 * (`seed.test-users.ts`). `NUTRITIONIST` is accepted defensively for
 * future/custom permits, even though no seeded `Permit.name` currently uses
 * it (it is not part of the `PermitName` union).
 *
 * Explicitly NOT nutritionists for the dashboard walkthrough:
 * `SUPERADMIN`, `ADMIN`, `PATIENT`, `CLINIC`, `CLINIC_ADMIN`, `CLINIC_STAFF`.
 */
export const NUTRITIONIST_PERMITS: ReadonlySet<string> = new Set([
  "USER",
  "NUTRITIONIST",
]);

export function isNutritionist(user: TourUser | null | undefined): boolean {
  const permitName = user?.permits?.name;
  return typeof permitName === "string" && NUTRITIONIST_PERMITS.has(permitName);
}

/**
 * Route-scoped tour resolution + role/workspace gate.
 *
 * The DASHBOARD tour is restricted to nutritionists only: admins, patients and
 * clinic roles reach `/dashboard` too, but the generic "bienvenido a tu panel"
 * walkthrough is meant for the individual professional. It is ALSO hidden when
 * the active workspace is an organization/clinic: a `USER` who joined a clinic
 * keeps the `USER` permit, so without this check they would see the personal
 * walkthrough inside the clinic workspace. Profile and wallet tours are
 * intentionally NOT gated (the requirement only covers the dashboard tour, and
 * those pages are shared by every role).
 */
export function resolveTour(
  pathname: string | null | undefined,
  user: TourUser | null | undefined,
  isClinicWorkspace = false,
): TourRoute | null {
  const route = resolveTourRoute(pathname);
  if (!route) return null;
  if (route.kind === "dashboard" && (!isNutritionist(user) || isClinicWorkspace)) {
    return null;
  }
  return route;
}
