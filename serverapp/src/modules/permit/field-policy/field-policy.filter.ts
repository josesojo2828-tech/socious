import type { OrganizationRole } from "@prisma/client";

/** Minimal membership shape needed to resolve a caller's organization role. */
export interface ResolvableMembership {
  organizationId?: string | null;
  role?: string | null;
  status?: string | null;
}

/**
 * Pure role resolution: the caller's ACTIVE membership role in the given
 * organization, or `null` when there is no workspace or no active membership.
 * `null` means "no role policy applies" → every field stays visible.
 */
export function resolveOrganizationRole(
  memberships: ResolvableMembership[] | null | undefined,
  organizationId: string | null | undefined,
): OrganizationRole | null {
  if (!organizationId || !memberships?.length) return null;

  const membership = memberships.find(
    (item) =>
      item.organizationId === organizationId && item.status === "ACTIVE",
  );

  return (membership?.role as OrganizationRole | undefined) ?? null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function omitValue(value: unknown, fields: ReadonlySet<string>): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => omitValue(item, fields));
  }

  if (!isPlainObject(value)) return value;

  const result: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (fields.has(key)) continue;
    result[key] = omitValue(child, fields);
  }
  return result;
}

/**
 * Deep-clone `payload` omitting every property whose key is in `fields` at any
 * depth (objects and arrays). Non-plain objects — `Date`, `Prisma.Decimal`,
 * `Buffer`, class instances — are preserved by reference. The input is never
 * mutated. With no fields the payload is returned untouched, which is the
 * default "all fields visible" behavior.
 */
export function omitFieldsDeep<T>(payload: T, fields: ReadonlySet<string>): T {
  if (fields.size === 0) return payload;
  return omitValue(payload, fields) as T;
}
