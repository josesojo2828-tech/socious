import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import { Prisma } from "@prisma/client";
import { TenantSettingsService } from "src/shared/services/tenant-settings.service";
import {
  CreatePresentationDto,
  DecomposeDto,
  UpdatePresentationDto,
} from "./dto/presentation.dto";

/**
 * Product presentations (S4, AVANZADO+): named variants with an independent
 * stock. Decomposition moves bulk quantity from the product into a
 * presentation — kilos into gram bags — under a negative-stock guard.
 */
@Injectable()
export class PresentationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantSettings: TenantSettingsService,
  ) {}

  private async assertProduct(organizationId: string | null, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, organizationId, deletedAt: null },
      select: { id: true, stock: true },
    });
    if (!product) throw new NotFoundException("Producto no encontrado.");
    return product;
  }

  async list(organizationId: string | null, productId: string) {
    await this.assertProduct(organizationId, productId);
    return this.prisma.productPresentation.findMany({
      where: { productId },
      orderBy: { name: "asc" },
      include: { images: { orderBy: { position: "asc" } } },
    });
  }

  async create(
    organizationId: string,
    productId: string,
    dto: CreatePresentationDto,
  ) {
    await this.assertProduct(organizationId, productId);
    return this.prisma.productPresentation.create({
      data: {
        productId,
        organizationId,
        name: dto.name.trim(),
        sku: dto.sku?.trim() || null,
        barcode: dto.barcode?.trim() || null,
        color: dto.color?.trim() || null,
        measures: dto.measures?.trim() || null,
        unit: dto.unit?.trim() || "UND",
        stock: dto.stock ?? 0,
        minStock: dto.minStock ?? 0,
        salePriceUSD: dto.salePriceUSD ?? null,
      },
    });
  }

  private async ownPresentation(organizationId: string | null, id: string) {
    const presentation = await this.prisma.productPresentation.findFirst({
      where: { id },
      include: { product: { select: { organizationId: true, deletedAt: true } } },
    });
    if (!presentation || presentation.product.deletedAt) {
      throw new NotFoundException("Presentación no encontrada.");
    }
    if (presentation.product.organizationId !== organizationId) {
      throw new NotFoundException("Presentación no encontrada.");
    }
    return presentation;
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdatePresentationDto,
  ) {
    await this.ownPresentation(organizationId, id);
    return this.prisma.productPresentation.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.sku !== undefined ? { sku: dto.sku?.trim() || null } : {}),
        ...(dto.barcode !== undefined
          ? { barcode: dto.barcode?.trim() || null }
          : {}),
        ...(dto.color !== undefined ? { color: dto.color?.trim() || null } : {}),
        ...(dto.measures !== undefined
          ? { measures: dto.measures?.trim() || null }
          : {}),
        ...(dto.unit !== undefined ? { unit: dto.unit.trim() } : {}),
        ...(dto.minStock !== undefined ? { minStock: dto.minStock } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
        // null clears the own price so the presentation inherits again.
        ...(dto.salePriceUSD !== undefined
          ? { salePriceUSD: dto.salePriceUSD }
          : {}),
      },
    });
  }

  async remove(organizationId: string, id: string) {
    await this.ownPresentation(organizationId, id);
    await this.prisma.productPresentation.delete({ where: { id } });
    return { deleted: true };
  }

  /**
   * Bulk → presentation: subtracts from the product stock and credits the
   * presentation, atomically, refusing to go negative.
   */
  async decompose(
    organizationId: string,
    productId: string,
    dto: DecomposeDto,
  ) {
    const product = await this.assertProduct(organizationId, productId);
    const presentation = await this.prisma.productPresentation.findFirst({
      where: { id: dto.presentationId, productId },
      select: { id: true },
    });
    if (!presentation) {
      throw new NotFoundException("Presentación no encontrada en este producto.");
    }

    const quantity = new Prisma.Decimal(dto.quantity);
    if (product.stock.lessThan(quantity)) {
      throw new BadRequestException(
        `Stock insuficiente: tenés ${product.stock.toString()} y querés descomponer ${quantity.toString()}.`,
      );
    }

    const [, updated] = await this.prisma.$transaction([
      this.prisma.product.update({
        where: { id: productId },
        data: { stock: { decrement: quantity } },
      }),
      this.prisma.productPresentation.update({
        where: { id: dto.presentationId },
        data: { stock: { increment: quantity } },
      }),
    ]);
    return updated;
  }

  // ---- Imágenes por variante (S8): límite por plan ----

  async addImage(
    organizationId: string,
    presentationId: string,
    key: string,
  ) {
    const presentation = await this.prisma.productPresentation.findFirst({
      where: { id: presentationId },
      select: { id: true },
    });
    if (!presentation) throw new NotFoundException("Presentación no encontrada.");
    const existing = await this.prisma.presentationImage.count({
      where: { presentationId },
    });
    const limits = await this.tenantSettings.imageLimits(organizationId);
    if (existing >= limits.variant) {
      throw new BadRequestException(
        `Tu plan permite ${limits.variant} imagen(es) por variante.`,
      );
    }
    return this.prisma.presentationImage.create({
      data: { presentationId, key, position: existing },
    });
  }

  async removeImage(organizationId: string, imageId: string) {
    const image = await this.prisma.presentationImage.findFirst({
      where: { id: imageId },
      include: {
        presentation: {
          include: { product: { select: { organizationId: true } } },
        },
      },
    });
    if (!image || image.presentation.product.organizationId !== organizationId) {
      throw new NotFoundException("Imagen no encontrada.");
    }
    await this.prisma.presentationImage.delete({ where: { id: imageId } });
    return { deleted: true };
  }
}
