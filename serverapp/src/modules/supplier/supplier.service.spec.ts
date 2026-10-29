import { ConflictException, NotFoundException } from "@nestjs/common";
import { SupplierService } from "./supplier.service";

const ORG_A = "org-a";

const makePrisma = () => ({
  supplier: {
    findMany: jest.fn().mockResolvedValue([]),
    findFirst: jest.fn().mockResolvedValue(null),
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn((args: any) =>
      Promise.resolve({ id: "s1", ...args.data }),
    ),
    update: jest.fn((args: any) =>
      Promise.resolve({ id: args.where.id, ...args.data }),
    ),
  },
  purchase: {
    count: jest.fn().mockResolvedValue(0),
    aggregate: jest.fn().mockResolvedValue({ _sum: { totalUSD: 0 } }),
  },
  purchasePayment: {
    aggregate: jest.fn().mockResolvedValue({ _sum: { amountUSD: 0 } }),
  },
});

const makeService = () => {
  const prisma = makePrisma();
  return { service: new SupplierService(prisma as any), prisma };
};

describe("SupplierService", () => {
  it("scopes the listing to the organization", async () => {
    const { service, prisma } = makeService();

    await service.list({ organizationId: ORG_A }, { page: 1, limit: 10 });

    expect(prisma.supplier.findMany.mock.calls[0][0].where.AND[0]).toEqual({
      organizationId: ORG_A,
      deletedAt: null,
    });
  });

  it("rejects a supplier document already used in the tenant", async () => {
    const { service, prisma } = makeService();
    prisma.supplier.findFirst.mockResolvedValue({ id: "existing" });

    await expect(
      service.create({ organizationId: ORG_A }, { name: "Distribuidora", taxId: "J-9" }),
    ).rejects.toThrow(ConflictException);
  });

  it("refuses to remove a supplier that has purchases", async () => {
    const { service, prisma } = makeService();
    prisma.supplier.findFirst.mockResolvedValue({ id: "s-1", taxId: null });
    prisma.purchase.count.mockResolvedValue(2);

    await expect(service.remove({ organizationId: ORG_A }, "s-1")).rejects.toThrow(
      ConflictException,
    );
    expect(prisma.supplier.update).not.toHaveBeenCalled();
  });

  it("reports the payable balance as purchased minus paid", async () => {
    const { service, prisma } = makeService();
    prisma.supplier.findFirst.mockResolvedValue({ id: "s-1", taxId: null });
    prisma.purchase.aggregate.mockResolvedValue({
      _sum: { totalUSD: "150.00" },
    });
    prisma.purchasePayment.aggregate.mockResolvedValue({
      _sum: { amountUSD: "60.00" },
    });

    const balance = await service.getBalance({ organizationId: ORG_A }, "s-1");

    expect(balance).toMatchObject({
      totalUSD: 150,
      paidUSD: 60,
      currentBalanceUSD: 90,
    });
  });

  it("raises NotFound when the supplier belongs to another tenant", async () => {
    const { service } = makeService();

    await expect(service.getOne({ organizationId: ORG_A }, "s-x")).rejects.toThrow(
      NotFoundException,
    );
  });
});
