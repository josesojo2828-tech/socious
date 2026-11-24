import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import { CreateMeatCarcassDto, UpdateMeatCarcassDto } from "./dto/meat-carcass.dto";

@Injectable()
export class MeatCarcassService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string) {
    return this.prisma.meatCarcass.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        code: true,
        defaultCostUSD: true,
        lastCostUSD: true,
        lastProcessedAt: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findOne(organizationId: string, id: string) {
    const carcass = await this.prisma.meatCarcass.findFirst({
      where: { id, organizationId },
    });
    if (!carcass) {
      throw new NotFoundException("Pieza o animal no encontrado.");
    }
    return carcass;
  }

  async create(organizationId: string, dto: CreateMeatCarcassDto) {
    const existing = await this.prisma.meatCarcass.findFirst({
      where: { organizationId, name: dto.name.trim() },
    });
    if (existing) {
      throw new ConflictException(`Ya existe una pieza con el nombre "${dto.name}".`);
    }

    return this.prisma.meatCarcass.create({
      data: {
        organizationId,
        name: dto.name.trim(),
        code: dto.code?.trim() || null,
        defaultCostUSD: dto.defaultCostUSD ?? 0,
      },
    });
  }

  async update(organizationId: string, id: string, dto: UpdateMeatCarcassDto) {
    await this.findOne(organizationId, id);

    if (dto.name) {
      const duplicate = await this.prisma.meatCarcass.findFirst({
        where: {
          organizationId,
          name: dto.name.trim(),
          NOT: { id },
        },
      });
      if (duplicate) {
        throw new ConflictException(`Ya existe otra pieza con el nombre "${dto.name}".`);
      }
    }

    return this.prisma.meatCarcass.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.code !== undefined ? { code: dto.code?.trim() || null } : {}),
        ...(dto.defaultCostUSD !== undefined ? { defaultCostUSD: dto.defaultCostUSD } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
    });
  }

  async delete(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    return this.prisma.meatCarcass.delete({
      where: { id },
    });
  }

  /**
   * S5: Memoria de última compra y despiece.
   * Devuelve los datos de la última compra de esta pieza, incluyendo los cortes
   * y sus costos para precargar como plantilla.
   */
  async getLastDeconstruction(organizationId: string, carcassId: string) {
    const lastOrder = await this.prisma.meatDeconstructionOrder.findFirst({
      where: { organizationId, carcassId },
      orderBy: { processedAt: "desc" },
      include: {
        supplier: {
          select: { id: true, name: true },
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
                stock: true,
              },
            },
          },
        },
      },
    });

    return lastOrder;
  }
}
