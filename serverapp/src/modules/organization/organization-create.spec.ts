import { OrganizationService } from "./organization.service";

const ADMIN = "33333333-3333-4333-8333-333333333333";
const PREMIUM_CAPACITY = { capacity: { maxBranches: 3, includedSeats: 6 } };
const BASICO_CAPACITY = { capacity: { maxBranches: 1, includedSeats: 1 } };

const makePrisma = (opts: {
  plan?: any;
  slugTaken?: boolean;
  slugTakenTwice?: boolean;
} = {}) => {
  const slugProbe = opts.slugTakenTwice
    ? jest
        .fn()
        .mockResolvedValueOnce({ id: "taken-1" })
        .mockResolvedValueOnce({ id: "taken-2" })
        .mockResolvedValue(null)
    : opts.slugTaken
      ? jest
          .fn()
          .mockResolvedValueOnce({ id: "taken-1" })
          .mockResolvedValue(null)
      : jest.fn().mockResolvedValue(null);

  const prisma: any = {
    subscriptionPlan: {
      findUnique: jest.fn().mockResolvedValue(opts.plan),
    },
    organization: {
      findUnique: slugProbe,
      create: jest.fn(async (args: any) => ({
        id: "org-1",
        members: [],
        ...args.data,
      })),
    },
    subscription: {
      create: jest.fn(async (args: any) => ({ id: "sub-1", ...args.data })),
    },
    branch: {
      create: jest.fn(async (args: any) => ({ id: "branch-1", ...args.data })),
    },
  };

  return prisma;
};

const makeService = (opts: Parameters<typeof makePrisma>[0] = {}) => {
  const prisma = makePrisma(opts);
  const service = new OrganizationService(prisma, {} as any, {} as any);
  return { service, prisma };
};

const DEFAULT_PLAN = { id: "BASICO", content: BASICO_CAPACITY };

describe("OrganizationService.createOrganization (S9/S10)", () => {
  it("derives a public slug from the name", async () => {
    const { service, prisma } = makeService({ plan: DEFAULT_PLAN });

    await service.createOrganization({ name: "Mi Negocio C.A." } as any, ADMIN);

    expect(prisma.organization.create.mock.calls[0][0].data.slug).toBe(
      "mi-negocio-c-a",
    );
  });

  it("keeps an explicit slug and makes it unique when taken", async () => {
    const { service, prisma } = makeService({
      plan: DEFAULT_PLAN,
      slugTaken: true,
    });

    await service.createOrganization({ name: "Tienda", slug: "tienda" } as any, ADMIN);

    expect(prisma.organization.create.mock.calls[0][0].data.slug).toBe(
      "tienda-2",
    );
  });

  it("does not assign a plan: the merchant picks it explicitly", async () => {
    const { service, prisma } = makeService({ plan: DEFAULT_PLAN });

    const org = await service.createOrganization({ name: "Tienda" } as any, ADMIN);

    expect(prisma.subscription.create).not.toHaveBeenCalled();
    expect(org.id).toBe("org-1");
  });

  it("takes the seat floor from the plan capacity, not from the old 5", async () => {
    const { service, prisma } = makeService({ plan: DEFAULT_PLAN });

    await service.createOrganization({ name: "Tienda" } as any, ADMIN);

    expect(prisma.organization.create.mock.calls[0][0].data.maxSeats).toBe(1);
  });

  it("honors an explicit seat count when it exceeds the plan floor", async () => {
    const { service, prisma } = makeService({ plan: DEFAULT_PLAN });

    await service.createOrganization({ name: "Tienda", maxSeats: 5 } as any, ADMIN);

    expect(prisma.organization.create.mock.calls[0][0].data.maxSeats).toBe(5);
  });

  it("starts a Premium organization with its full capacity", async () => {
    const { service, prisma } = makeService({
      plan: { id: "PREMIUM", content: PREMIUM_CAPACITY },
    });

    await service.createOrganization({ name: "Tienda" } as any, ADMIN);

    expect(prisma.organization.create.mock.calls[0][0].data.maxSeats).toBe(6);
  });

  it("creates the organization even if the plans seed never ran", async () => {
    const { service, prisma } = makeService({ plan: null });

    const org = await service.createOrganization({ name: "Tienda" } as any, ADMIN);

    expect(org.id).toBe("org-1");
    expect(prisma.subscription.create).not.toHaveBeenCalled();
    // historical default preserved when there is no plan to read
    expect(prisma.organization.create.mock.calls[0][0].data.maxSeats).toBe(5);
  });

  it("creates the hidden default branch (S10)", async () => {
    const { service, prisma } = makeService({ plan: DEFAULT_PLAN });

    await service.createOrganization({ name: "Tienda" } as any, ADMIN);

    expect(prisma.branch.create.mock.calls[0][0].data).toEqual({
      organizationId: "org-1",
      name: "Subsucursal principal",
      isDefault: true,
    });
  });

  it("keeps the founding member as the org admin role", async () => {
    const { service, prisma } = makeService({ plan: DEFAULT_PLAN });

    await service.createOrganization({ name: "Tienda" } as any, ADMIN);

    expect(prisma.organization.create.mock.calls[0][0].data.members).toEqual({
      create: expect.objectContaining({
        userId: ADMIN,
        role: "CLINIC_ADMIN",
        status: "ACTIVE",
      }),
    });
  });
});
