import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { PrismaService } from "nestjs-prisma";
import { UserService } from "src/modules/user/services/user.service";
import { isModuleFrameworkEnabled } from "src/modules/module-framework/util/module-framework.flag";
import { EntitlementCacheService } from "../cache/entitlement-cache";
import { OrganizationScopeService } from "src/shared/services/organization-scope.service";
import {
  resolveEntitlements,
  type ResolvableEntitlement,
  type ResolvableModuleGrant,
  type ResolvableUser,
  type ResolvedEntitlements,
} from "./entitlement-resolver";

/** Shape of the `moduleGrant.findMany` rows consumed by the resolver mapping. */
interface ModuleGrantRow {
  module: { key: string };
  source: string;
  status: string;
  expiresAt: Date | null;
}

export const ENTITLEMENT_CACHE_TTL_SECONDS = 60;

export function entitlementCacheKey(
  userId: string,
  organizationId: string | null,
): string {
  return `ent:${userId}:${organizationId ?? "personal"}`;
}

/**
 * I/O shell around the pure `resolveEntitlements` union (design D5/D6).
 *
 * Loads the user (already includes permits, org/global grants and the
 * subscriptions+plan needed for plan grants) and the active add-on
 * entitlements, delegates the union to the pure resolver, and caches the result
 * for 60s. Mutations call `invalidate` so grants/revocations apply immediately.
 */
@Injectable()
export class EntitlementService {
  /**
   * Shared tenant-isolation rule for the `x-workspace-id` header (S6).
   * Instantiated with the Prisma client this service already holds.
   */
  private readonly organizationScope: OrganizationScopeService;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => UserService))
    private readonly users: UserService,
    private readonly cache: EntitlementCacheService,
  ) {
    this.organizationScope = new OrganizationScopeService(this.prisma);
  }

  /**
   * Resolve the effective entitlements for a user in a workspace context.
   *
   * @param preloadedUser Optional already-loaded user (e.g. from
   *   `SessionAuthGuard`). When provided it is reused instead of issuing a
   *   second `users.findOne`, so attaching entitlements to the request is cheap.
   */
  async resolve(
    userId: string,
    organizationId: string | null,
    preloadedUser?: ResolvableUser | null,
  ): Promise<ResolvedEntitlements> {
    // S6 (legal-compliance): el header x-workspace-id solo tiene efecto si
    // el usuario es miembro ACTIVO de esa organización. Un header ajeno
    // degrada al contexto personal — nunca resuelve entitlements ajenos.
    // Regla compartida (S6) con activity y dashboard: `organization-scope.service`.
    const { organizationId: effectiveOrg } =
      await this.organizationScope.resolveOrganizationScope({
        user: { id: userId },
        requestedOrganizationId: organizationId,
        unauthorizedFallback: "personal",
        missingFallback: "personal",
        globalRoleExempt: false,
      });

    const key = entitlementCacheKey(userId, effectiveOrg);

    const cached = await this.cache.get<ResolvedEntitlements>(key);
    if (cached) return cached;

    const now = new Date();
    const scope = effectiveOrg
      ? {
          OR: [
            { organizationId: effectiveOrg },
            { organizationId: null, userId },
          ],
        }
      : { organizationId: null, userId };

    // Task 5.1 — the framework flag gates MANUAL grant inclusion. When off the
    // resolver receives no grants (PLAN/ADDON modules keep resolving normally).
    const moduleGrantsPromise: Promise<ModuleGrantRow[]> =
      isModuleFrameworkEnabled()
        ? this.prisma.moduleGrant.findMany({
            where: { AND: [scope, { status: "ACTIVE", source: "MANUAL" }] },
            include: { module: { select: { key: true } } },
          })
        : Promise.resolve([]);

    const [user, entitlements, moduleGrants] = await Promise.all([
      preloadedUser !== undefined
        ? Promise.resolve(preloadedUser)
        : this.users.findOne({ id: userId }),
      this.prisma.entitlement.findMany({
        where: {
          AND: [
            scope,
            {
              status: "ACTIVE",
              deletedAt: null,
              startDate: { lte: now },
              OR: [{ endDate: null }, { endDate: { gt: now } }],
            },
          ],
        },
        include: { addOn: true },
      }),
      // Materialized MANUAL grants relevant to this workspace (design D5).
      // Owner scoping mirrors the entitlement query; expiry is applied by the
      // pure resolver so expired grants disappear silently.
      moduleGrantsPromise,
    ]);

    let userToResolve = user as ResolvableUser | null;

    if (userToResolve) {
      const hasActiveSub = userToResolve.subscriptions?.some((sub) => {
        const subOrg =
          sub.organizationId &&
          sub.organizationId !== "personal" &&
          sub.organizationId !== "null"
            ? sub.organizationId
            : null;
        return subOrg === effectiveOrg && sub.status === "ACTIVE";
      });

      if (!hasActiveSub) {
        const activeSub = await this.prisma.subscription.findFirst({
          where: {
            userId,
            organizationId: effectiveOrg,
            status: "ACTIVE",
          },
          include: { plan: true },
        });

        if (activeSub) {
          userToResolve = {
            ...userToResolve,
            subscriptions: [
              ...(userToResolve.subscriptions ?? []),
              activeSub,
            ],
          };
        }
      }
    }

    const resolvableGrants: ResolvableModuleGrant[] = moduleGrants.map(
      (grant) => ({
        moduleKey: grant.module.key,
        source: grant.source,
        status: grant.status,
        expiresAt: grant.expiresAt,
      }),
    );

    const resolved = resolveEntitlements(
      userToResolve,
      entitlements as unknown as ResolvableEntitlement[],
      effectiveOrg,
      now,
      resolvableGrants,
    );

    await this.cache.set(key, resolved, ENTITLEMENT_CACHE_TTL_SECONDS);
    return resolved;
  }

  /** True when the caller holds the given permission key in this context. */
  async hasEntitlement(
    userId: string,
    organizationId: string | null,
    key: string,
  ): Promise<boolean> {
    const resolved = await this.resolve(userId, organizationId);
    return resolved.permissions.includes(key);
  }

  /**
   * Drop cached resolutions for a user after a permission / add-on /
   * entitlement mutation. Pass `organizationId` to scope the invalidation.
   */
  async invalidate(
    userId: string,
    organizationId?: string | null,
  ): Promise<void> {
    await this.cache.invalidate(userId, organizationId);
  }

  /**
   * Drop cached resolutions for every member of an organization after an
   * org-scoped entitlement mutation.
   */
  async invalidateOrganization(organizationId: string): Promise<void> {
    await this.cache.invalidateOrganization(organizationId);
  }

  @OnEvent('subscription.activated')
  @OnEvent('subscription.updated')
  @OnEvent('subscription.canceled')
  @OnEvent('subscription.expired')
  async handleSubscriptionEvent(payload: { userId: string; organizationId?: string | null }) {
    if (payload?.userId) {
      await this.invalidate(payload.userId, payload.organizationId ?? null);
    }
  }
}
