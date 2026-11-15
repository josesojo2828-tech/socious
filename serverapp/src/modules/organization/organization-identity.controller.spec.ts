import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { OrganizationIdentityController } from "./organization-identity.controller";

const ORG_A = "11111111-1111-4111-8111-111111111111";
const ORG_B = "22222222-2222-4222-8222-222222222222";

type Member = {
  userId: string;
  organizationId: string;
  status: string;
  role: string;
};

const USER = { id: "u-owner", permits: { name: "USER" } };
const ADMIN = { id: "u-platform", permits: { name: "SUPERADMIN" } };

/**
 * `GET/PATCH /api/organizations/identity` uses the SAME workspace scoping as
 * `/api/settings`: the active organization comes from `x-workspace-id` through
 * `OrganizationScopeService`, never from an arbitrary payload id. Writing is
 * restricted to the roles that may edit tenant settings.
 */
const makeController = (
  members: Member[],
  requestedOrgId: string | null = ORG_A,
) => {
  const service = {
    getIdentity: jest.fn().mockResolvedValue({
      id: ORG_A,
      name: "Carnicería El Buen Corte",
      slug: "el-buen-corte",
      taxId: "J-12345678-9",
      logoUrl: "/images/logo.png",
      brandPrimary: "#1A2B3C",
      brandAccent: "#A1B2C3",
      email: "hola@buencorte.com",
      phone: "+58 412 1234567",
      website: "https://buencorte.com",
      address: "Av. Principal, Local 4",
      latitude: 10.4806,
      longitude: -66.9036,
    }),
    updateIdentity: jest.fn().mockResolvedValue({ id: ORG_A }),
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
            (!where.status || member.status === where.status) &&
            (!where.role?.in || where.role.in.includes(member.role)),
        );
        return row
          ? { id: "membership-1", organizationId: row.organizationId }
          : null;
      }),
    },
  };

  const controller = new OrganizationIdentityController(
    service as any,
    workspaceContext as any,
    prisma as any,
  );

  return { controller, service, prisma };
};

const request = (user: any) => ({ user }) as any;

describe("OrganizationIdentityController — scoping and authorization", () => {
  it("rejects an unauthenticated read with 401", async () => {
    const { controller, service } = makeController([]);

    await expect(controller.getIdentity(request(null))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(service.getIdentity).not.toHaveBeenCalled();
  });

  it("reads the identity of the workspace resolved from the session", async () => {
    const { controller, service } = makeController([
      {
        userId: USER.id,
        organizationId: ORG_A,
        status: "ACTIVE",
        role: "SELLER",
      },
    ]);

    const result = await controller.getIdentity(request(USER));

    expect(service.getIdentity).toHaveBeenCalledWith(ORG_A);
    expect(result).toMatchObject({
      id: ORG_A,
      brandPrimary: "#1A2B3C",
      brandAccent: "#A1B2C3",
      logoUrl: "/images/logo.png",
    });
  });

  it("refuses to read without an organization in scope", async () => {
    const { controller, service } = makeController([], null);

    await expect(controller.getIdentity(request(USER))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(service.getIdentity).not.toHaveBeenCalled();
  });

  it("rejects a foreign workspace id instead of leaking another organization", async () => {
    const { controller, service } = makeController(
      [
        {
          userId: USER.id,
          organizationId: ORG_A,
          status: "ACTIVE",
          role: "OWNER",
        },
      ],
      ORG_B,
    );

    await expect(controller.getIdentity(request(USER))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(service.getIdentity).not.toHaveBeenCalled();
  });

  it("rejects a SELLER writing the identity", async () => {
    const { controller, service } = makeController([
      {
        userId: USER.id,
        organizationId: ORG_A,
        status: "ACTIVE",
        role: "SELLER",
      },
    ]);

    await expect(
      controller.updateIdentity(request(USER), { phone: "0212-5555555" } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.updateIdentity).not.toHaveBeenCalled();
  });

  it("lets an OWNER write the identity", async () => {
    const { controller, service } = makeController([
      {
        userId: USER.id,
        organizationId: ORG_A,
        status: "ACTIVE",
        role: "OWNER",
      },
    ]);

    const dto = { brandPrimary: "#1A2B3C" };
    await controller.updateIdentity(request(USER), dto as any);

    expect(service.updateIdentity).toHaveBeenCalledWith(ORG_A, dto);
  });

  it("lets a platform admin write the requested workspace", async () => {
    const { controller, service } = makeController([], ORG_B);

    const dto = { name: "Carnicería Nueva" };
    await controller.updateIdentity(request(ADMIN), dto as any);

    expect(service.updateIdentity).toHaveBeenCalledWith(ORG_B, dto);
  });
});
