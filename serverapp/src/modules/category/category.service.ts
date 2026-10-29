import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import type { Category, Prisma } from "@prisma/client";
import { CreateCategoryDto, UpdateCategoryDto } from "./dto/category.dto";

export interface CategoryScope {
  /** Effective organization; null = personal context. */
  organizationId: string | null;
  /** Only a platform admin may touch the system catalog. */
  isSuperadmin: boolean;
}

export interface CategoryNode extends Category {
  subCategories: CategoryNode[];
}

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/**
 * Category tree (S5).
 *
 * The system catalog (`isSystem`, `organizationId = null`) is seeded per
 * platform and is READ-ONLY for tenants: only a SUPERADMIN can create, edit or
 * delete it. A tenant may additionally own private categories inside its own
 * organization.
 */
@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  private visibleWhere(organizationId: string | null): Prisma.CategoryWhereInput {
    return {
      deletedAt: null,
      OR: organizationId
        ? [{ organizationId: null }, { organizationId }]
        : [{ organizationId: null }],
    };
  }

  async listTree(organizationId: string | null): Promise<CategoryNode[]> {
    const categories = await this.prisma.category.findMany({
      where: this.visibleWhere(organizationId),
      orderBy: { name: "asc" },
    });

    const byId = new Map<string, CategoryNode>();
    for (const category of categories) {
      byId.set(category.id, { ...category, subCategories: [] });
    }

    const roots: CategoryNode[] = [];
    for (const category of categories) {
      const node = byId.get(category.id)!;
      if (category.parentId && byId.has(category.parentId)) {
        byId.get(category.parentId)!.subCategories.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  async getOne(organizationId: string | null, id: string) {
    const category = await this.prisma.category.findFirst({
      where: {
        id,
        ...this.visibleWhere(organizationId),
      },
    });

    if (!category) throw new NotFoundException("Categoría no encontrada.");
    return category;
  }

  /**
   * Creates a category. A tenant-owned category always carries its own
   * organization; only a SUPERADMIN can create one in the system catalog.
   */
  async create(scope: CategoryScope, data: CreateCategoryDto) {
    if (scope.isSuperadmin && scope.organizationId === null) {
      return this.createSystemCategory(data);
    }

    return this.createTenantCategory(scope, data);
  }

  private async createSystemCategory(data: CreateCategoryDto) {
    const slug = data.slug ?? slugify(data.name);
    await this.assertSlugAvailable(slug, null);

    if (data.parentId) {
      const parent = await this.prisma.category.findFirst({
        where: { id: data.parentId, organizationId: null, deletedAt: null },
      });
      if (!parent) {
        throw new NotFoundException(
          "La categoría padre no existe en el catálogo del sistema.",
        );
      }
    }

    return this.prisma.category.create({
      data: {
        name: data.name.trim(),
        slug,
        icon: data.icon?.trim() || null,
        description: data.description?.trim() || null,
        parentId: data.parentId ?? null,
        isSystem: true,
        organizationId: null,
      },
    });
  }

  private async createTenantCategory(
    scope: CategoryScope,
    data: CreateCategoryDto,
  ) {
    if (!scope.organizationId) {
      throw new ForbiddenException(
        "Crea una organización para agregar categorías propias.",
      );
    }

    const slug = data.slug ?? slugify(data.name);
    await this.assertSlugAvailable(slug, scope.organizationId);

    if (data.parentId) {
      const parent = await this.prisma.category.findFirst({
        where: {
          id: data.parentId,
          deletedAt: null,
          OR: [{ organizationId: null }, { organizationId: scope.organizationId }],
        },
      });
      if (!parent) {
        throw new NotFoundException("La categoría padre no existe.");
      }
    }

    return this.prisma.category.create({
      data: {
        name: data.name.trim(),
        slug,
        icon: data.icon?.trim() || null,
        description: data.description?.trim() || null,
        parentId: data.parentId ?? null,
        isSystem: false,
        organizationId: scope.organizationId,
      },
    });
  }

  async update(scope: CategoryScope, id: string, data: UpdateCategoryDto) {
    const category = await this.getOne(scope.organizationId, id);
    this.assertMayEdit(scope, category);

    if (data.slug && data.slug !== category.slug) {
      await this.assertSlugAvailable(data.slug, category.organizationId, id);
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.icon !== undefined && { icon: data.icon?.trim() || null }),
        ...(data.description !== undefined && {
          description: data.description?.trim() || null,
        }),
      },
    });
  }

  async remove(scope: CategoryScope, id: string) {
    const category = await this.getOne(scope.organizationId, id);
    this.assertMayEdit(scope, category);

    const [children, products] = await Promise.all([
      this.prisma.category.count({
        where: { parentId: id, deletedAt: null },
      }),
      this.prisma.product.count({ where: { categoryId: id, deletedAt: null } }),
    ]);

    if (children > 0) {
      throw new ConflictException(
        "La categoría tiene subcategorías: elimínalas primero.",
      );
    }
    if (products > 0) {
      throw new ConflictException(
        "La categoría tiene productos asignados.",
      );
    }

    await this.prisma.category.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { id, deleted: true };
  }

  /**
   * The rule from S5: a tenant NEVER edits the platform catalog, only its own
   * categories. A SUPERADMIN may edit anything.
   */
  private assertMayEdit(
    scope: CategoryScope,
    category: Category,
  ): void {
    if (scope.isSuperadmin) return;

    if (category.isSystem || category.organizationId === null) {
      throw new ForbiddenException(
        "Las categorías del sistema solo las administra la plataforma.",
      );
    }

    if (category.organizationId !== scope.organizationId) {
      throw new ForbiddenException(
        "No puedes modificar categorías de otro negocio.",
      );
    }
  }

  private async assertSlugAvailable(
    slug: string,
    organizationId: string | null,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.prisma.category.findFirst({
      where: {
        slug,
        organizationId,
        deletedAt: null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(`Ya existe una categoría con el slug "${slug}".`);
    }
  }
}
