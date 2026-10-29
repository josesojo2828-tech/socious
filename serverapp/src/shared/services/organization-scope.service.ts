import { PrismaService } from "nestjs-prisma";

/**
 * Shared tenant-isolation rule for the `x-workspace-id` header (S6,
 * legal-compliance).
 *
 * The header is client input: it must NEVER let a caller read another
 * organization's data. This service implements the rule ONCE, for every
 * consumer of the header:
 *
 *  - A GLOBAL ROLE (`ADMIN` / `SUPERADMIN`) is platform-global: the header is
 *    honored as-is and no membership row is required.
 *  - ANY OTHER CALLER may request an organization ONLY when it holds an ACTIVE
 *    `OrganizationMember` row there. A foreign organization id is NEVER handed
 *    to a data query: it degrades to the caller's own ACTIVE membership
 *    organization, and to the personal context (`null`) when it has none.
 *
 * Per-surface policies (the membership check itself is always the same):
 *
 * | caller                     | global role | unauthorized org | no org requested |
 * | -------------------------- | ----------- | ---------------- | ---------------- |
 * | activity / dashboard (read)| honored     | own membership   | own membership   |
 * | entitlement (permissions)  | membership  | personal context | personal context |
 *
 * The entitlement service keeps its verified T13 behavior: the personal
 * context is its safe default (a permission surface never widens on an
 * unverified header), and no membership lookup is issued when no organization
 * was requested at all.
 */

/** Role names that are platform-global (they may request any organization). */
export const GLOBAL_ROLE_NAMES = ["ADMIN", "SUPERADMIN"] as const;

/** Fallback used when the requested organization is not authorized. */
export type OrganizationScopeFallback = "own-membership" | "personal";

/** Where the effective organization came from. */
export type OrganizationScopeSource =
  | "global-role"
  | "requested"
  | "own-membership"
  | "personal";

/** Minimal user shape the rule needs (id + global role). */
export interface OrganizationScopeUser {
  id: string;
  permits?: { name?: string | null } | null;
}

export interface OrganizationScopeRequest {
  /** The authenticated caller. */
  user: OrganizationScopeUser;
  /** The organization id requested by the client (header / workspace context). */
  requestedOrganizationId?: string | null;
  /** Fallback when the requested organization is NOT authorized. */
  unauthorizedFallback?: OrganizationScopeFallback;
  /** Fallback when no organization was requested at all. */
  missingFallback?: OrganizationScopeFallback;
  /** Whether a global role may request any organization (default: true). */
  globalRoleExempt?: boolean;
}

export interface OrganizationScopeResult {
  /** The effective organization id, or `null` for the personal context. */
  organizationId: string | null;
  /** Provenance of the effective organization. */
  source: OrganizationScopeSource;
  /** True when the caller holds a global role. */
  isGlobalRole: boolean;
}

/**
 * Normalizes the sentinels that mean "no organization": `null`, `""`,
 * `"personal"` and `"null"`.
 */
export function normalizeOrganizationId(
  organizationId: string | null | undefined,
): string | null {
  if (!organizationId) return null;
  if (organizationId === "personal" || organizationId === "null") return null;
  return organizationId;
}

/**
 * Tenant-isolation rule for the `x-workspace-id` header.
 *
 * NOTE: this class is instantiated by its consumers with the Prisma client
 * they already hold (the controllers' constructor arity is frozen by their
 * existing specs), so it is intentionally not registered as a Nest provider.
 */
export class OrganizationScopeService {
  constructor(private readonly prisma: PrismaService) {}

  /** True when the caller holds a platform-global role. */
  isGlobalRole(user: OrganizationScopeUser | null | undefined): boolean {
    const name = user?.permits?.name;
    return (
      name === GLOBAL_ROLE_NAMES[0] || name === GLOBAL_ROLE_NAMES[1]
    );
  }

  /** True when the caller holds an ACTIVE membership in that organization. */
  async hasActiveMembership(
    userId: string,
    organizationId: string,
  ): Promise<boolean> {
    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId, organizationId, status: "ACTIVE" },
      select: { id: true },
    });
    return Boolean(membership);
  }

  /** The caller's own ACTIVE membership organization (first match, if any). */
  async findOwnActiveOrganization(userId: string): Promise<string | null> {
    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId, status: "ACTIVE" },
      select: { organizationId: true },
    });
    return membership?.organizationId ?? null;
  }

  /**
   * THE rule. Resolves the effective organization for a request.
   *
   * A foreign organization id never survives this call: it is either
   * authorized by an ACTIVE membership or replaced by a safe fallback.
   */
  async resolveOrganizationScope(
    request: OrganizationScopeRequest,
  ): Promise<OrganizationScopeResult> {
    const user = request.user;
    const isGlobalRole = this.isGlobalRole(user);
    const requested = normalizeOrganizationId(
      request.requestedOrganizationId ?? null,
    );

    // 1. Global roles are platform-global: the header is honored as-is.
    if (isGlobalRole && request.globalRoleExempt !== false) {
      return {
        organizationId: requested,
        source: "global-role",
        isGlobalRole,
      };
    }

    // 2. No organization requested: fall back per policy.
    if (!requested) {
      if ((request.missingFallback ?? "own-membership") === "personal") {
        return { organizationId: null, source: "personal", isGlobalRole };
      }
      return this.ownMembershipScope(user.id, isGlobalRole);
    }

    // 3. Requested organization: honored only with an ACTIVE membership.
    if (await this.hasActiveMembership(user.id, requested)) {
      return {
        organizationId: requested,
        source: "requested",
        isGlobalRole,
      };
    }

    // 4. Not authorized: fall back per policy (never to the foreign org).
    if ((request.unauthorizedFallback ?? "own-membership") === "personal") {
      return { organizationId: null, source: "personal", isGlobalRole };
    }
    return this.ownMembershipScope(user.id, isGlobalRole);
  }

  /** Fallback scope: the caller's own ACTIVE membership, else personal. */
  private async ownMembershipScope(
    userId: string,
    isGlobalRole: boolean,
  ): Promise<OrganizationScopeResult> {
    const organizationId = await this.findOwnActiveOrganization(userId);
    return organizationId
      ? { organizationId, source: "own-membership", isGlobalRole }
      : { organizationId: null, source: "personal", isGlobalRole };
  }
}
