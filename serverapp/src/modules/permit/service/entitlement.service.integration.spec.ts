import { EntitlementService } from "./entitlement.service";
import type { EntitlementCacheService } from "../cache/entitlement-cache";

/**
 * Task 5.3 + T27 (security-hardening) — `EntitlementService` I/O shell
 * integration over a MOCKED Prisma.
 *
 * Proves the flag gate and the silent-expiry behaviour end to end through the
 * real shell + real pure resolver: a current MANUAL grant appears with source
 * MANUAL, an expired one is hidden without throwing, and the flag off skips the
 * `moduleGrant` query entirely.
 *
 * T27: the mocked Prisma used to omit `subscription` and `organizationMember`,
 * so the shell crashed with `Cannot read properties of undefined (reading
 * 'findFirst')` and the spec could NOT exercise the membership check added in
 * `3595c93` (`OrganizationScopeService`). The mock below is now a small
 * in-memory database (memberships, subscriptions, entitlements) and the spec
 * asserts the membership rule itself: a caller WITHOUT an ACTIVE
 * `OrganizationMember` row in the requested organization degrades to the
 * personal context, and one WITH it resolves that organization.
 */

type MembershipRow = {
  id: string;
  userId: string;
  organizationId: string;
  status: string;
};

type SubscriptionRow = {
  id: string;
  userId: string;
  organizationId: string | null;
  status: string;
  planId: string;
  plan: { id: string; name: string; content: unknown };
};

type EntitlementRow = {
  id: string;
  organizationId: string | null;
  userId: string | null;
  status: string;
  startDate: Date;
  endDate: Date | null;
  addOn: { id: string; key: string; grants: string[]; modules: string[] };
};

const future = new Date(Date.now() + 86_400_000);
const past = new Date(Date.now() - 86_400_000);

/** The one ACTIVE membership in the fixture: `user-1` belongs to `org-1`. */
const MEMBERSHIPS: MembershipRow[] = [
  {
    id: "membership-1",
    userId: "user-1",
    organizationId: "org-1",
    status: "ACTIVE",
  },
];

/**
 * The subscriptions the fixture knows about. `organizationId: null` is the
 * personal subscription; the org one only exists inside `org-1`.
 */
const STANDARD_PLAN = {
  id: "plan-standard",
  name: "Standard",
  content: { features: ["Comunidad"], grants: ["COMMUNITY_ACCESS"], modules: [] },
};

const SUBSCRIPTIONS: SubscriptionRow[] = [
  {
    id: "sub-personal",
    userId: "user-1",
    organizationId: null,
    status: "ACTIVE",
    planId: STANDARD_PLAN.id,
    plan: STANDARD_PLAN,
  },
  {
    id: "sub-org-1",
    userId: "user-1",
    organizationId: "org-1",
    status: "ACTIVE",
    planId: STANDARD_PLAN.id,
    plan: STANDARD_PLAN,
  },
];

/** One org-scoped add-on and one personal add-on. */
const ENTITLEMENTS: EntitlementRow[] = [
  {
    id: "ent-org-1",
    organizationId: "org-1",
    userId: null,
    status: "ACTIVE",
    startDate: past,
    endDate: null,
    addOn: {
      id: "addon-org-reports",
      key: "ORG_REPORTS",
      grants: ["ORG_REPORT_ACCESS"],
      modules: ["REPORTS"],
    },
  },
  {
    id: "ent-personal",
    organizationId: null,
    userId: "user-1",
    status: "ACTIVE",
    startDate: past,
    endDate: null,
    addOn: {
      id: "addon-personal",
      key: "PERSONAL",
      grants: ["PERSONAL_ACCESS"],
      modules: [],
    },
  },
];

const prismaMock = {
  entitlement: { findMany: jest.fn() },
  moduleGrant: { findMany: jest.fn() },
  subscription: { findFirst: jest.fn() },
  organizationMember: { findFirst: jest.fn() },
};

const usersMock = { findOne: jest.fn() };

const cacheMock = {
  get: jest.fn(),
  set: jest.fn(),
};

const makeService = () =>
  new EntitlementService(
    prismaMock as never,
    usersMock as never,
    cacheMock as never,
  );

/**
 * Extracts the effective scope the shell builds, so the mocked `findMany` can
 * filter rows like the real database does.
 */
