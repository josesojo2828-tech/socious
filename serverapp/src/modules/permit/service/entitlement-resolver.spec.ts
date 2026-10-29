import {
  resolveEntitlements,
  type ResolvableEntitlement,
  type ResolvableModuleGrant,
  type ResolvableUser,
} from "./entitlement-resolver";

const NOW = new Date("2026-06-15T12:00:00.000Z");
const past = new Date("2026-01-01T00:00:00.000Z");
const future = new Date("2027-01-01T00:00:00.000Z");

function makeUser(overrides: Partial<ResolvableUser> = {}): ResolvableUser {
  return {
    id: "user-1",
    permits: { list: ["ROLE_BASELINE"] },
    userPermissions: [
      { permission: "GLOBAL_GRANT", organizationId: null },
      { permission: "ORG_A_GRANT", organizationId: "org-a" },
      { permission: "ORG_B_GRANT", organizationId: "org-b" },
      { permission: "EXPIRED_GRANT", organizationId: null, expiresAt: past },
    ],
    subscriptions: [
      {
        organizationId: "org-a",
        status: "ACTIVE",
        endDate: future,
        plan: {
          content: {
            features: [],
            grants: ["PLAN_GRANT_A"],
            modules: ["PLAN_MODULE_A"],
          },
        },
      },
      {
        organizationId: null,
        status: "ACTIVE",
        endDate: future,
        plan: {
          content: {
            features: [],
            grants: ["PERSONAL_PLAN_GRANT"],
            modules: ["PERSONAL_PLAN_MODULE"],
          },
        },
      },
    ],
    ...overrides,
  };
}

function makeEntitlements(): ResolvableEntitlement[] {
  return [
    {
      organizationId: "org-a",
      userId: null,
      status: "ACTIVE",
      startDate: past,
      endDate: future,
      addOn: {
        id: "addon-att",
        key: "ATTENDANCE_CONTROL",
        grants: ["ATTENDANCE_CONTROL"],
        modules: ["ATTENDANCE_CONTROL"],
      },
    },
    {
      organizationId: null,
      userId: "user-1",
      status: "ACTIVE",
      startDate: past,
      endDate: future,
      addOn: {
        id: "addon-personal",
        key: "PERSONAL_ADDON",
        grants: ["PERSONAL_ADDON"],
        modules: ["PERSONAL_MODULE"],
      },
    },
    {
      organizationId: "org-a",
      userId: null,
      status: "ACTIVE",
      startDate: past,
      endDate: past,
      addOn: { id: "addon-expired", grants: ["EXPIRED_ADDON"], modules: [] },
    },
    {
      organizationId: "org-a",
      userId: null,
      status: "ACTIVE",
      startDate: future,
      endDate: future,
      addOn: { id: "addon-future", grants: ["FUTURE_ADDON"], modules: [] },
    },
    {
      organizationId: "org-a",
      userId: null,
      status: "SUSPENDED",
      startDate: past,
      endDate: future,
      addOn: {
        id: "addon-suspended",
        grants: ["SUSPENDED_ADDON"],
        modules: [],
      },
    },
  ];
}

describe("resolveEntitlements — union correctness", () => {
  it("unions role + global + org + plan + add-on grants in org context", () => {
    const result = resolveEntitlements(
      makeUser(),
      makeEntitlements(),
      "org-a",
      NOW,
    );

    expect(result.permissions).toEqual(
      expect.arrayContaining([
        "ROLE_BASELINE",
        "GLOBAL_GRANT",
        "ORG_A_GRANT",
        "PLAN_GRANT_A",
        "ATTENDANCE_CONTROL",
      ]),
    );
    expect(result.organizationId).toBe("org-a");
  });

  it("de-duplicates permissions across every source", () => {
    const user = makeUser({
      permits: { list: ["ATTENDANCE_CONTROL"] },
      userPermissions: [
        { permission: "ATTENDANCE_CONTROL", organizationId: null },
      ],
    });

    const result = resolveEntitlements(user, makeEntitlements(), "org-a", NOW);
    const occurrences = result.permissions.filter(
      (p) => p === "ATTENDANCE_CONTROL",
    );
    expect(occurrences).toHaveLength(1);
  });

  it("registers plan modules first then add-on modules with their source", () => {
    const result = resolveEntitlements(
      makeUser(),
      makeEntitlements(),
      "org-a",
      NOW,
    );

    // Design union: the caller's own personal entitlements also apply inside an
    // org workspace, so PERSONAL_MODULE follows the org add-on module.
    expect(result.modules).toEqual([
      { key: "PLAN_MODULE_A", source: "PLAN" },
      { key: "ATTENDANCE_CONTROL", source: "ADDON", addOnId: "addon-att" },
      { key: "PERSONAL_MODULE", source: "ADDON", addOnId: "addon-personal" },
    ]);
  });
});

