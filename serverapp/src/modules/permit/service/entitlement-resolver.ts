import { normalizeSubscriptionPlanContent } from "src/modules/subscription/util/subscription-plan-content.util";
import { vigente } from "src/modules/module-framework/util/vigente.util";

/**
 * Pure entitlement resolution (design D1/D3/D4/D5).
 *
 * `resolveEntitlements` is side-effect free and DB-free so it can be unit
 * tested directly (mirrors the `permit/authz.ts` pattern). `EntitlementService`
 * is only the I/O shell: it loads the user + entitlements, caches, and delegates
 * the union to this function.
 *
 * Union produced: `rolePerms ∪ globalPerms ∪ orgPerms ∪ planGrants ∪ entGrants`.
 * Context-aware: `organizationId` present ⇒ org workspace; `null` ⇒ personal.
 */

export type EntitlementModuleSource = "PLAN" | "ADDON" | "MANUAL";

export interface ResolvedEntitlementModule {
  key: string;
  source: EntitlementModuleSource;
  addOnId?: string;
}

export interface ResolvedEntitlements {
  permissions: string[];
  modules: ResolvedEntitlementModule[];
  fieldPolicies: Record<string, unknown>;
  organizationId: string | null;
}

export interface ResolvableUserPermission {
  permission: string;
  organizationId?: string | null;
  expiresAt?: Date | string | null;
}

export interface ResolvableSubscription {
  status?: string | null;
  organizationId?: string | null;
  endDate?: Date | string | null;
  planId?: string | null;
  plan?: { content?: unknown } | null;
}

export interface ResolvableUser {
  id?: string | null;
  email?: string | null;
  permits?: { list?: string[] | null } | null;
  userPermissions?: ResolvableUserPermission[] | null;
  subscriptions?: ResolvableSubscription[] | null;
}

export interface ResolvableAddOn {
  id?: string | null;
  key?: string | null;
  grants?: string[] | null;
  modules?: string[] | null;
  fieldPolicies?: unknown;
}

export interface ResolvableEntitlement {
  organizationId?: string | null;
  userId?: string | null;
  status?: string | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  addOn?: ResolvableAddOn | null;
}

/**
 * A materialized `ModuleGrant` (task 3.1). Only MANUAL grants are materialized
 * (PLAN/ADDON modules keep being derived from the plan/add-on, design D5); the
 * owner scoping is applied by the I/O shell (`EntitlementService`), which loads
 * only the grants relevant to the caller's workspace.
 */
export interface ResolvableModuleGrant {
  moduleKey: string;
  source?: string | null;
  status?: string | null;
  expiresAt?: Date | string | null;
}

function toTime(value: Date | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

function isNotExpired(
  expiresAt: Date | string | null | undefined,
  now: number,
): boolean {
  const time = toTime(expiresAt);
  return time === null || time > now;
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter((value) => !!value))];
}

function mergeFieldPolicies(
  target: Record<string, unknown>,
  policy: unknown,
): void {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) return;
  Object.assign(target, policy as Record<string, unknown>);
}

/**
 * Resolve the effective entitlements for a user in a workspace context.
 *
 * @param user          The already-loaded user (permits, userPermissions, subscriptions+plan).
 * @param entitlements  Active entitlements owned by the org and/or the user.
 * @param organizationId `X-Workspace-Id` value, or `null` for the personal context.
 * @param now           Injectable clock (tests).
 * @param moduleGrants  Materialized MANUAL grants relevant to this workspace
 *                      (already owner-scoped by the I/O shell). Optional and
 *                      backward compatible.
 */
