import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import { CreateModuleDto, UpdateModuleDto } from "../dto/module.dto";

/**
 * Catalog CRUD for the `Module` entity (design D1).
 *
 * `key` is the stable machine key consumed by the resolver, the sidebar and the
 * dashboard registry; it is immutable after creation. Deactivation is a soft
 * `active=false` (there is no `deletedAt` on `Module`) so existing grants are
 * preserved.
 */
@Injectable()
export class ModuleService {
  constructor(private readonly prisma: PrismaService) {}

  list({ includeInactive = false }: { includeInactive?: boolean } = {}) {
    return this.prisma.module.findMany({
      where: includeInactive ? undefined : { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }

  listActive() {
    return this.list();
  }

  findById(id: string) {
    return this.prisma.module.findUnique({ where: { id } });
  }

  findByKey(key: string) {
    return this.prisma.module.findUnique({ where: { key } });
  }

  async requireByKey(key: string) {
    const module = await this.findByKey(key);
    if (!module) {
      throw new NotFoundException(`Módulo "${key}" no encontrado`);
    }
    return module;
  }

  create(dto: CreateModuleDto) {
    return this.prisma.module.create({
      data: {
        key: dto.key,
        name: dto.name,
        description: dto.description ?? null,
        icon: dto.icon ?? null,
        category: dto.category ?? null,
        scopes: dto.scopes,
        operatorPermit: dto.operatorPermit ?? null,
        dashboardKind: dto.dashboardKind ?? null,
        active: dto.active ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async update(id: string, dto: UpdateModuleDto) {
    await this.requireById(id);
    return this.prisma.module.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        icon: dto.icon,
        category: dto.category,
        scopes: dto.scopes,
        operatorPermit: dto.operatorPermit,
        dashboardKind: dto.dashboardKind,
        active: dto.active,
        sortOrder: dto.sortOrder,
      },
    });
  }

  async setActive(id: string, active: boolean) {
    await this.requireById(id);
    return this.prisma.module.update({ where: { id }, data: { active } });
  }

  private async requireById(id: string) {
    const module = await this.findById(id);
    if (!module) {
      throw new NotFoundException(`Módulo "${id}" no encontrado`);
    }
    return module;
  }
}
