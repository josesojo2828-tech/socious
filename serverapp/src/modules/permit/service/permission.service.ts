import { Injectable } from "@nestjs/common";
import { normalizeSubscriptionPlanContent } from "src/modules/subscription/util/subscription-plan-content.util";

/**
 * Stable machine keys used for gating. Gating MUST NEVER match plan display
 * names — the keys mirror the base-plan grants seeded by
 * `module-entitlements.seed.ts` and the add-on `grants`.
 */
export const ACCESS_KEYS = {
  PREMIUM: "PREMIUM_ACCESS",
  COMMUNITY: "COMMUNITY_ACCESS",
  PORTFOLIO: "PORTFOLIO_MANAGE",
  PORTFOLIO_TAB: "PERMIT_DASHBOARD_TAB_WEBSITE",
  INSTITUTIONAL_FOOD: "INSTITUTIONAL_FOOD_ACCESS",
} as const;

interface AccessUser {
  permits?: { name?: string | null; list?: string[] | null } | null;
  userPermissions?: Array<{
    permission: string;
    organizationId?: string | null;
    expiresAt?: Date | string | null;
  }> | null;
  entitlements?: { permissions?: string[] | null } | null;
  subscriptions?: Array<{
    status?: string | null;
    endDate?: Date | string | null;
    plan?: { id?: string | null; name?: string | null; content?: unknown } | null;
  }> | null;
}

@Injectable()
export class PermissionService {
  hasPermission(user: AccessUser, permission: string): boolean {
    if (user?.permits?.list?.includes(permission)) return true;
    if (user?.entitlements?.permissions?.includes(permission)) return true;
    return (
      user?.userPermissions?.some(
        (p) =>
          p.permission === permission &&
          (!p.expiresAt || new Date(p.expiresAt) > new Date()),
      ) ?? false
    );
  }

  isPremium(user: AccessUser): boolean {
    return this.hasKey(user, ACCESS_KEYS.PREMIUM);
  }

  hasCommunityAccess(user: AccessUser): boolean {
    return this.isPrivileged(user) || this.hasKey(user, ACCESS_KEYS.COMMUNITY);
  }

  hasPortfolioAccess(user: AccessUser): boolean {
    return (
      this.isPrivileged(user) ||
      this.hasKey(user, ACCESS_KEYS.PORTFOLIO) ||
      this.hasKey(user, ACCESS_KEYS.PORTFOLIO_TAB)
    );
  }

  hasInstitutionalFoodAccess(user: AccessUser): boolean {
    return (
      this.isPrivileged(user) ||
      this.hasKey(user, ACCESS_KEYS.INSTITUTIONAL_FOOD)
    );
  }

  private isPrivileged(user?: AccessUser | null): boolean {
    const name = user?.permits?.name;
    return (
      name === "SUPERADMIN" ||
      name === "ADMIN" ||
      name === "CLINIC_ADMIN" ||
      name === "CLINIC_STAFF"
    );
  }

  /**
   * True when the caller holds the machine key through ANY channel: role
   * permits, resolved entitlements (plan grants + add-on grants), explicit
   * org/global grants, or the plan's `content.grants`.
   */
  private hasKey(user: AccessUser | null | undefined, key: string): boolean {
    if (!user) return false;
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
    return this.planGrants(user).includes(key);
  }

  /**
   * Machine keys granted by the active subscription plans. Reads the normalized
   * `content.grants` — NEVER the plan name.
   */
  private planGrants(user: AccessUser | null | undefined): string[] {
    const now = Date.now();
    return (user?.subscriptions ?? [])
      .filter(
        (sub) =>
          sub.status === "ACTIVE" &&
          (!sub.endDate || new Date(sub.endDate).getTime() > now),
      )
      .flatMap(
        (sub) => normalizeSubscriptionPlanContent(sub.plan?.content, sub.plan).grants,
      );
  }
}