describe("resolveEntitlements — expiry", () => {
  it("ignores expired, future and suspended entitlements", () => {
    const result = resolveEntitlements(
      makeUser(),
      makeEntitlements(),
      "org-a",
      NOW,
    );

    expect(result.permissions).not.toContain("EXPIRED_ADDON");
    expect(result.permissions).not.toContain("FUTURE_ADDON");
    expect(result.permissions).not.toContain("SUSPENDED_ADDON");
    expect(result.modules.map((m) => m.key)).not.toContain(
      "ATTENDANCE_CONTROL_FUTURE",
    );
  });

  it("ignores expired explicit grants", () => {
    const result = resolveEntitlements(
      makeUser(),
      makeEntitlements(),
      "org-a",
      NOW,
    );
    expect(result.permissions).not.toContain("EXPIRED_GRANT");
  });

  it("ignores the plan grants of an expired subscription", () => {
    const user = makeUser({
      subscriptions: [
        {
          organizationId: "org-a",
          status: "ACTIVE",
          endDate: past,
          plan: { content: { grants: ["STALE_PLAN_GRANT"], modules: [] } },
        },
      ],
    });

    const result = resolveEntitlements(user, [], "org-a", NOW);
    expect(result.permissions).not.toContain("STALE_PLAN_GRANT");
  });
});

describe("resolveEntitlements — org isolation", () => {
  it("does not leak another workspace's grants", () => {
    const result = resolveEntitlements(
      makeUser(),
      makeEntitlements(),
      "org-a",
      NOW,
    );
    expect(result.permissions).not.toContain("ORG_B_GRANT");
  });

  it("resolves org-b grants only in org-b context", () => {
    const orgB = resolveEntitlements(makeUser(), [], "org-b", NOW);
    expect(orgB.permissions).toContain("ORG_B_GRANT");
    expect(orgB.permissions).not.toContain("ORG_A_GRANT");
    expect(orgB.permissions).not.toContain("PLAN_GRANT_A");
  });

  it("personal context excludes org-scoped grants and org plan grants", () => {
    const result = resolveEntitlements(
      makeUser(),
      makeEntitlements(),
      null,
      NOW,
    );

    expect(result.organizationId).toBeNull();
    expect(result.permissions).toContain("GLOBAL_GRANT");
    expect(result.permissions).toContain("PERSONAL_PLAN_GRANT");
    expect(result.permissions).toContain("PERSONAL_ADDON");
    expect(result.permissions).not.toContain("ORG_A_GRANT");
    expect(result.permissions).not.toContain("PLAN_GRANT_A");
    expect(result.permissions).not.toContain("ATTENDANCE_CONTROL");
  });

  it("normalizes 'personal' and 'null' string organizationId to null and finds personal subscription", () => {
    const resPersonal = resolveEntitlements(
      makeUser(),
      makeEntitlements(),
      "personal",
      NOW,
    );
    expect(resPersonal.organizationId).toBeNull();
    expect(resPersonal.permissions).toContain("PERSONAL_PLAN_GRANT");

    const resNullStr = resolveEntitlements(
      makeUser(),
      makeEntitlements(),
      "null",
      NOW,
    );
    expect(resNullStr.organizationId).toBeNull();
    expect(resNullStr.permissions).toContain("PERSONAL_PLAN_GRANT");
  });

  it("does not let another user inherit a personal entitlement", () => {
    const otherUser = makeUser({ id: "user-2" });
    const result = resolveEntitlements(
      otherUser,
      makeEntitlements(),
      "org-a",
      NOW,
    );

    expect(result.permissions).not.toContain("PERSONAL_ADDON");
  });
});

