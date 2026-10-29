import { ConflictException, NotFoundException } from "@nestjs/common";
import { ClientService } from "./client.service";

const ORG_A = "org-a";
const ORG_B = "org-b";

const makePrisma = () => ({
  client: {
    findMany: jest.fn().mockResolvedValue([]),
    findFirst: jest.fn().mockResolvedValue(null),
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn((args: any) => Promise.resolve({ id: "c1", ...args.data })),
    update: jest.fn((args: any) => Promise.resolve({ id: args.where.id, ...args.data })),
  },
  sale: {
    count: jest.fn().mockResolvedValue(0),
    aggregate: jest.fn().mockResolvedValue({ _sum: { totalUSD: 0 } }),
  },
  salePayment: {
    aggregate: jest.fn().mockResolvedValue({ _sum: { amountUSD: 0 } }),
  },
});

const makeService = () => {
  const prisma = makePrisma();
  return { service: new ClientService(prisma as any), prisma };
};

describe("ClientService", () => {
  describe("tenant isolation", () => {
    it("filters the listing by the effective organization", async () => {
      const { service, prisma } = makeService();

      await service.list({ organizationId: ORG_A }, { page: 1, limit: 10 });

      const where = prisma.client.findMany.mock.calls[0][0].where;
      expect(where.AND[0]).toEqual({
        organizationId: ORG_A,
        deletedAt: null,
      });
    });

    it("uses a null organization for the personal context", async () => {
      const { service, prisma } = makeService();

      await service.list({ organizationId: null }, { page: 1, limit: 10 });

      const where = prisma.client.findMany.mock.calls[0][0].where;
      expect(where.AND[0]).toEqual({
        organizationId: null,
        deletedAt: null,
      });
    });

    it("raises NotFound when the client belongs to another tenant", async () => {
      const { service, prisma } = makeService();
      prisma.client.findFirst.mockResolvedValue(null);

      await expect(service.getOne({ organizationId: ORG_A }, "c-1")).rejects.toThrow(
        NotFoundException,
      );

      expect(prisma.client.findFirst.mock.calls[0][0].where).toMatchObject({
        id: "c-1",
        organizationId: ORG_A,
      });
    });
  });

  describe("search", () => {
    it("searches name, document, email and phone", async () => {
      const { service, prisma } = makeService();

      await service.list({ organizationId: ORG_A }, { q: "  Acme  " });

      const filters = prisma.client.findMany.mock.calls[0][0].where.AND;
      expect(filters).toContainEqual({
        OR: [
          { name: { contains: "Acme", mode: "insensitive" } },
          { taxId: { contains: "Acme", mode: "insensitive" } },
          { email: { contains: "Acme", mode: "insensitive" } },
          { phone: { contains: "Acme", mode: "insensitive" } },
        ],
      });
    });
  });

  describe("document uniqueness", () => {
    it("rejects a document already used inside the same tenant", async () => {
      const { service, prisma } = makeService();
      prisma.client.findFirst.mockResolvedValue({ id: "existing" });

      await expect(
        service.create({ organizationId: ORG_A }, { name: "Acme", taxId: "J-123" }),
      ).rejects.toThrow(ConflictException);
    });

    it("lets another tenant use the same document", async () => {
      const { service, prisma } = makeService();
      prisma.client.findFirst.mockResolvedValue(null);

      await expect(
        service.create({ organizationId: ORG_B }, { name: "Acme", taxId: "J-123" }),
      ).resolves.toMatchObject({ organizationId: ORG_B });

      expect(prisma.client.findFirst.mock.calls[0][0].where).toMatchObject({
        taxId: "J-123",
        organizationId: ORG_B,
      });
    });
  });

  describe("removal", () => {
    it("refuses to delete a client that has sales", async () => {
      const { service, prisma } = makeService();
      prisma.client.findFirst.mockResolvedValue({ id: "c-1", taxId: null });
      prisma.sale.count.mockResolvedValue(3);

      await expect(service.remove({ organizationId: ORG_A }, "c-1")).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.client.update).not.toHaveBeenCalled();
    });

    it("archives a client with no sales", async () => {
      const { service, prisma } = makeService();
      prisma.client.findFirst.mockResolvedValue({ id: "c-1", taxId: null });
      prisma.sale.count.mockResolvedValue(0);

      await expect(service.remove({ organizationId: ORG_A }, "c-1")).resolves.toEqual({
        id: "c-1",
        deleted: true,
      });

      const updateArgs = prisma.client.update.mock.calls[0][0];
      expect(updateArgs.where).toEqual({ id: "c-1" });
      expect(updateArgs.data.deletedAt).toBeInstanceOf(Date);
    });
  });

  describe("balance", () => {
    it("subtracts collected payments from the invoiced total", async () => {
      const { service, prisma } = makeService();
      prisma.client.findFirst.mockResolvedValue({
        id: "c-1",
        taxId: null,
        creditLimitUSD: "100.00",
      });
      prisma.sale.aggregate.mockResolvedValue({ _sum: { totalUSD: "80.00" } });
      prisma.salePayment.aggregate.mockResolvedValue({
        _sum: { amountUSD: "30.00" },
      });

      const balance = await service.getBalance({ organizationId: ORG_A }, "c-1");

      expect(balance).toMatchObject({
        totalUSD: 80,
        paidUSD: 30,
        currentBalanceUSD: 50,
        creditLimitUSD: 100,
        availableCreditUSD: 50,
      });
    });

    it("never reports a negative balance or available credit", async () => {
      const { service, prisma } = makeService();
      prisma.client.findFirst.mockResolvedValue({
        id: "c-1",
        taxId: null,
        creditLimitUSD: "40.00",
      });
      prisma.sale.aggregate.mockResolvedValue({ _sum: { totalUSD: "20.00" } });
      prisma.salePayment.aggregate.mockResolvedValue({
        _sum: { amountUSD: "90.00" },
      });

      const balance = await service.getBalance({ organizationId: ORG_A }, "c-1");

      expect(balance.currentBalanceUSD).toBe(0);
      expect(balance.availableCreditUSD).toBe(40);
    });
  });
});
