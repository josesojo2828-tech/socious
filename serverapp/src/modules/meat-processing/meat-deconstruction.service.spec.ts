import { BadRequestException, NotFoundException } from "@nestjs/common";
import { MeatDeconstructionService } from "./meat-deconstruction.service";

describe("MeatDeconstructionService", () => {
  let service: MeatDeconstructionService;
  let prisma: any;
  let sequenceService: any;
  let tx: any;

  beforeEach(() => {
    tx = {
      meatCarcass: {
        findFirst: jest.fn().mockResolvedValue({ id: "c-1", name: "Cochino en canal" }),
        update: jest.fn().mockResolvedValue({}),
      },
      meatDeconstructionOrder: {
        create: jest.fn().mockImplementation(({ data }: any) => ({
          id: "ord-1",
          ...data,
        })),
      },
      product: {
        findFirst: jest.fn().mockImplementation(({ where }: any) => ({
          id: where.id,
          name: "Corte Carne",
          stock: 10.0,
          costPriceUSD: 2.0,
        })),
        update: jest.fn().mockResolvedValue({}),
      },
      stockMovement: {
        create: jest.fn().mockResolvedValue({}),
      },
    };

    prisma = {
      $transaction: jest.fn().mockImplementation(async (cb) => cb(tx)),
      meatDeconstructionOrder: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
      },
    };

    sequenceService = {
      nextFormatted: jest.fn().mockResolvedValue("DSP-00001"),
    };

    service = new MeatDeconstructionService(prisma, sequenceService);
  });

  describe("create (S3, S4, S5)", () => {
    it("valida que el peso de entrada sea positivo", async () => {
      await expect(
        service.create("org-1", "user-1", {
          incomingWeightKg: 0,
          unitCostUSD: 3.0,
          items: [{ productId: "p-1", quantityKg: 10, unitCostUSD: 4 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("valida que haya al menos un corte en el despiece", async () => {
      await expect(
        service.create("org-1", "user-1", {
          incomingWeightKg: 80,
          unitCostUSD: 3.0,
          items: [],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("calcula masa, merma y costo total correctamente e impacta stock", async () => {
      const payload = {
        carcassId: "c-1",
        incomingWeightKg: 80.0,
        unitCostUSD: 3.0, // Total = $240.00
        notes: "Cochino lote granja 4",
        items: [
          { productId: "p-chuleta", quantityKg: 20.0, unitCostUSD: 4.5 },
          { productId: "p-costilla", quantityKg: 10.0, unitCostUSD: 5.0 },
          { productId: "p-pernil", quantityKg: 25.0, unitCostUSD: 4.0 },
          { productId: "p-hueso", quantityKg: 20.0, unitCostUSD: 0.5 },
        ],
      };

      const result = await service.create("org-1", "user-1", payload);

      // Verificación de cálculos
      expect(result.orderNumber).toBe("DSP-00001");
      expect(result.incomingWeightKg).toBe(80.0);
      expect(result.unitCostUSD).toBe(3.0);
      expect(result.totalCostUSD).toBe(240.0);
      expect(result.yieldWeightKg).toBe(75.0); // 20 + 10 + 25 + 20
      expect(result.wasteWeightKg).toBe(5.0); // 80 - 75
      expect(result.wastePercentage).toBe(6.25); // (5 / 80) * 100

      // Verificación de impacto en cada producto
      expect(tx.product.update).toHaveBeenCalledTimes(4);
      expect(tx.stockMovement.create).toHaveBeenCalledTimes(4);

      // Verificación del movimiento de stock (Kardex)
      expect(tx.stockMovement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: "IN",
          productId: "p-chuleta",
          quantity: 20.0,
          unitCostUSD: 4.5,
          previousStock: 10.0,
          newStock: 30.0,
          reference: "DSP-00001",
        }),
      });

      // Verificación de actualización de la pieza (memoria S5)
      expect(tx.meatCarcass.update).toHaveBeenCalledWith({
        where: { id: "c-1" },
        data: expect.objectContaining({
          lastCostUSD: 3.0,
        }),
      });
    });

    it("falla si un producto corte no existe en la organización", async () => {
      tx.product.findFirst.mockResolvedValue(null);

      await expect(
        service.create("org-1", "user-1", {
          incomingWeightKg: 80,
          unitCostUSD: 3.0,
          items: [{ productId: "p-inexistente", quantityKg: 20, unitCostUSD: 4.5 }],
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
