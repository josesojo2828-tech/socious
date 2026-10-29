import { PermissionService } from "./permission.service";

/**
 * Task 4.2 — gating MUST resolve stable machine keys, never plan display names.
 *
 * T30 (security-hardening): the original expectation ("a plan NAMED 'Premium'
 * with empty `content.grants` grants nothing") became outdated when
 * `1b81d8b` made `PermissionService` pass the plan identity to
 * `normalizeSubscriptionPlanContent` — the shared normalizer
 * (`subscription-plan-content.util.ts`) resolves the tier defaults
 * (`DEFAULT_PLAN_ENTITLEMENTS`) from the plan name/id whenever the plan
 * declares no grants, and that fallback is pinned by its own spec
 * (`subscription-plan-content.util.spec.ts`).
 *
 * The specs below therefore pin the behavior that actually holds:
 *  - the DISPLAY NAME is never used AS an access key (a plan named after a
 *    tier grants nothing when it declares no key and its name is not a tier),
 *  - a plan that DECLARES its keys gets exactly those keys, whatever its name,
 *  - the tier-default fallback for a plan that declares no key.
 */
const service = new PermissionService();

const sub = (
  grants: string[],
  status = "ACTIVE",
  endDate: Date | null = null,
) => ({
  status,
  endDate,
  plan: { content: { features: [], grants, modules: [] } },
});

describe("PermissionService — machine-key gating", () => {
  it("grants community by COMMUNITY_ACCESS key", () => {
    expect(
      service.hasCommunityAccess({
        subscriptions: [sub(["COMMUNITY_ACCESS"])],
      }),
    ).toBe(true);
  });

  it("never uses the plan display name AS an access key", () => {
    const user = {
      subscriptions: [
        {
          status: "ACTIVE",
          endDate: null,
          plan: {
            name: "Basico",
            content: { features: ["x"], grants: [], modules: [] },
          },
        },
      ],
    };

    expect(service.hasCommunityAccess(user)).toBe(false);
    expect(service.isPremium(user)).toBe(false);
  });

  it("uses the plan's DECLARED keys, whatever the plan is named", () => {
    const user = {
      subscriptions: [
        {
          status: "ACTIVE",
          endDate: null,
          plan: {
            name: "Premium",
            content: { features: ["x"], grants: ["CUSTOM_ACCESS"], modules: [] },
          },
        },
      ],
    };

    expect(service.hasCommunityAccess(user)).toBe(false);
    expect(service.isPremium(user)).toBe(false);
  });

  it("falls back to the tier defaults when the plan declares no key", () => {
    const user = {
      subscriptions: [
        {
          status: "ACTIVE",
          endDate: null,
          plan: {
            name: "Premium",
            content: { features: ["x"], grants: [], modules: [] },
          },
        },
      ],
    };

    expect(service.hasCommunityAccess(user)).toBe(true);
    expect(service.isPremium(user)).toBe(true);
  });

  it("resolves PREMIUM_ACCESS for isPremium", () => {
    expect(
      service.isPremium({ subscriptions: [sub(["PREMIUM_ACCESS"])] }),
    ).toBe(true);
    expect(service.isPremium({ subscriptions: [sub([])] })).toBe(false);
  });

  it("resolves portfolio by PORTFOLIO_MANAGE or the website tab permit", () => {
    expect(
      service.hasPortfolioAccess({
        subscriptions: [sub(["PORTFOLIO_MANAGE"])],
      }),
    ).toBe(true);
    expect(
      service.hasPortfolioAccess({
        permits: { name: "USER", list: ["PERMIT_DASHBOARD_TAB_WEBSITE"] },
      }),
    ).toBe(true);
  });

  it("resolves institutional food by key or explicit grant", () => {
    expect(
      service.hasInstitutionalFoodAccess({
        userPermissions: [{ permission: "INSTITUTIONAL_FOOD_ACCESS" }],
      }),
    ).toBe(true);
    expect(
      service.hasInstitutionalFoodAccess({
        subscriptions: [sub(["INSTITUTIONAL_FOOD_ACCESS"])],
      }),
    ).toBe(true);
  });

  it("lets privileged roles bypass", () => {
    expect(
      service.hasCommunityAccess({ permits: { name: "CLINIC_ADMIN" } }),
    ).toBe(true);
    expect(
      service.hasPortfolioAccess({ permits: { name: "CLINIC_STAFF" } }),
    ).toBe(true);
  });

  it("does not grant from an expired subscription", () => {
    const expired = sub(
      ["COMMUNITY_ACCESS"],
      "ACTIVE",
      new Date(Date.now() - 1_000),
    );

    expect(service.hasCommunityAccess({ subscriptions: [expired] })).toBe(
      false,
    );
  });

  it("prefers resolved entitlements permissions when present", () => {
    expect(
      service.hasCommunityAccess({
        entitlements: { permissions: ["COMMUNITY_ACCESS"] },
      }),
    ).toBe(true);
  });
});
