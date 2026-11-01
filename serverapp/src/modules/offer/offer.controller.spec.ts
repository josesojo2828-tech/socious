import { OfferController } from "./offer.controller";

const makeController = () => {
  const offers = {
    list: jest.fn().mockResolvedValue([]),
    listPublic: jest.fn().mockResolvedValue([]),
  };
  const prisma = { organization: { findUnique: jest.fn() } };
  const controller = new OfferController(
    offers as any,
    {} as any,
    prisma as any,
  );
  return { controller, offers, prisma };
};

describe("OfferController", () => {
  describe("GET public/:slug (storefront, S11)", () => {
    it("answers with an empty list when the shop slug does not resolve", async () => {
      const { controller, offers, prisma } = makeController();
      prisma.organization.findUnique.mockResolvedValue(null);

      await expect(controller.listPublic("no-existe")).resolves.toEqual({
        list: [],
      });
      expect(prisma.organization.findUnique).toHaveBeenCalledWith({
        where: { slug: "no-existe" },
        select: { id: true, status: true },
      });
      expect(offers.listPublic).not.toHaveBeenCalled();
    });

    it("answers with an empty list when the organization is not ACTIVE", async () => {
      const { controller, offers, prisma } = makeController();
      prisma.organization.findUnique.mockResolvedValue({
        id: "org-1",
        status: "SUSPENDED",
      });

      await expect(controller.listPublic("socius-demo")).resolves.toEqual({
        list: [],
      });
      expect(offers.listPublic).not.toHaveBeenCalled();
    });

    it("returns the active offers of an ACTIVE shop through the service", async () => {
      const { controller, offers, prisma } = makeController();
      prisma.organization.findUnique.mockResolvedValue({
        id: "org-1",
        status: "ACTIVE",
      });
      const row = {
        id: "offer-1",
        name: "Oferta smoke",
        slogan: null,
        bannerKey: null,
        expiresAt: new Date("2026-12-31T00:00:00.000Z"),
        discountPercent: 10,
        _count: { items: 1 },
      };
      offers.listPublic.mockResolvedValue([row]);

      await expect(controller.listPublic("socius-demo")).resolves.toEqual({
        list: [row],
      });
      expect(offers.listPublic).toHaveBeenCalledWith("org-1");
    });
  });
});
