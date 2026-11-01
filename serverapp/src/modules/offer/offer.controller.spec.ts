import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { OfferController } from "./offer.controller";
import { ListOffersQueryDto } from "./dto/offer.dto";

const makeController = () => {
  const offers = {
    list: jest.fn().mockResolvedValue([]),
    listPublic: jest.fn().mockResolvedValue([]),
  };
  const workspaceContext = { getWorkspaceId: jest.fn(() => "org-1") };
  const prisma = { organization: { findUnique: jest.fn() } };
  const controller = new OfferController(
    offers as any,
    workspaceContext as any,
    prisma as any,
  );
  return { controller, offers, prisma, workspaceContext };
};

/** Global role: the requested workspace id is honored without a membership row. */
const adminRequest = () =>
  ({
    user: { id: "u-1", permits: { name: "ADMIN" } },
    headers: {},
  }) as any;

describe("OfferController", () => {
  describe("GET (list, paged envelope)", () => {
    it("forwards page/limit/q to the service for the resolved organization", async () => {
      const { controller, offers } = makeController();
      const envelope = {
        list: [],
        total: 0,
        totalRecords: 0,
        totalPages: 0,
        currentPage: 2,
        limit: 25,
        hasPrev: true,
        hasNext: false,
      };
      offers.list.mockResolvedValue(envelope);

      await expect(
        controller.list(adminRequest(), {
          page: 2,
          limit: 25,
          q: "of",
        } as ListOffersQueryDto),
      ).resolves.toEqual(envelope);
      expect(offers.list).toHaveBeenCalledWith("org-1", {
        page: 2,
        limit: 25,
        q: "of",
      });
    });
  });

  describe("ListOffersQueryDto (same pipe shape as the purchases query)", () => {
    it("transforms the page/limit query strings into numbers", async () => {
      const dto = plainToInstance(ListOffersQueryDto, {
        page: "2",
        limit: "25",
        q: "x",
      });

      await expect(validate(dto)).resolves.toEqual([]);
      expect(dto.page).toBe(2);
      expect(dto.limit).toBe(25);
    });

    it("rejects a page below 1", async () => {
      const dto = plainToInstance(ListOffersQueryDto, { page: "0" });

      await expect(validate(dto)).resolves.not.toEqual([]);
    });
  });

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
