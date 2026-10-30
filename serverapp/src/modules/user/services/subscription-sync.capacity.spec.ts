import { SubscriptionSyncService } from "./subscription-sync.service";

const USER = "33333333-3333-4333-8333-333333333333";
const ORG = "44444444-4444-4444-8444-444444444444";

const makeService = (opts: {
  capacityPlan?: any;
  organization?: any;
} = {}) => {
  const prisma: any = {
    subscription: {
      // 1st call: the capacity lookup; 2nd: the legacy community lookup.
      findFirst: jest
        .fn()
        .mockResolvedValueOnce(opts.capacityPlan ?? null)
        .mockResolvedValue({ planId: "BASICO", plan: { content: {} } }),
    },
    organization: {
      findUnique: jest.fn().mockResolvedValue(opts.organization ?? null),
      update: jest.fn(),
    },
    userPermission: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  return { service: new SubscriptionSyncService(prisma), prisma };
};

describe("SubscriptionSyncService — plan capacity (S9/S11)", () => {
  it("raises the seats of the organization to the plan floor", async () => {
    const { service, prisma } = makeService({
      capacityPlan: {
        plan: { content: { capacity: { includedSeats: 6, maxBranches: 3 } } },
      },
      organization: { id: ORG, maxSeats: 1 },
    });

    await service.handleActivated({ userId: USER, organizationId: ORG });

    expect(prisma.organization.update).toHaveBeenCalledWith({
      where: { id: ORG },
      data: { maxSeats: 6 },
    });
  });

  it("never lowers seats someone already paid for", async () => {
    const { service, prisma } = makeService({
      capacityPlan: {
        plan: { content: { capacity: { includedSeats: 1, maxBranches: 1 } } },
      },
      organization: { id: ORG, maxSeats: 8 },
    });

    await service.handleActivated({ userId: USER, organizationId: ORG });

    expect(prisma.organization.update).not.toHaveBeenCalled();
  });

  it("does nothing for a personal subscription (no organization)", async () => {
    const { service, prisma } = makeService({
      capacityPlan: {
        plan: { content: { capacity: { includedSeats: 6 } } },
      },
    });

    await service.handleActivated({ userId: USER });

    // The legacy community lookup still runs; only the capacity sync must not.
    expect(prisma.organization.findUnique).not.toHaveBeenCalled();
    expect(prisma.organization.update).not.toHaveBeenCalled();
  });

  it("ignores a plan without a readable capacity block", async () => {
    const { service, prisma } = makeService({
      capacityPlan: { plan: { content: { features: [] } } },
      organization: { id: ORG, maxSeats: 1 },
    });

    await service.handleActivated({ userId: USER, organizationId: ORG });

    expect(prisma.organization.update).not.toHaveBeenCalled();
  });
});
