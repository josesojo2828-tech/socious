import { SetMetadata } from "@nestjs/common";

/** Metadata key read by the global `FieldPolicyInterceptor`. */
export const FIELD_POLICY_METADATA = "fieldPolicy";

export interface FieldPolicyOptions {
  /** Optional form scope (mirrors `FieldPolicy.formKey`). */
  formKey?: string;
  /**
   * Route param carrying the organization id. When present it takes precedence
   * over the `X-Workspace-Id` header (useful for `:id`-scoped routes).
   */
  organizationParam?: string;
}

export interface FieldPolicyMetadata extends FieldPolicyOptions {
  moduleKey: string;
}

/**
 * Declares that the decorated route's response payload is subject to the
 * server-driven, role-based field policies registered for `moduleKey`.
 *
 * DEFAULT = ALL FIELDS VISIBLE: a field is omitted only when a `FieldPolicy`
 * row marks it `HIDDEN` for the caller's organization role. Routes without this
 * decorator are never filtered.
 *
 * Usage:
 *   @FieldPolicy("ATTENDANCE_CONTROL")                       // module-wide
 *   @FieldPolicy("ATTENDANCE_CONTROL", "attendance.agenda")  // form-scoped
 *   @FieldPolicy("ATTENDANCE_CONTROL", { formKey: "attendance.agenda", organizationParam: "id" })
 */
export const FieldPolicy = (
  moduleKey: string,
  options?: string | FieldPolicyOptions,
): MethodDecorator & ClassDecorator => {
  const metadata: FieldPolicyMetadata =
    typeof options === "string"
      ? { moduleKey, formKey: options }
      : { moduleKey, ...(options ?? {}) };

  return SetMetadata(FIELD_POLICY_METADATA, metadata);
};
