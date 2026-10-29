import { SetMetadata } from "@nestjs/common";

/** Metadata key read by the global `EntitlementGuard`. */
export const REQUIRE_ENTITLEMENT = "requireEntitlement";

/**
 * Declares that the decorated route requires the caller to hold the given
 * machine-key entitlement (e.g. `ATTENDANCE_CONTROL`) in the current workspace.
 * Routes without this decorator are never blocked by `EntitlementGuard`.
 */
export const RequireEntitlement = (key: string) =>
  SetMetadata(REQUIRE_ENTITLEMENT, key);
