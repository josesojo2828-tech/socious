import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import {
  CreateProductSizeDto,
  UpdateProductSizeDto,
} from "./dto/product-size.dto";

/** Read-only clothing sizes every tenant sees; each tenant adds its own. */
const SYSTEM_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "Único"];

/**
 * Size catalog (tallas): system rows are shared and read-only, tenant rows are
 * a normal CRUD. A presentation keeps the label it was saved with, so renaming
 * or deleting a size never rewrites history.
 */
@Injectable()
export class ProductSizeService implements OnModuleInit {
  private readonly logger = new Logger(ProductSizeService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.ensureSystemDefaults();
  }

  /** Idempotent: re-running never duplicates the system catalog. */
  async ensureSystemDefaults(): Promise<void> {
    for (const [index, label] of SYSTEM_SIZES.entries()) {
      const existing = await this.prisma.productSize.findFirst({
        where: { organizationId: null, label },
        select: { id: true },
      });
      if (!existing) {
        await this.prisma.productSize.create({
          data: { label, organizationId: null, sortOrder: index },
        });
      }
    }
    this.logger.log("System sizes ready");
  }

  async list(organizationId: string | null) {
    return this.prisma.productSize.findMany({
      where: organizationId
        ? { OR: [{ organizationId: null }, { organizationId }] }
        : { organizationId: null },
      orderBy: [{ organizationId: "asc" }, { sortOrder: "asc" }, { label: "asc" }],
    });
  }

  async create(organizationId: string, dto: CreateProductSizeDto) {
    const label = dto.label.trim();
    if (!label) throw new BadRequestException("La talla es obligatoria.");

    const duplicate = await this.prisma.productSize.findFirst({
      where: { organizationId, label },
      select: { id: true },
    });
    if (duplicate) {
      throw new BadRequestException(`Ya existe una talla "${label}".`);
    }

    return this.prisma.productSize.create({
      data: { organizationId, label, sortOrder: dto.sortOrder ?? 0 },
    });
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateProductSizeDto,
  ) {
    const size = await this.prisma.productSize.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });
    if (!size) throw new NotFoundException("Talla no encontrada.");

    const label = dto.label?.trim();
    if (label === "") {
      throw new BadRequestException("La talla no puede quedar vacía.");
    }
    if (label !== undefined) {
      const duplicate = await this.prisma.productSize.findFirst({
        where: { organizationId, label, id: { not: id } },
        select: { id: true },
      });
      if (duplicate) {
        throw new BadRequestException(`Ya existe una talla "${label}".`);
      }
    }

    return this.prisma.productSize.update({
      where: { id },
      data: {
        ...(label !== undefined ? { label } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
    });
  }

  async remove(organizationId: string, id: string) {
    const size = await this.prisma.productSize.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });
    if (!size) throw new NotFoundException("Talla no encontrada.");
    await this.prisma.productSize.delete({ where: { id } });
    return { deleted: true };
  }
}