const scopeFrom = (where: any): { organizationId: string | null; userId: string | null } => {
  const scope = where?.AND?.[0] ?? where ?? {};
  if (Array.isArray(scope.OR)) {
    const orgClause = scope.OR.find((clause: any) => clause.organizationId);
    const userClause = scope.OR.find((clause: any) => clause.userId);
    return {
      organizationId: orgClause?.organizationId ?? null,
      userId: userClause?.userId ?? null,
    };
  }
  return {
    organizationId: scope.organizationId ?? null,
    userId: scope.userId ?? null,
  };
};

describe("EntitlementService — MANUAL module grants (flag + silent expiry)", () => {
  const ORIGINAL_FLAG = process.env.MODULE_FRAMEWORK_ENABLED;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MODULE_FRAMEWORK_ENABLED = "true";
    cacheMock.get.mockResolvedValue(undefined);
    cacheMock.set.mockResolvedValue(undefined);
    prismaMock.moduleGrant.findMany.mockResolvedValue([]);

    // ACTIVE membership lookup (scoped to one organization).
    prismaMock.organizationMember.findFirst.mockImplementation(
      async ({ where }: any) => {
        const row = MEMBERSHIPS.find(
          (membership) =>
            membership.userId === where.userId &&
            (where.organizationId === undefined ||
              membership.organizationId === where.organizationId) &&
            (where.status === undefined || membership.status === where.status),
        );
        return row ?? null;
      },
    );

    // Active subscription in the effective context (personal or org).
    prismaMock.subscription.findFirst.mockImplementation(
      async ({ where }: any) => {
        const row = SUBSCRIPTIONS.find(
          (subscription) =>
            subscription.userId === where.userId &&
            (subscription.organizationId ?? null) ===
              (where.organizationId ?? null) &&
            (where.status === undefined || subscription.status === where.status),
        );
        return row ?? null;
      },
    );

    // Entitlements are filtered by the scope the shell asks for.
    prismaMock.entitlement.findMany.mockImplementation(
      async ({ where }: any) => {
        const { organizationId, userId } = scopeFrom(where);
        return ENTITLEMENTS.filter((entitlement) =>
          organizationId
            ? entitlement.organizationId === organizationId ||
              (entitlement.organizationId === null &&
                entitlement.userId === userId)
            : entitlement.organizationId === null &&
              entitlement.userId === userId,
        );
      },
    );

    // The shell loads the user; subscriptions are resolved by the fallback
    // query above, exactly like a user loaded without them.
    usersMock.findOne.mockImplementation(async ({ id }: any) => ({
      id,
      permits: { list: [] },
      subscriptions: [],
    }));
  });

  afterAll(() => {
    if (ORIGINAL_FLAG === undefined) {
      delete process.env.MODULE_FRAMEWORK_ENABLED;
    } else {
      process.env.MODULE_FRAMEWORK_ENABLED = ORIGINAL_FLAG;
    }
  });

  it("includes a current MANUAL grant with source MANUAL", async () => {
    prismaMock.moduleGrant.findMany.mockResolvedValue([
      {
        module: { key: "ATTENDANCE_CONTROL" },
        source: "MANUAL",
        status: "ACTIVE",
        expiresAt: future,
      },
    ]);

    const resolved = await makeService().resolve("user-1", null);

    expect(resolved.modules).toContainEqual({
      key: "ATTENDANCE_CONTROL",
      source: "MANUAL",
    });
  });

  it("silently hides an expired MANUAL grant (no throw)", async () => {
    prismaMock.moduleGrant.findMany.mockResolvedValue([
      {
        module: { key: "ATTENDANCE_CONTROL" },
        source: "MANUAL",
        status: "ACTIVE",
        expiresAt: past,
      },
    ]);

    const resolved = await makeService().resolve("user-1", null);

    expect(resolved.modules).toHaveLength(0);
  });

  it("queries only ACTIVE MANUAL grants for the workspace owner", async () => {
    await makeService().resolve("user-1", null);

    expect(prismaMock.moduleGrant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            { organizationId: null, userId: "user-1" },
            { status: "ACTIVE", source: "MANUAL" },
          ],
        },
      }),
    );
  });

  it("skips the moduleGrant query entirely when the flag is off", async () => {
    process.env.MODULE_FRAMEWORK_ENABLED = "false";

    const resolved = await makeService().resolve("user-1", null);

    expect(prismaMock.moduleGrant.findMany).not.toHaveBeenCalled();
    expect(resolved.modules).toHaveLength(0);
  });
});

