/**
 * Trial rule for the first explicit plan pick: choosing a plan for the first
 * time in a workspace must not demand a wallet report. Mirrors create() in
 * subscription.service.ts — free when the workspace has no subscription, or
 * only the org bootstrap (endDate null, never plan-changed).
 */

interface SubRow {
  endDate: Date | null;
  lastPlanChangeAt?: Date | null;
}

function isFirstPlanPick(
  existingCount: number,
  found: SubRow | null,
): boolean {
  const isBootstrapOnly =
    existingCount === 1 &&
    !!found &&
    found.endDate === null &&
    !found.lastPlanChangeAt;
  return existingCount === 0 || isBootstrapOnly;
}

describe("isFirstPlanPick — trial del primer plan", () => {
  it("is free when the workspace has no subscription", () => {
    expect(isFirstPlanPick(0, null)).toBe(true);
  });

  it("is free over the org bootstrap BASICO (endDate null, never changed)", () => {
    expect(
      isFirstPlanPick(1, { endDate: null, lastPlanChangeAt: null }),
    ).toBe(true);
  });

  it("charges when the sub already has an end date (real paid pick)", () => {
    expect(
      isFirstPlanPick(1, {
        endDate: new Date("2026-12-01"),
        lastPlanChangeAt: new Date("2026-11-01"),
      }),
    ).toBe(false);
  });

  it("charges when the plan was already changed once", () => {
    expect(
      isFirstPlanPick(1, {
        endDate: null,
        lastPlanChangeAt: new Date("2026-11-01"),
      }),
    ).toBe(false);
  });

  it("charges when count > 1 even without lastPlanChangeAt", () => {
    expect(isFirstPlanPick(2, { endDate: null, lastPlanChangeAt: null })).toBe(
      false,
    );
  });
});
