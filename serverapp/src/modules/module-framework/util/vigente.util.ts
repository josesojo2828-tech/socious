/**
 * Pure "current grant" predicate (design D6 / spec: Silent Expiry).
 *
 * Extracted to a standalone dependency-free module so it can be reused by the
 * `entitlement-resolver` without creating a circular import
 * (`entitlement-resolver` -> `module-grant.service` -> `entitlement.service`
 * -> `entitlement-resolver`). `ModuleGrantService` re-exports it to preserve
 * the public API.
 *
 * A grant is current ONLY IF `status === ACTIVE` AND it has no expiry or the
 * expiry is in the future. Expired grants are silently hidden (no error, no
 * notification).
 */
export interface ResolvableGrantExpiry {
  status?: string | null;
  expiresAt?: Date | string | null;
}

export function vigente(
  grant: ResolvableGrantExpiry,
  now: Date = new Date(),
): boolean {
  if (grant.status !== "ACTIVE") return false;
  if (grant.expiresAt === null || grant.expiresAt === undefined) return true;
  const time = new Date(grant.expiresAt).getTime();
  return !Number.isNaN(time) && time > now.getTime();
}