export function resolveEntitlements(
  user: ResolvableUser | null | undefined,
  entitlements: ResolvableEntitlement[] | null | undefined,
  organizationId: string | null,
  now: Date = new Date(),
  moduleGrants: ResolvableModuleGrant[] = [],
): ResolvedEntitlements {
  const nowTime = now.getTime();
  const userId = user?.id ?? null;
  const org =
    organizationId &&
    organizationId !== "personal" &&
    organizationId !== "null"
      ? organizationId
      : null;

  // 1. Role baseline.
  const rolePerms = user?.permits?.list ?? [];

  // 2. Global + org-scoped explicit grants (no cross-tenant leak).
  const grants = user?.userPermissions ?? [];
  const globalPerms = grants
    .filter(
      (grant) =>
        (grant.organizationId ?? null) === null &&
        isNotExpired(grant.expiresAt, nowTime),
    )
    .map((grant) => grant.permission);
  const orgPerms = org
    ? grants
        .filter(
          (grant) =>
            grant.organizationId === org &&
            isNotExpired(grant.expiresAt, nowTime),
        )
        .map((grant) => grant.permission)
    : [];

  // 3. Base-plan grants/modules for the active subscription in this context.
  const subscription = (user?.subscriptions ?? []).find((sub) => {
    const subOrg =
      sub.organizationId &&
      sub.organizationId !== "personal" &&
      sub.organizationId !== "null"
        ? sub.organizationId
        : null;
    return (
      subOrg === org &&
      sub.status === "ACTIVE" &&
      isNotExpired(sub.endDate, nowTime)
    );
  });
  const planContent = normalizeSubscriptionPlanContent(
    subscription?.plan?.content,
    subscription?.plan as { id?: string | null; name?: string | null } | null,
  );

  // 4. Active add-on entitlements: org-owned for an org workspace, plus the
  //    caller's own personal entitlements (mirrors the polymorphic model).
  const activeEntitlements = (entitlements ?? []).filter((entitlement) => {
    if (entitlement.status && entitlement.status !== "ACTIVE") return false;

    const start = toTime(entitlement.startDate);
    if (start !== null && start > nowTime) return false;

    const end = toTime(entitlement.endDate);
    if (end !== null && end <= nowTime) return false;

    const entitlementOrg = entitlement.organizationId ?? null;
    const entitlementUser = entitlement.userId ?? null;

    if (org) {
      return (
        entitlementOrg === org ||
        (entitlementOrg === null && entitlementUser === userId)
      );
    }
    return entitlementOrg === null && entitlementUser === userId;
  });

  const entGrants = activeEntitlements.flatMap(
    (entitlement) => entitlement.addOn?.grants ?? [],
  );

  const fieldPolicies: Record<string, unknown> = {};
  for (const entitlement of activeEntitlements) {
    mergeFieldPolicies(fieldPolicies, entitlement.addOn?.fieldPolicies);
  }

  // 5. Union + module registry (plan modules first, add-ons appended).
  const permissions = unique([
    ...rolePerms,
    ...globalPerms,
    ...orgPerms,
    ...planContent.grants,
    ...entGrants,
  ]);

  const modules: ResolvedEntitlementModule[] = [];
  const seenModules = new Set<string>();
  for (const key of planContent.modules) {
    if (seenModules.has(key)) continue;
    seenModules.add(key);
    modules.push({ key, source: "PLAN" });
  }
  for (const entitlement of activeEntitlements) {
    for (const key of entitlement.addOn?.modules ?? []) {
      if (seenModules.has(key)) continue;
      seenModules.add(key);
      modules.push({
        key,
        source: "ADDON",
        addOnId: entitlement.addOn?.id ?? undefined,
      });
    }
  }

  // 6. Materialized MANUAL grants (task 3.1). Only `source === "MANUAL"` and
  //    current grants (silent expiry) are considered; keys already granted by
  //    the plan/add-on are deduped (PLAN/ADDON win the source attribution).
  for (const grant of moduleGrants) {
    if (grant.source !== "MANUAL") continue;
    if (!vigente(grant, now)) continue;
    const key = grant.moduleKey;
    if (!key || seenModules.has(key)) continue;
    seenModules.add(key);
    modules.push({ key, source: "MANUAL" });
  }

  return { permissions, modules, fieldPolicies, organizationId: org };
}
