import { ConflictException, NotFoundException } from "@nestjs/common";
import { MeatCarcassService } from "./meat-carcass.service";

describe("MeatCarcassService", () => {
  let service: MeatCarcassService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      meatCarcass: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      meatDeconstructionOrder: {
        findFirst: jest.fn(),
      },
    };
    service = new MeatCarcassService(prisma);
  });

  describe("findAll", () => {
    it("retorna las piezas de la organización", async () => {
      prisma.meatCarcass.findMany.mockResolvedValue([
        { id: "c-1", name: "Cochino en canal", defaultCostUSD: 2.8 },
      ]);

      const result = await service.findAll("org-1");
      expect(prisma.meatCarcass.findMany).toHaveBeenCalledWith({
        where: { organizationId: "org-1" },
        orderBy: { name: "asc" },
        select: expect.any(Object),
      });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Cochino en canal");
    });
  });

  describe("create", () => {
    it("crea una pieza si no existe duplicado", async () => {
      prisma.meatCarcass.findFirst.mockResolvedValue(null);
      prisma.meatCarcass.create.mockResolvedValue({
        id: "c-1",
        organizationId: "org-1",
        name: "Media res",
        defaultCostUSD: 4.5,
      });

      const result = await service.create("org-1", {
        name: "Media res",
        defaultCostUSD: 4.5,
      });

      expect(result.name).toBe("Media res");
      expect(prisma.meatCarcass.create).toHaveBeenCalled();
    });

    it("lanza conflicto si ya existe el nombre", async () => {
      prisma.meatCarcass.findFirst.mockResolvedValue({ id: "c-1", name: "Media res" });

      await expect(
        service.create("org-1", { name: "Media res" }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("getLastDeconstruction (S5)", () => {
    it("retorna el último despiece procesado para la pieza", async () => {
      prisma.meatDeconstructionOrder.findFirst.mockResolvedValue({
        id: "ord-1",
        orderNumber: "DSP-00001",
        incomingWeightKg: 85,
        unitCostUSD: 3.0,
        wastePercentage: 4.5,
        items: [
          { productId: "p-1", quantityKg: 20, unitCostUSD: 4.0 },
        ],
      });

      const result = await service.getLastDeconstruction("org-1", "c-1");
      expect(result?.orderNumber).toBe("DSP-00001");
      expect(prisma.meatDeconstructionOrder.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: "org-1", carcassId: "c-1" },
          orderBy: { processedAt: "desc" },
        }),
      );
    });
  });
});
