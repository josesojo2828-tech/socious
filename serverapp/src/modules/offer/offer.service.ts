import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import { CreateOfferDto, UpdateOfferDto } from "./dto/offer.dto";

const PRODUCT_SELECT = { select: { id: true, name: true, sku: true } } as const;

/**
 * Promotional offers (S9, Avanzado+): name, slogan, banner and an expiry
 * date over an explicit set of products. No price math in v1 — the offer is
 * content that the storefront will show (S11 follow-up).
 */
@Injectable()
export class OfferService {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string) {
    return this.prisma.offer.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      include: { items: { include: { product: PRODUCT_SELECT } } },
    });
  }

  async getOne(organizationId: string, id: string) {
    const offer = await this.prisma.offer.findFirst({
      where: { id, organizationId },
      include: { items: { include: { product: PRODUCT_SELECT } } },
    });
    if (!offer) throw new NotFoundException("Oferta no encontrada.");
    return offer;
  }

  private async assertProducts(organizationId: string, productIds: string[]) {
    const unique = [...new Set(productIds)];
    const found = await this.prisma.product.count({
      where: { id: { in: unique }, organizationId, deletedAt: null },
    });
    if (found !== unique.length) {
      throw new BadRequestException(
        "Algunos productos no existen en tu catálogo.",
      );
    }
    return unique;
  }

  async create(organizationId: string, dto: CreateOfferDto) {
    const productIds = await this.assertProducts(organizationId, dto.items);
    return this.prisma.offer.create({
      data: {
        organizationId,
        name: dto.name.trim(),
        slogan: dto.slogan?.trim() || null,
        bannerKey: dto.bannerKey?.trim() || null,
        expiresAt: new Date(dto.expiresAt),
        items: { create: productIds.map((productId) => ({ productId })) },
      },
      include: { items: { include: { product: PRODUCT_SELECT } } },
    });
  }

  async update(organizationId: string, id: string, dto: UpdateOfferDto) {
    await this.getOne(organizationId, id);
    const productIds =
      dto.items !== undefined
        ? await this.assertProducts(organizationId, dto.items)
        : null;

    return this.prisma.$transaction(async (tx) => {
      if (productIds) {
        await tx.offerProduct.deleteMany({ where: { offerId: id } });
        await tx.offerProduct.createMany({
          data: productIds.map((productId) => ({ offerId: id, productId })),
        });
      }
      return tx.offer.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name.trim() }),
          ...(dto.slogan !== undefined && { slogan: dto.slogan?.trim() || null }),
          ...(dto.bannerKey !== undefined && {
            bannerKey: dto.bannerKey?.trim() || null,
          }),
          ...(dto.expiresAt !== undefined && {
            expiresAt: new Date(dto.expiresAt),
          }),
          ...(dto.active !== undefined && { active: dto.active }),
        },
        include: { items: { include: { product: PRODUCT_SELECT } } },
      });
    });
  }

  async remove(organizationId: string, id: string) {
    await this.getOne(organizationId, id);
    await this.prisma.offer.delete({ where: { id } });
    return { deleted: true };
  }
}