/**
 * T27 (security-hardening) — the membership check of `OrganizationScopeService`
 * (added in `3595c93`) must be exercised by this spec, not just by the
 * workspace-isolation spec: the mocked Prisma now carries `organizationMember`.
 */
describe("EntitlementService.resolve — organization membership (S6)", () => {
  const ORIGINAL_FLAG = process.env.MODULE_FRAMEWORK_ENABLED;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MODULE_FRAMEWORK_ENABLED = "true";
    cacheMock.get.mockResolvedValue(undefined);
    cacheMock.set.mockResolvedValue(undefined);
    prismaMock.moduleGrant.findMany.mockResolvedValue([]);

    prismaMock.organizationMember.findFirst.mockImplementation(
      async ({ where }: any) => {
        const row = MEMBERSHIPS.find(
          (membership) =>
            membership.userId === where.userId &&
            (where.organizationId === undefined ||
              membership.organizationId === where.organizationId) &&
            (where.status === undefined || membership.status === where.status),
        );
        return row ?? null;
      },
    );

    prismaMock.subscription.findFirst.mockImplementation(
      async ({ where }: any) => {
        const row = SUBSCRIPTIONS.find(
          (subscription) =>
            subscription.userId === where.userId &&
            (subscription.organizationId ?? null) ===
              (where.organizationId ?? null) &&
            (where.status === undefined || subscription.status === where.status),
        );
        return row ?? null;
      },
    );

    prismaMock.entitlement.findMany.mockImplementation(
      async ({ where }: any) => {
        const { organizationId, userId } = scopeFrom(where);
        return ENTITLEMENTS.filter((entitlement) =>
          organizationId
            ? entitlement.organizationId === organizationId ||
              (entitlement.organizationId === null &&
                entitlement.userId === userId)
            : entitlement.organizationId === null &&
              entitlement.userId === userId,
        );
      },
    );

    usersMock.findOne.mockImplementation(async ({ id }: any) => ({
      id,
      permits: { list: [] },
      subscriptions: [],
    }));
  });

  afterAll(() => {
    if (ORIGINAL_FLAG === undefined) {
      delete process.env.MODULE_FRAMEWORK_ENABLED;
    } else {
      process.env.MODULE_FRAMEWORK_ENABLED = ORIGINAL_FLAG;
    }
  });

  it("degrades to the personal context when the requested organization has no ACTIVE membership", async () => {
    const resolved = await makeService().resolve("user-1", "foreign-org");

    expect(prismaMock.organizationMember.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "user-1",
          organizationId: "foreign-org",
          status: "ACTIVE",
        },
      }),
    );

    expect(resolved.organizationId).toBeNull();

    const entitlementWhere = JSON.stringify(
      prismaMock.entitlement.findMany.mock.calls[0][0].where,
    );
    const grantWhere = JSON.stringify(
      prismaMock.moduleGrant.findMany.mock.calls[0][0].where,
    );
    expect(entitlementWhere).not.toContain("foreign-org");
    expect(grantWhere).not.toContain("foreign-org");

    // The foreign organization's add-on never leaks into the personal context.
    expect(resolved.permissions).not.toContain("ORG_REPORT_ACCESS");
    expect(resolved.modules.map((module) => module.key)).not.toContain(
      "REPORTS",
    );
  });

  it("degrades to the personal context for a caller with no membership row at all", async () => {
    const resolved = await makeService().resolve("user-outsider", "org-1");

    expect(prismaMock.organizationMember.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "user-outsider",
          organizationId: "org-1",
          status: "ACTIVE",
        },
      }),
    );
    expect(resolved.organizationId).toBeNull();
    expect(resolved.permissions).not.toContain("ORG_REPORT_ACCESS");
  });

  it("resolves the requested organization when the caller holds an ACTIVE membership", async () => {
    const resolved = await makeService().resolve("user-1", "org-1");

    expect(prismaMock.organizationMember.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "user-1",
          organizationId: "org-1",
          status: "ACTIVE",
        },
      }),
    );

    expect(resolved.organizationId).toBe("org-1");

    const entitlementWhere = JSON.stringify(
      prismaMock.entitlement.findMany.mock.calls[0][0].where,
    );
    expect(entitlementWhere).toContain("org-1");

    // The organization's own add-on is resolved in the org context.
    expect(resolved.permissions).toContain("ORG_REPORT_ACCESS");
    expect(resolved.modules).toContainEqual({
      key: "REPORTS",
      source: "ADDON",
      addOnId: "addon-org-reports",
    });
  });
});
