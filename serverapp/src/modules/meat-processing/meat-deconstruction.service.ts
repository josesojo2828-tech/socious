import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import { SequenceService } from "src/shared/services/sequence.service";
import { CreateMeatDeconstructionDto } from "./dto/meat-deconstruction.dto";

@Injectable()
export class MeatDeconstructionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sequenceService: SequenceService,
  ) {}

  async create(
    organizationId: string,
    userId: string,
    dto: CreateMeatDeconstructionDto,
  ) {
    const incomingWeight = Number(dto.incomingWeightKg);
    const unitCost = Number(dto.unitCostUSD);

    if (incomingWeight <= 0) {
      throw new BadRequestException("El peso recibido debe ser mayor a 0 kg.");
    }
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException("Debe registrar al menos un corte obtenido.");
    }

    const totalCostUSD = Number((incomingWeight * unitCost).toFixed(2));
    const yieldWeightKg = Number(
      dto.items.reduce((acc, it) => acc + Number(it.quantityKg), 0).toFixed(2),
    );
    const wasteWeightKg = Number(
      Math.max(0, incomingWeight - yieldWeightKg).toFixed(2),
    );
    const wastePercentage =
      incomingWeight > 0
        ? Number(((wasteWeightKg / incomingWeight) * 100).toFixed(2))
        : 0;

    return this.prisma.$transaction(async (tx) => {
      const orderNumber = await this.sequenceService.nextFormatted(
        "MEAT_DECONSTRUCTION",
        organizationId,
        "DSP",
        5,
        tx,
      );

      let carcassName = "Canal";
      if (dto.carcassId) {
        const carcass = await tx.meatCarcass.findFirst({
          where: { id: dto.carcassId, organizationId },
        });
        if (carcass) {
          carcassName = carcass.name;
          await tx.meatCarcass.update({
            where: { id: carcass.id },
            data: {
              lastCostUSD: unitCost,
              lastProcessedAt: dto.processedAt
                ? new Date(dto.processedAt)
                : new Date(),
            },
          });
        }
      }

      const order = await tx.meatDeconstructionOrder.create({
        data: {
          orderNumber,
          organizationId,
          carcassId: dto.carcassId || null,
          supplierId: dto.supplierId || null,
          createdById: userId,
          incomingWeightKg: incomingWeight,
          unitCostUSD: unitCost,
          totalCostUSD,
          yieldWeightKg,
          wasteWeightKg,
          wastePercentage,
          notes: dto.notes?.trim() || null,
          processedAt: dto.processedAt
            ? new Date(dto.processedAt)
            : new Date(),
          items: {
            create: dto.items.map((it) => {
              const lineQty = Number(it.quantityKg);
              const lineUnitCost = Number(it.unitCostUSD);
              const lineTotal =
                it.totalCostUSD !== undefined
                  ? Number(it.totalCostUSD)
                  : Number((lineQty * lineUnitCost).toFixed(2));
              return {
                productId: it.productId,
                quantityKg: lineQty,
                unitCostUSD: lineUnitCost,
                totalCostUSD: lineTotal,
                isByProduct: it.isByProduct ?? false,
              };
            }),
          },
        },
        include: {
          carcass: true,
          supplier: {
            select: { id: true, name: true, taxId: true },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  unit: true,
                  salePriceUSD: true,
                },
              },
            },
          },
        },
      });

      // Actualizar Kardex e inventario de cada corte
      for (const it of dto.items) {
        const product = await tx.product.findFirst({
          where: { id: it.productId, organizationId },
          select: { id: true, stock: true, costPriceUSD: true, name: true },
        });
        if (!product) {
          throw new NotFoundException(
            `El producto corte con ID "${it.productId}" no pertenece a la organización o no existe.`,
          );
        }

        const prevStock = Number(product.stock);
        const addedQty = Number(it.quantityKg);
        const newStock = Number((prevStock + addedQty).toFixed(2));
        const itemUnitCost = Number(it.unitCostUSD);

        await tx.product.update({
          where: { id: product.id },
          data: {
            stock: newStock,
            costPriceUSD: itemUnitCost,
          },
        });

        await tx.stockMovement.create({
          data: {
            productId: product.id,
            organizationId,
            createdById: userId,
            type: "IN",
            quantity: addedQty,
            unitCostUSD: itemUnitCost,
            previousStock: prevStock,
            newStock,
            reference: orderNumber,
            notes: `Despiece ${orderNumber} (${carcassName})`,
          },
        });
      }

      return order;
    });
  }

  async findAll(
    organizationId: string,
    query: { page?: number; limit?: number; q?: string },
  ) {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit || 20)));
    const skip = (page - 1) * limit;

    const where: any = { organizationId };

    if (query.q?.trim()) {
      const search = query.q.trim();
      where.OR = [
        { orderNumber: { contains: search, mode: "insensitive" } },
        { notes: { contains: search, mode: "insensitive" } },
        { carcass: { name: { contains: search, mode: "insensitive" } } },
        { supplier: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [list, total] = await Promise.all([
      this.prisma.meatDeconstructionOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { processedAt: "desc" },
        include: {
          carcass: {
            select: { id: true, name: true, code: true },
          },
          supplier: {
            select: { id: true, name: true },
          },
          _count: {
            select: { items: true },
          },
        },
      }),
      this.prisma.meatDeconstructionOrder.count({ where }),
    ]);

    return { list, total, page, limit };
  }

  async findOne(organizationId: string, id: string) {
    const order = await this.prisma.meatDeconstructionOrder.findFirst({
      where: { id, organizationId },
      include: {
        carcass: true,
        supplier: true,
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                unit: true,
                salePriceUSD: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException("Orden de despiece no encontrada.");
    }

    return order;
  }
}
