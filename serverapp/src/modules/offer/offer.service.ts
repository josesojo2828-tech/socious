import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import type { Prisma } from "@prisma/client";
import {
  CreateOfferDto,
  ListOffersQueryDto,
  UpdateOfferDto,
} from "./dto/offer.dto";

const PRODUCT_SELECT = { select: { id: true, name: true, sku: true } } as const;

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

/**
 * Promotional offers (S9, Avanzado+): name, slogan, banner and an expiry
 * date over an explicit set of products. No price math in v1 — the offer is
 * content that the storefront will show (S11 follow-up).
 */
@Injectable()
export class OfferService {
  constructor(private readonly prisma: PrismaService) {}

  /** Admin list: same paged envelope as products/purchases (`page`+`limit`). */
  async list(organizationId: string, query: ListOffersQueryDto = {}) {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(Math.max(query.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);

    const filters: Prisma.OfferWhereInput[] = [{ organizationId }];
    if (query.q?.trim()) {
      const q = query.q.trim();
      filters.push({
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { slogan: { contains: q, mode: "insensitive" } },
        ],
      });
    }

    const where: Prisma.OfferWhereInput = { AND: filters };
    const [list, total] = await Promise.all([
      this.prisma.offer.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { items: { include: { product: PRODUCT_SELECT } } },
      }),
      this.prisma.offer.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      list,
      total,
      totalRecords: total,
      totalPages,
      currentPage: page,
      limit,
      hasPrev: page > 1,
      hasNext: page < totalPages,
    };
  }

  /**
   * Storefront feed (S11): only offers the visitor may still see — active,
   * unexpired, soonest deadline first — with just the display fields the
   * shop renders plus how many products each offer covers.
   */
  listPublic(organizationId: string) {
    return this.prisma.offer.findMany({
      where: {
        organizationId,
        active: true,
        expiresAt: { gte: new Date() },
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
        discountPercent: Math.min(100, Math.max(0, Math.round(dto.discountPercent ?? 0))),
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
          ...(dto.discountPercent !== undefined && {
            discountPercent: Math.min(
              100,
              Math.max(0, Math.round(dto.discountPercent)),
            ),
          }),
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
