import { NotFoundException } from "@nestjs/common";
import { OrganizationService } from "./organization.service";

const ORG_A = "11111111-1111-4111-8111-111111111111";

const makeService = (overrides: any = {}) => {
  const prisma: any = {
    organization: {
      findUnique: jest.fn().mockResolvedValue({ id: ORG_A }),
      update: jest.fn(async (args: any) => ({ id: ORG_A, ...args.data })),
    },
    organizationMember: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    subscription: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    ...overrides,
  };

  const service = new OrganizationService(prisma, {} as any, {} as any);
  return { service, prisma };
};

const IDENTITY_SELECT = {
  id: true,
  name: true,
  slug: true,
  taxId: true,
  logoUrl: true,
  brandPrimary: true,
  brandAccent: true,
  email: true,
  phone: true,
  website: true,
  address: true,
  latitude: true,
  longitude: true,
};

describe("OrganizationService.getIdentity", () => {
  it("selects exactly the identity fields of the organization", async () => {
    const { service, prisma } = makeService();
    prisma.organization.findUnique.mockResolvedValue({
      id: ORG_A,
      name: "Carnicería El Buen Corte",
      brandPrimary: "#1A2B3C",
    });

    const result = await service.getIdentity(ORG_A);

    expect(prisma.organization.findUnique).toHaveBeenCalledWith({
      where: { id: ORG_A },
      select: IDENTITY_SELECT,
    });
    expect(result).toMatchObject({
      id: ORG_A,
      brandPrimary: "#1A2B3C",
    });
  });

  it("fails with 404 when the organization does not exist", async () => {
    const { service, prisma } = makeService();
    prisma.organization.findUnique.mockResolvedValue(null);

    await expect(service.getIdentity(ORG_A)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe("OrganizationService.updateIdentity — partial writes", () => {
  it("updates only the keys present in the payload", async () => {
    const { service, prisma } = makeService();

    await service.updateIdentity(ORG_A, {
      phone: "+58 412 1234567",
      brandPrimary: "#1A2B3C",
    });

    expect(prisma.organization.update).toHaveBeenCalledWith({
      where: { id: ORG_A },
      data: { phone: "+58 412 1234567", brandPrimary: "#1A2B3C" },
      select: IDENTITY_SELECT,
    });
  });

  it("does not turn omitted keys into nulls", async () => {
    const { service, prisma } = makeService();

    await service.updateIdentity(ORG_A, {});

    expect(prisma.organization.update).toHaveBeenCalledWith({
      where: { id: ORG_A },
      data: {},
      select: IDENTITY_SELECT,
    });
  });

  it("keeps an explicit null so the UI can clear a field", async () => {
    const { service, prisma } = makeService();

    await service.updateIdentity(ORG_A, { email: null } as any);

    expect(prisma.organization.update).toHaveBeenCalledWith({
      where: { id: ORG_A },
      data: { email: null },
      select: IDENTITY_SELECT,
    });
  });

  it("writes NULL for every explicit null and skips omitted keys", async () => {
    const { service, prisma } = makeService();

    // Only the keys the identity page sends as `null`; `name` and the brand
    // colors are deliberately omitted and must not appear in `data`.
    await service.updateIdentity(ORG_A, {
      email: null,
      phone: null,
      website: null,
      address: null,
      latitude: null,
      longitude: null,
      logoUrl: null,
    } as any);

    expect(prisma.organization.update).toHaveBeenCalledWith({
      where: { id: ORG_A },
      data: {
        email: null,
        phone: null,
        website: null,
        address: null,
        latitude: null,
        longitude: null,
        logoUrl: null,
      },
      select: IDENTITY_SELECT,
    });
    const data = prisma.organization.update.mock.calls[0][0].data as Record<
      string,
      unknown
    >;
    expect(data).not.toHaveProperty("name");
    expect(data).not.toHaveProperty("brandPrimary");
    expect(data).not.toHaveProperty("brandAccent");
  });

  it("fails with 404 when the organization does not exist", async () => {
    const { service, prisma } = makeService();
    prisma.organization.findUnique.mockResolvedValue(null);

    await expect(
      service.updateIdentity(ORG_A, { phone: "0212-5555555" }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.organization.update).not.toHaveBeenCalled();
  });
});

/**
 * `my-workspaces` feeds `useWorkspaceStore`. The payload spreads the full
 * Prisma organization, so the logo was already serialized there and the two
 * brand colors arrive with the same shape; this spec pins it so a future
 * `select` narrowing cannot silently drop them.
 */
describe("OrganizationService.getUserOrganizations — identity fields", () => {
  it("returns logoUrl and both brand colors for each workspace", async () => {
    const { service, prisma } = makeService();
    prisma.organizationMember.findMany.mockResolvedValue([
      {
        role: "OWNER",
        colorHex: "#4F46E5",
        organization: {
          id: ORG_A,
          name: "Carnicería El Buen Corte",
          slug: "el-buen-corte",
          logoUrl: "/images/logo.png",
          brandPrimary: "#1A2B3C",
          brandAccent: "#A1B2C3",
          members: [],
        },
      },
    ]);

    const [workspace] = await service.getUserOrganizations("u-owner");

    expect(workspace).toMatchObject({
      id: ORG_A,
      logoUrl: "/images/logo.png",
      brandPrimary: "#1A2B3C",
      brandAccent: "#A1B2C3",
    });
  });
});
