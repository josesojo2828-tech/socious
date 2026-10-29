import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class MarketplaceService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: QueryProductDto) {
    const { search, categoryId, type, status, minPrice, maxPrice, page = 1, limit = 12 } = query;

    const where: Prisma.MarketProductWhereInput = {
      status: status || 'PUBLISHED',
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (type) {
      where.type = type;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    const [products, total] = await Promise.all([
      this.prisma.marketProduct.findMany({
        where,
        include: {
          category: true,
          seller: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
              email: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.marketProduct.count({ where }),
    ]);

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const product = await this.prisma.marketProduct.findUnique({
      where: { id },
      include: {
        category: true,
        seller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            email: true,
          },
        },
        reviews: {
          include: {
            buyer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    return product;
  }

  async create(sellerId: string, dto: CreateProductDto) {
    return this.prisma.marketProduct.create({
      data: {
        ...dto,
        sellerId,
        status: 'PENDING_APPROVAL',
      },
    });
  }

  async update(id: string, sellerId: string, dto: UpdateProductDto) {
    const product = await this.prisma.marketProduct.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    if (product.sellerId !== sellerId) {
      throw new ForbiddenException('No tienes permiso para editar este producto');
    }

    return this.prisma.marketProduct.update({
      where: { id },
      data: dto,
    });
  }

  async findBySeller(sellerId: string) {
    return this.prisma.marketProduct.findMany({
      where: { sellerId },
      include: {
        category: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllAdmin(query: QueryProductDto) {
    const { search, categoryId, type, status, page = 1, limit = 12 } = query;

    const where: Prisma.MarketProductWhereInput = {};

    if (status) {
      where.status = status;
    } else {
      where.status = { not: 'ARCHIVED' };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (type) {
      where.type = type;
    }

    const [products, total] = await Promise.all([
      this.prisma.marketProduct.findMany({
        where,
        include: {
          category: true,
          seller: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.marketProduct.count({ where }),
    ]);

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async approve(id: string) {
    const product = await this.prisma.marketProduct.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    if (product.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('El producto no está pendiente de aprobación');
    }

    return this.prisma.marketProduct.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });
  }

  async reject(id: string) {
    const product = await this.prisma.marketProduct.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    if (product.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('El producto no está pendiente de aprobación');
    }

    return this.prisma.marketProduct.update({
      where: { id },
      data: {
        status: 'REJECTED',
      },
    });
  }

  async findCategories() {
    return this.prisma.marketCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createCategory(data: { name: string; description?: string; icon?: string }) {
    return this.prisma.marketCategory.create({
      data,
    });
  }

  async updateCategory(id: string, data: { name?: string; description?: string; icon?: string; isActive?: boolean }) {
    return this.prisma.marketCategory.update({
      where: { id },
      data,
    });
  }

  async deleteCategory(id: string) {
    return this.prisma.marketCategory.delete({
      where: { id },
    });
  }

  async createReview(productId: string, buyerId: string, rating: number, comment?: string) {
    const product = await this.prisma.marketProduct.findUnique({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    const existingReview = await this.prisma.marketReview.findUnique({
      where: { productId_buyerId: { productId, buyerId } },
    });

    if (existingReview) {
      throw new BadRequestException('Ya existe una reseña para este producto');
    }

    const review = await this.prisma.marketReview.create({
      data: {
        productId,
        buyerId,
        rating,
        comment,
      },
      include: {
        buyer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });

    await this.updateProductRating(productId);

    return review;
  }

  async getReviewsByProduct(productId: string) {
    return this.prisma.marketReview.findMany({
      where: { productId },
      include: {
        buyer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async respondToReview(reviewId: string, sellerId: string, response: string) {
    const review = await this.prisma.marketReview.findUnique({
      where: { id: reviewId },
      include: { product: true },
    });

    if (!review) {
      throw new NotFoundException('Reseña no encontrada');
    }

    if (review.product.sellerId !== sellerId) {
      throw new ForbiddenException('No tienes permiso para responder esta reseña');
    }

    return this.prisma.marketReview.update({
      where: { id: reviewId },
      data: { response },
      include: {
        buyer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async deleteReview(reviewId: string, userId: string, isAdmin: boolean) {
    const review = await this.prisma.marketReview.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Reseña no encontrada');
    }

    if (!isAdmin && review.buyerId !== userId) {
      throw new ForbiddenException('No tienes permiso para eliminar esta reseña');
    }

    const productId = review.productId;

    await this.prisma.marketReview.delete({ where: { id: reviewId } });

    await this.updateProductRating(productId);

    return { message: 'Reseña eliminada correctamente' };
  }

  private async updateProductRating(productId: string) {
    const result = await this.prisma.marketReview.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await this.prisma.marketProduct.update({
      where: { id: productId },
      data: {
        ratingAvg: result._avg.rating ?? 0,
        ratingCount: result._count.rating,
      },
    });
  }

  async getAdminDashboardStats() {
    const [
      totalProducts,
      pendingProducts,
      publishedProducts,
      totalReviews,
    ] = await Promise.all([
      this.prisma.marketProduct.count(),
      this.prisma.marketProduct.count({ where: { status: 'PENDING_APPROVAL' } }),
      this.prisma.marketProduct.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.marketReview.count(),
    ]);

    return {
      totalProducts,
      pendingProducts,
      publishedProducts,
      totalReviews,
    };
  }
}
