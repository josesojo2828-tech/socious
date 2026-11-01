import { OfferService } from "./offer.service";

const makeService = (rows: unknown[] = [], total = rows.length) => {
  const prisma = {
    offer: {
      findMany: jest.fn().mockResolvedValue(rows),
      count: jest.fn().mockResolvedValue(total),
    },
  };
  return { service: new OfferService(prisma as any), prisma };
};

describe("OfferService", () => {
  describe("list", () => {
    it("answers the paged envelope with the org scope and default paging", async () => {
      const rows = [{ id: "offer-1" }];
      const { service, prisma } = makeService(rows, 3);

      await expect(service.list("org-1", {})).resolves.toEqual({
        list: rows,
        total: 3,
        totalRecords: 3,
        totalPages: 1,
        currentPage: 1,
        limit: 10,
        hasPrev: false,
        hasNext: false,
      });
      expect(prisma.offer.findMany).toHaveBeenCalledWith({
        where: { AND: [{ organizationId: "org-1" }] },
        skip: 0,
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { items: { include: { product: expect.anything() } } },
      });
      expect(prisma.offer.count).toHaveBeenCalledWith({
        where: { AND: [{ organizationId: "org-1" }] },
      });
    });

    it("pages with the requested page and limit", async () => {
      const { service, prisma } = makeService();

      await service.list("org-1", { page: 3, limit: 25 });

      expect(prisma.offer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 50, take: 25 }),
      );
      expect(prisma.offer.count).toHaveBeenCalledTimes(1);
    });

    it("filters by q on name or slogan, case-insensitive and trimmed", async () => {
      const { service, prisma } = makeService();

      await service.list("org-1", { q: "  navidad  " });

      expect(prisma.offer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: [
              { organizationId: "org-1" },
              {
                OR: [
                  { name: { contains: "navidad", mode: "insensitive" } },
                  { slogan: { contains: "navidad", mode: "insensitive" } },
                ],
              },
            ],
          },
        }),
      );
    });

    it("omits the q filter when it is blank or whitespace-only", async () => {
      const { service, prisma } = makeService();

      await service.list("org-1", { q: "   " });

      expect(prisma.offer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { AND: [{ organizationId: "org-1" }] } }),
      );
    });

    it("floors the page at 1 and clamps the limit like the other lists", async () => {
      const { service, prisma } = makeService();

      await service.list("org-1", { page: 0, limit: 500 });

      expect(prisma.offer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 100 }),
      );
    });
  });

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