describe("resolveEntitlements — safety", () => {
  it("returns an empty resolution for a missing user without throwing", () => {
    const result = resolveEntitlements(null, null, "org-a", NOW);
    expect(result).toEqual({
      permissions: [],
      modules: [],
      fieldPolicies: {},
      organizationId: "org-a",
    });
  });
});

/**
 * Task 5.2 — materialized MANUAL grants in the module union (task 3.1).
 *
 * Only `source === "MANUAL"` grants are considered; they are unioned AFTER the
 * plan/add-on modules and deduped by key (PLAN/ADDON win the source
 * attribution). Expired grants are silently hidden.
 */
describe("resolveEntitlements — MANUAL module grants", () => {
  const grant = (
    moduleKey: string,
    overrides: Partial<ResolvableModuleGrant> = {},
  ): ResolvableModuleGrant => ({
    moduleKey,
    source: "MANUAL",
    status: "ACTIVE",
    expiresAt: null,
    ...overrides,
  });

  it("includes a current MANUAL grant with source MANUAL", () => {
    const result = resolveEntitlements(makeUser(), [], "org-a", NOW, [
      grant("ATTENDANCE_CONTROL"),
    ]);

    expect(result.modules).toContainEqual({
      key: "ATTENDANCE_CONTROL",
      source: "MANUAL",
    });
  });

  it("silently hides an expired MANUAL grant (no error)", () => {
    const result = resolveEntitlements(makeUser(), [], "org-a", NOW, [
      grant("ATTENDANCE_CONTROL", { expiresAt: past }),
    ]);

    expect(result.modules.map((m) => m.key)).not.toContain(
      "ATTENDANCE_CONTROL",
    );
  });

  it("silently hides a REVOKED MANUAL grant", () => {
    const result = resolveEntitlements(makeUser(), [], "org-a", NOW, [
      grant("ATTENDANCE_CONTROL", { status: "REVOKED" }),
    ]);

    expect(result.modules.map((m) => m.key)).not.toContain(
      "ATTENDANCE_CONTROL",
    );
  });

  it("ignores non-MANUAL sources (PLAN/ADDON are derived elsewhere)", () => {
    const result = resolveEntitlements(makeUser(), [], "org-a", NOW, [
      grant("FROM_PLAN", { source: "PLAN" }),
      grant("FROM_ADDON", { source: "ADDON" }),
    ]);

    const keys = result.modules.map((m) => m.key);
    expect(keys).not.toContain("FROM_PLAN");
    expect(keys).not.toContain("FROM_ADDON");
    expect(result.modules.every((m) => m.source !== "MANUAL")).toBe(true);
  });

  it("dedupes by key: PLAN/ADDON win over a MANUAL grant", () => {
    const result = resolveEntitlements(
      makeUser(),
      makeEntitlements(),
      "org-a",
      NOW,
      [
        grant("ATTENDANCE_CONTROL"),
        grant("PLAN_MODULE_A"),
        grant("PERSONAL_MODULE"),
      ],
    );

    const attendance = result.modules.filter(
      (m) => m.key === "ATTENDANCE_CONTROL",
    );
    expect(attendance).toEqual([
      { key: "ATTENDANCE_CONTROL", source: "ADDON", addOnId: "addon-att" },
    ]);

    const plan = result.modules.filter((m) => m.key === "PLAN_MODULE_A");
    expect(plan).toEqual([{ key: "PLAN_MODULE_A", source: "PLAN" }]);

    const personal = result.modules.filter((m) => m.key === "PERSONAL_MODULE");
    expect(personal).toEqual([
      { key: "PERSONAL_MODULE", source: "ADDON", addOnId: "addon-personal" },
    ]);
  });

  it("dedupes repeated MANUAL grants for the same key", () => {
    const result = resolveEntitlements(makeUser(), [], "org-a", NOW, [
      grant("ATTENDANCE_CONTROL"),
      grant("ATTENDANCE_CONTROL"),
    ]);

    expect(
      result.modules.filter((m) => m.key === "ATTENDANCE_CONTROL"),
    ).toHaveLength(1);
  });

  it("defaults to no grants when the argument is omitted (backward compatible)", () => {
    const result = resolveEntitlements(makeUser(), [], "org-a", NOW);
    expect(result.modules.every((m) => m.source !== "MANUAL")).toBe(true);
  });
});
