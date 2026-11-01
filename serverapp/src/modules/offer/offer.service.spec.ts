import { OfferService } from "./offer.service";

const makeService = (rows: unknown[] = []) => {
  const prisma = {
    offer: { findMany: jest.fn().mockResolvedValue(rows) },
  };
  return { service: new OfferService(prisma as any), prisma };
};

describe("OfferService", () => {
  describe("listPublic", () => {
    it("asks only for active, unexpired offers of the org, soonest expiry first", async () => {
      const { service, prisma } = makeService();

      await service.listPublic("org-1");

      expect(prisma.offer.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.offer.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: "org-1",
          active: true,
          expiresAt: { gte: expect.any(Date) },
        },
        orderBy: { expiresAt: "asc" },
        select: {
          id: true,
          name: true,
          slogan: true,
          bannerKey: true,
          expiresAt: true,
          discountPercent: true,
          _count: { select: { items: true } },
        },
      });
    });

    it("returns every storefront field including the product count", async () => {
      const row = {
        id: "offer-1",
        name: "Oferta smoke",
        slogan: "Últimos días",
        bannerKey: "offer_banner.png",
        expiresAt: new Date("2026-12-31T00:00:00.000Z"),
        discountPercent: 10,
        _count: { items: 2 },
      };
      const { service } = makeService([row]);

      await expect(service.listPublic("org-1")).resolves.toEqual([row]);
    });

    it("resolves an empty array when the org has no visible offers", async () => {
      const { service } = makeService([]);

      await expect(service.listPublic("org-1")).resolves.toEqual([]);
    });
  });
});
