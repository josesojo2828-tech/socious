import { OrganizationScopeService } from "./organization-scope.service";

/**
 * S6 (legal-compliance): the shared tenant-isolation rule for `x-workspace-id`.
 *
 * ONE rule, three call sites (entitlement, activity, dashboard):
 *  - A global role (ADMIN / SUPERADMIN) may request any organization.
 *  - Any other caller may request an organization ONLY when it holds an ACTIVE
 *    `OrganizationMember` row there. A foreign organization id degrades to the
 *    caller's own ACTIVE membership organization, or to the personal context.
 */
type Member = { organizationId: string; userId: string; status: string };

const makeService = (members: Member[]) => {
  const queries: any[] = [];
  const prisma = {
    organizationMember: {
      findFirst: jest.fn(async ({ where }: any) => {
        queries.push(where);
        const rows = members.filter(
          (m) =>
            (!where.organizationId ||
              m.organizationId === where.organizationId) &&
            (!where.userId || m.userId === where.userId) &&
            (!where.status || m.status === where.status),
        );
        return rows[0] ?? null;
      }),
    },
  };
  const service = new OrganizationScopeService(prisma as any);
  return { service, prisma, queries };
};

const tenant = { id: "u1", permits: { name: "NUTRITIONIST" } };
const admin = { id: "u1", permits: { name: "ADMIN" } };

describe("OrganizationScopeService — x-workspace-id tenant isolation (S6)", () => {
  it("honors a requested org when the caller has an ACTIVE membership there", async () => {
    const { service, queries } = makeService([
      { organizationId: "org-MINE", userId: "u1", status: "ACTIVE" },
    ]);

    const result = await service.resolveOrganizationScope({
      user: tenant,
      requestedOrganizationId: "org-MINE",
    });

    expect(result.organizationId).toBe("org-MINE");
    expect(result.source).toBe("requested");
    expect(queries[0]).toEqual(
      expect.objectContaining({
        organizationId: "org-MINE",
        userId: "u1",
        status: "ACTIVE",
      }),
    );
  });

  it("degrades a foreign org to the caller's OWN ACTIVE membership org", async () => {
    const { service, queries } = makeService([
      { organizationId: "org-MINE", userId: "u1", status: "ACTIVE" },
    ]);

    const result = await service.resolveOrganizationScope({
      user: tenant,
      requestedOrganizationId: "org-OTHER",
    });

    expect(result.organizationId).toBe("org-MINE");
    expect(result.source).toBe("own-membership");
    expect(result.organizationId).not.toBe("org-OTHER");
    // The own-membership lookup is user-scoped and carries no foreign org.
    expect(queries).toHaveLength(2);
    expect(queries[1]).toEqual(
      expect.objectContaining({ userId: "u1", status: "ACTIVE" }),
    );
    expect(queries[1].organizationId).toBeUndefined();
  });

  it("degrades a foreign org to the personal context when there is no membership", async () => {
    const { service, queries } = makeService([]);

    const result = await service.resolveOrganizationScope({
      user: tenant,
      requestedOrganizationId: "org-OTHER",
    });

    expect(result.organizationId).toBeNull();
    expect(result.source).toBe("personal");
    expect(result.organizationId).not.toBe("org-OTHER");
    // Requested-org check + own-membership lookup; no data query sees the
    // foreign organization.
    expect(queries).toHaveLength(2);
    expect(queries[0].userId).toBe("u1");
    expect(queries[1].organizationId).toBeUndefined();
  });

  it("does not honor an org whose only membership is INACTIVE", async () => {
    const { service } = makeService([
      { organizationId: "org-MINE", userId: "u1", status: "INACTIVE" },
    ]);

    const result = await service.resolveOrganizationScope({
      user: tenant,
      requestedOrganizationId: "org-MINE",
    });

    expect(result.organizationId).toBeNull();
  });

  it("honors any requested org for a global role (ADMIN / SUPERADMIN)", async () => {
    const { service, queries } = makeService([]);

    const result = await service.resolveOrganizationScope({
      user: admin,
      requestedOrganizationId: "org-OTHER",
    });

    expect(result.organizationId).toBe("org-OTHER");
    expect(result.source).toBe("global-role");
    expect(queries).toHaveLength(0);
  });

  it("falls back to the own ACTIVE membership org when no org is requested", async () => {
    const { service } = makeService([
      { organizationId: "org-MINE", userId: "u1", status: "ACTIVE" },
    ]);

    const result = await service.resolveOrganizationScope({
      user: tenant,
      requestedOrganizationId: null,
    });

    expect(result.organizationId).toBe("org-MINE");
    expect(result.source).toBe("own-membership");
  });

  it("treats the 'personal' / 'null' / empty sentinels as no request", async () => {
    const { service, queries } = makeService([]);

    for (const sentinel of ["personal", "null", ""]) {
      const result = await service.resolveOrganizationScope({
        user: tenant,
        requestedOrganizationId: sentinel,
      });
      expect(result.organizationId).toBeNull();
    }
    // The sentinels never trigger an organization lookup.
    expect(queries.every((q) => q.organizationId === undefined)).toBe(true);
  });

  it("supports the 'personal' fallback policy (no own-membership lookup)", async () => {
    const { service, queries } = makeService([
      { organizationId: "org-MINE", userId: "u1", status: "ACTIVE" },
    ]);

    const result = await service.resolveOrganizationScope({
      user: tenant,
      requestedOrganizationId: "org-OTHER",
      unauthorizedFallback: "personal",
      missingFallback: "personal",
    });

    expect(result.organizationId).toBeNull();
    expect(result.source).toBe("personal");
    // Only the (user-scoped) requested-org membership check ran.
    expect(queries).toHaveLength(1);
    expect(queries[0].userId).toBe("u1");
  });
});
