import { ForbiddenException } from "@nestjs/common";
import { assertCanEditOrganization } from "./organization-write-access";

const ORG_A = "11111111-1111-4111-8111-111111111111";

const makePrisma = (membership: any) => ({
  organizationMember: {
    findFirst: jest.fn().mockResolvedValue(membership),
  },
});

/**
 * Shared rule extracted from `SettingsController.assertCanEdit`: platform
 * admins bypass it, and an ACTIVE OWNER/ADMIN/CLINIC_ADMIN membership is the
 * only non-global role allowed to change tenant-level configuration.
 */
describe("assertCanEditOrganization", () => {
  it("lets a SUPERADMIN through without a membership lookup", async () => {
    const prisma = makePrisma(null);

    await expect(
      assertCanEditOrganization(prisma as any, { id: "u-1", permits: { name: "SUPERADMIN" } }, ORG_A),
    ).resolves.toBeUndefined();
    expect(prisma.organizationMember.findFirst).not.toHaveBeenCalled();
  });

  it("lets an ADMIN through without a membership lookup", async () => {
    const prisma = makePrisma(null);

    await expect(
      assertCanEditOrganization(prisma as any, { id: "u-1", permits: { name: "ADMIN" } }, ORG_A),
    ).resolves.toBeUndefined();
    expect(prisma.organizationMember.findFirst).not.toHaveBeenCalled();
  });

  it.each(["OWNER", "ADMIN", "CLINIC_ADMIN"])(
    "lets an ACTIVE %s membership through",
    async (role) => {
      const prisma = makePrisma({ id: "membership-1" });

      await expect(
        assertCanEditOrganization(prisma as any, { id: "u-1", permits: { name: "USER" } }, ORG_A),
      ).resolves.toBeUndefined();
      expect(prisma.organizationMember.findFirst).toHaveBeenCalledWith({
        where: {
          userId: "u-1",
          organizationId: ORG_A,
          status: "ACTIVE",
          role: { in: ["OWNER", "ADMIN", "CLINIC_ADMIN"] },
        },
        select: { id: true },
      });
    },
  );

  it("rejects a SELLER membership", async () => {
    const prisma = makePrisma(null);

    await expect(
      assertCanEditOrganization(prisma as any, { id: "u-1", permits: { name: "USER" } }, ORG_A),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects a caller with no user", async () => {
    const prisma = makePrisma({ id: "membership-1" });

    await expect(
      assertCanEditOrganization(prisma as any, null, ORG_A),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
