import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { SettingsController } from "./settings.controller";

const ORG_A = "11111111-1111-4111-8111-111111111111";

type Member = {
  userId: string;
  organizationId: string;
  status: string;
  role: string;
};

/**
 * Authz contract of `GET/PATCH /api/settings` (S1):
 *  - reading needs an authenticated session (defaults without an organization)
 *  - writing needs a resolved organization AND an OWNER/ADMIN membership, or a
 *    platform role; any other member is rejected.
 */
const makeController = (
  members: Member[],
  requestedOrgId: string | null = ORG_A,
  user: any = null,
) => {
  const tenantSettings = {
    get: jest.fn().mockResolvedValue({ routes: { enabled: false } }),
    update: jest.fn().mockResolvedValue({ routes: { enabled: true } }),
  };

  const workspaceContext = {
    getWorkspaceId: jest.fn().mockReturnValue(requestedOrgId),
  };

  const prisma = {
    organizationMember: {
      findFirst: jest.fn(async ({ where }: any) => {
        const row = members.find(
          (member) =>
            member.userId === where.userId &&
            (!where.organizationId ||
              member.organizationId === where.organizationId) &&
            (!where.status || member.status === where.status),
        );
        if (!row) return null;
        if (where.role?.in && !where.role.in.includes(row.role)) return null;
        return { id: "membership-1", organizationId: row.organizationId };
      }),
    },
  };

  const controller = new SettingsController(
    tenantSettings as any,
    workspaceContext as any,
    prisma as any,
  );

  return { controller, tenantSettings, prisma };
};

const request = (user: any, headers: Record<string, string> = {}) =>
  ({ user, headers }) as any;

const ownerUser = {
  id: "u-owner",
  permits: { name: "USER" },
};
const sellerUser = {
  id: "u-seller",
  permits: { name: "USER" },
};
const platformAdmin = {
  id: "u-admin",
  permits: { name: "ADMIN" },
};

describe("SettingsController", () => {
  it("rejects an unauthenticated read", async () => {
    const { controller } = makeController([], ORG_A, null);

    await expect(controller.getSettings(request(null))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it("reads the settings of the requested workspace", async () => {
    const { controller, tenantSettings } = makeController(
      [
        {
          userId: ownerUser.id,
          organizationId: ORG_A,
          status: "ACTIVE",
          role: "OWNER",
        },
      ],
      ORG_A,
      ownerUser,
    );

    await controller.getSettings(request(ownerUser, { "x-workspace-id": ORG_A }));

    expect(tenantSettings.get).toHaveBeenCalledWith(ORG_A);
  });

  it("falls back to defaults without an organization instead of failing", async () => {
    const { controller, tenantSettings } = makeController([], null, ownerUser);

    await controller.getSettings(request(ownerUser));

    expect(tenantSettings.get).toHaveBeenCalledWith(null);
  });

  it("lets an OWNER update the settings", async () => {
    const { controller, tenantSettings } = makeController(
      [
        {
          userId: ownerUser.id,
          organizationId: ORG_A,
          status: "ACTIVE",
          role: "OWNER",
        },
      ],
      ORG_A,
      ownerUser,
    );

    await controller.updateSettings(
      request(ownerUser, { "x-workspace-id": ORG_A }),
      { routes: { enabled: true } } as any,
    );

    expect(tenantSettings.update).toHaveBeenCalledWith(ORG_A, {
      routes: { enabled: true },
    });
  });

  it("rejects a SELLER flipping operator settings", async () => {
    const { controller, tenantSettings } = makeController(
      [
        {
          userId: sellerUser.id,
          organizationId: ORG_A,
          status: "ACTIVE",
          role: "SELLER",
        },
      ],
      ORG_A,
      sellerUser,
    );

    await expect(
      controller.updateSettings(
        request(sellerUser, { "x-workspace-id": ORG_A }),
        { cash: { shiftControl: false } } as any,
      ),
    ).rejects.toThrow(ForbiddenException);
    expect(tenantSettings.update).not.toHaveBeenCalled();
  });

  it("lets a platform admin edit any workspace", async () => {
    const { controller, tenantSettings } = makeController([], ORG_A, platformAdmin);

    await controller.updateSettings(
      request(platformAdmin, { "x-workspace-id": ORG_A }),
      { cash: { shiftControl: false } } as any,
    );

    expect(tenantSettings.update).toHaveBeenCalledWith(ORG_A, {
      cash: { shiftControl: false },
    });
  });

  it("refuses a write without an organization", async () => {
    const { controller, tenantSettings } = makeController([], null, ownerUser);

    await expect(
      controller.updateSettings(
        request(ownerUser),
        { routes: { enabled: true } } as any,
      ),
    ).rejects.toThrow(ForbiddenException);
    expect(tenantSettings.update).not.toHaveBeenCalled();
  });
});
