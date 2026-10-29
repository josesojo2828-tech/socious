import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { REQUIRE_ENTITLEMENT } from "../require-entitlement.decorator";
import { EntitlementService } from "../service/entitlement.service";
import type { ResolvedEntitlements } from "../service/entitlement-resolver";

interface RequestWithEntitlementUser {
  user?: {
    id?: string;
    entitlements?: ResolvedEntitlements;
  };
  headers?: Record<string, string | string[] | undefined>;
}

/**
 * Feature flag `ENTITLEMENTS_ENABLED`. Off by default so the guard is a no-op
 * and the deployment stays backward compatible until entitlements are rolled
 * out per-org and then globally.
 */
export function isEntitlementsEnabled(): boolean {
  const value = process.env.ENTITLEMENTS_ENABLED;
  return value === "true" || value === "1";
}

/**
 * Global entitlement guard (design D5). Composed AFTER `SessionAuthGuard`, which
 * already populated `request.user`. Routes without `@RequireEntitlement` pass
 * untouched; decorated routes require the key in the resolved union and deny
 * with code `ENTITLEMENT_REQUIRED` otherwise.
 */
@Injectable()
export class EntitlementGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly entitlements: EntitlementService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!isEntitlementsEnabled()) return true;

    const key = this.reflector.getAllAndOverride<string>(REQUIRE_ENTITLEMENT, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Undecorated routes MUST pass.
    if (!key) return true;

    const request = context
      .switchToHttp()
      .getRequest<RequestWithEntitlementUser>();

    const user = request.user;
    if (!user?.id) {
      throw new ForbiddenException({
        code: "ENTITLEMENT_REQUIRED",
        entitlement: key,
      });
    }

    const rawWorkspaceHeader = request.headers?.["x-workspace-id"];
    const rawWorkspace = Array.isArray(rawWorkspaceHeader)
      ? rawWorkspaceHeader[0]
      : rawWorkspaceHeader;
    const organizationId =
      rawWorkspace && rawWorkspace !== "personal" && rawWorkspace !== "null"
        ? rawWorkspace
        : null;

    const resolved =
      user.entitlements ??
      (await this.entitlements.resolve(user.id, organizationId));

    if (!resolved.permissions.includes(key)) {
      throw new ForbiddenException({
        code: "ENTITLEMENT_REQUIRED",
        entitlement: key,
      });
    }

    return true;
  }
}
