/**
 * Plan capacity (S9): `{ maxBranches, includedSeats }` read out of a
 * `SubscriptionPlan.content` payload.
 *
 * One source of truth for a pricing rule — `OrganizationService` uses it when
 * an organization is created, `BranchService` when the owner tries to extend
 * it. An unreadable block returns `null` and callers fall back to their own
 * conservative default.
 */
export interface PlanCapacity {
  maxBranches: number;
  includedSeats: number;
}

export function readPlanCapacity(content: unknown): PlanCapacity | null {
  const capacity = (content as { capacity?: Record<string, unknown> } | null)
    ?.capacity;
  if (!capacity || typeof capacity !== "object") return null;

  const maxBranches = Number(capacity.maxBranches);
  const includedSeats = Number(capacity.includedSeats);
  if (!Number.isFinite(maxBranches) || !Number.isFinite(includedSeats)) {
    return null;
  }

  return { maxBranches, includedSeats };
}
