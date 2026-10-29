import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import type { RequestWithUser } from "src/shared/types/server.type";
import { isEntitlementsEnabled } from "../guards/entitlement.guard";
import {
  FIELD_POLICY_METADATA,
  FieldPolicyMetadata,
} from "./field-policy.decorator";
import { omitFieldsDeep } from "./field-policy.filter";
import { FieldPolicyService } from "./field-policy.service";

function readOrganizationId(
  request: RequestWithUser,
  metadata: FieldPolicyMetadata,
): string | null {
  if (metadata.organizationParam) {
    const params = request.params as Record<string, string> | undefined;
    const fromParam = params?.[metadata.organizationParam];
    if (fromParam) return fromParam;
  }

  const header = request.headers?.["x-workspace-id"];
  const fromHeader = Array.isArray(header) ? header[0] : header;
  return fromHeader ?? null;
}

/**
 * Global, server-driven field-policy filter (design D8).
 *
 * Registered as an `APP_INTERCEPTOR` right beside the other global
 * interceptors. It is a no-op unless the route is decorated with
 * `@FieldPolicy(...)` AND the entitlements feature flag is on. It resolves the
 * caller's organization role for the target module/form and OMITS the fields
 * that role must not see — everything else is passed through untouched
 * (default = all visible).
 *
 * The mechanism is generic: any module (e.g. the future Attendance pilot) can
 * attach it by decorating its endpoints, without touching this interceptor.
 */
@Injectable()
export class FieldPolicyInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly fieldPolicies: FieldPolicyService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    if (!isEntitlementsEnabled()) return next.handle();

    const metadata = this.reflector.getAllAndOverride<FieldPolicyMetadata>(
      FIELD_POLICY_METADATA,
      [context.getHandler(), context.getClass()],
    );
    if (!metadata) return next.handle();

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    if (!request.user?.id) return next.handle();

    const organizationId = readOrganizationId(request, metadata);
    const role = await this.fieldPolicies.resolveRole(
      request.user,
      organizationId,
    );
    // No role → no policy applies → default: all fields visible.
    if (!role) return next.handle();

    const hiddenFields = await this.fieldPolicies.getHiddenFields(
      metadata.moduleKey,
      role,
      metadata.formKey,
    );
    if (hiddenFields.length === 0) return next.handle();

    const fields = new Set(hiddenFields);
    return next
      .handle()
      .pipe(map((payload) => omitFieldsDeep(payload, fields)));
  }
}
