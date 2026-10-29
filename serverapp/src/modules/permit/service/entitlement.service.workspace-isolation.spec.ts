import { EntitlementService } from "./entitlement.service";

/**
 * S6 (legal-compliance): x-workspace-id must only take effect when the
 * user is an ACTIVE member of that organization. A crafted header for a
 * foreign org must degrade to the personal context, never resolve that
 * org's entitlements (cross-tenant leak).
 */
describe("EntitlementService.resolve — workspace isolation (S6)", () => {
  const makeService = (membership: unknown) => {
    const prisma = {
      organizationMember: {
        findFirst: jest.fn().mockResolvedValue(membership),
      },
      entitlement: { findMany: jest.fn().mockResolvedValue([]) },
      moduleGrant: { findMany: jest.fn().mockResolvedValue([]) },
      subscription: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const cache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    };
    const users = { findOne: jest.fn().mockResolvedValue(null) };
    const service = new EntitlementService(
      prisma as any,
      users as any,
      cache as any,
    );
    return { service, prisma, cache };
  };

  it("degrades to the personal scope when the header org has no ACTIVE membership", async () => {
    const { service, prisma } = makeService(null);

    await service.resolve("user-1", "foreign-org-id");

    expect(prisma.organizationMember.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "foreign-org-id",
          userId: "user-1",
          status: "ACTIVE",
        }),
      }),
    );

    const where = prisma.entitlement.findMany.mock.calls[0][0].where;
    expect(JSON.stringify(where)).not.toContain("foreign-org-id");
  });

  it("keeps the org scope when the user IS an ACTIVE member", async () => {
    const { service, prisma } = makeService({ id: "member-1" });

    await service.resolve("user-1", "my-org-id");

    const where = prisma.entitlement.findMany.mock.calls[0][0].where;
    expect(JSON.stringify(where)).toContain("my-org-id");
  });

  it("resolves the personal scope without a workspace header", async () => {
    const { service, prisma } = makeService(null);

    await service.resolve("user-1", null);

    expect(prisma.organizationMember.findFirst).not.toHaveBeenCalled();
    const where = prisma.entitlement.findMany.mock.calls[0][0].where;
    expect(JSON.stringify(where)).not.toContain("organizationId\":\"");
  });
});
