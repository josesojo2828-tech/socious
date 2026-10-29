import type { SubscriptionPlanContent } from '@/types/backend/schema.types';

/**
 * Stable machine keys for entitlement gating.
 *
 * Mirrors the backend `ACCESS_KEYS` (`serverapp/src/modules/permit/service/permission.service.ts`).
 * Gating MUST use these stable keys — NEVER plan display names.
 */
export const ACCESS_KEYS = {
  PREMIUM: "PREMIUM_ACCESS",
  COMMUNITY: "COMMUNITY_ACCESS",
  PORTFOLIO: "PORTFOLIO_MANAGE",
  PORTFOLIO_TAB: "PERMIT_DASHBOARD_TAB_WEBSITE",
  INSTITUTIONAL_FOOD: "INSTITUTIONAL_FOOD_ACCESS",
} as const;

export interface AuthzEntitlementModule {
  key?: string | null;
  source?: "PLAN" | "ADDON" | string | null;
  addOnId?: string | null;
}

export interface AuthzSubscription {
  status?: string | null;
  organizationId?: string | null;
  endDate?: Date | string | null;
  plan?: { content?: unknown } | null;
}

export interface AuthzUser {
  permits?: { name?: string | null; list?: string[] | null } | null;
  userPermissions?: {
    permission: string;
    expiresAt?: Date | string | null;
  }[] | null;
  /** Resolved entitlements attached by the backend (`/api/entitlements/me`, `request.user`). */
  entitlements?: {
    permissions?: string[] | null;
    modules?: (string | AuthzEntitlementModule)[] | null;
  } | null;
  subscriptions?: AuthzSubscription[] | null;
}

export type NormalizedPlanContent = SubscriptionPlanContent;

/**
 * Normalize a `SubscriptionPlan.content` value. Backward-compatible with the
 * legacy `string[]` bullet shape (mapped to `features`). NEVER matches display
 * names — only stable machine keys in `grants`/`modules`.
 */
export function normalizePlanContent(content: unknown): NormalizedPlanContent {
  const toStringArray = (value: unknown): string[] =>
    Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];

  if (Array.isArray(content)) {
    return { features: toStringArray(content), grants: [], modules: [] };
  }

  if (content && typeof content === "object") {
    const record = content as Record<string, unknown>;
    return {
      features: toStringArray(record.features),
      grants: toStringArray(record.grants),
      modules: toStringArray(record.modules),
    };
  }

  return { features: [], grants: [], modules: [] };
}

function isActiveSubscription(sub: AuthzSubscription): boolean {
  if (sub.status !== "ACTIVE") return false;
  if (!sub.endDate) return true;
  const end = new Date(sub.endDate).getTime();
  return Number.isNaN(end) || end > Date.now();
}

/** Machine keys granted by the user's active subscription plans. */
function planGrantKeys(user?: AuthzUser | null): string[] {
  return (user?.subscriptions ?? [])
    .filter(isActiveSubscription)
    .flatMap((sub) => normalizePlanContent(sub.plan?.content).grants);
}

/** Module keys unlocked by the user's active subscription plans. */
function planModuleKeys(user?: AuthzUser | null): string[] {
  return (user?.subscriptions ?? [])
    .filter(isActiveSubscription)
    .flatMap((sub) => normalizePlanContent(sub.plan?.content).modules);
}

function hasResolvedModule(
  user: AuthzUser | null | undefined,
  moduleKey: string,
): boolean {
  return (user?.entitlements?.modules ?? []).some((module) =>
    typeof module === "string" ? module === moduleKey : module?.key === moduleKey,
  );
}

export function isSuperadmin(user?: AuthzUser | null): boolean {
  return user?.permits?.name === "SUPERADMIN";
}

export function isAdmin(user?: AuthzUser | null): boolean {
  const name = user?.permits?.name;
  return name === "ADMIN" || name === "SUPERADMIN";
}

export function isNutritionist(user?: AuthzUser | null): boolean {
  return user?.permits?.name === "USER";
}

export function hasPermit(
  user: AuthzUser | null | undefined,
  permission: string,
): boolean {
  if (user?.permits?.list?.includes(permission)) return true;

  return (
    user?.userPermissions?.some(
      (p) =>
        p.permission === permission &&
        (!p.expiresAt || new Date(p.expiresAt) > new Date()),
    ) ?? false
  );
}

export function hasAnyPermit(
  user: AuthzUser | null | undefined,
  permissions: string[],
): boolean {
  return permissions.some((permission) => hasPermit(user, permission));
}

/**
 * True when the caller holds the given machine key through ANY channel: role
 * permits, resolved entitlements (plan + add-on grants), explicit grants, or the
 * active plan's `content.grants`. Mirrors the backend `PermissionService.hasKey`.
 */
export function hasEntitlement(
  user: AuthzUser | null | undefined,
  key: string,
): boolean {
  if (!user || !key) return false;
  if (user.permits?.list?.includes(key)) return true;
  if (user.entitlements?.permissions?.includes(key)) return true;
  if (
    user.userPermissions?.some(
      (p) =>
        p.permission === key &&
        (!p.expiresAt || new Date(p.expiresAt) > new Date()),
    )
  ) {
    return true;
  }
  return planGrantKeys(user).includes(key);
}

/**
 * True when the module (sidebar/route registry key) is unlocked for the caller,
 * either by a resolved entitlement module or by an active plan's `content.modules`.
 */
export function canAccessModule(
  user: AuthzUser | null | undefined,
  moduleKey: string,
): boolean {
  if (!user || !moduleKey) return false;
  if (hasResolvedModule(user, moduleKey)) return true;
  return planModuleKeys(user).includes(moduleKey);
}
