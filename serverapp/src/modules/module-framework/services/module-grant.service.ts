import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import { EntitlementService } from "src/modules/permit/service/entitlement.service";
import {
  AssignModuleGrantDto,
  ListModuleGrantsQueryDto,
} from "../dto/module-grant.dto";
import { ModuleService } from "./module.service";

// Pure `vigente` predicate lives in a dependency-free util so the
// `entitlement-resolver` can reuse it without a circular import. Re-exported
// here to keep the public API stable (stats + unit specs import it from here).
export { vigente } from "../util/vigente.util";

/**
 * Owner-scoped CRUD for `ModuleGrant` (design D5).
 *
 * Only MANUAL assignments are materialized here (PLAN/ADDON modules keep being
 * derived by the entitlement resolver). Assignment is idempotent: an existing
 * owner+module grant is REACTIVATED instead of duplicated — the DB enforces
 * uniqueness with partial indexes Prisma cannot model (see migration
 * `20261003_add_module_framework`). Revocation is a soft `REVOKED`.
 *
 * Every mutation invalidates the owner's resolved-entitlement cache so the
 * change is visible immediately.
 */
@Injectable()
export class ModuleGrantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly modules: ModuleService,
    private readonly entitlements: EntitlementService,
  ) {}

  list(query: ListModuleGrantsQueryDto = {}) {
    const where: {
      userId?: string;
      organizationId?: string | null;
    } = {};
    if (query.userId) where.userId = query.userId;
    if (query.organizationId) where.organizationId = query.organizationId;

    return this.prisma.moduleGrant.findMany({
      where,
      include: { module: true },
      orderBy: { grantedAt: "desc" },
    });
  }

  listForUser(userId: string) {
    return this.prisma.moduleGrant.findMany({
      where: { userId },
      include: { module: true },
      orderBy: { grantedAt: "desc" },
    });
  }

  listForOrganization(organizationId: string) {
    return this.prisma.moduleGrant.findMany({
      where: { organizationId },
      include: { module: true },
      orderBy: { grantedAt: "desc" },
    });
  }

  async findOne(id: string) {
    const grant = await this.prisma.moduleGrant.findUnique({ where: { id } });
    if (!grant) {
      throw new NotFoundException("Grant de módulo no encontrado");
    }
    return grant;
  }

  async assign(dto: AssignModuleGrantDto, actorId?: string) {
    const module = await this.modules.requireByKey(dto.moduleKey);
    if (!module.active) {
      throw new NotFoundException(`Módulo "${dto.moduleKey}" inactivo`);
    }

    const userId = dto.userId ?? null;
    const organizationId = dto.organizationId ?? null;
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;

    const existing = await this.prisma.moduleGrant.findFirst({
      where: { moduleId: module.id, userId, organizationId },
    });

    const grant = existing
      ? await this.prisma.moduleGrant.update({
          where: { id: existing.id },
          data: {
            status: "ACTIVE",
            source: "MANUAL",
            expiresAt,
            grantedAt: new Date(),
            grantedById: actorId ?? null,
          },
          include: { module: true },
        })
      : await this.prisma.moduleGrant.create({
          data: {
            moduleId: module.id,
            userId,
            organizationId,
            source: "MANUAL",
            expiresAt,
            grantedById: actorId ?? null,
          },
          include: { module: true },
        });

    await this.invalidateOwner(userId, organizationId);
    return grant;
  }

  async revoke(id: string) {
    const existing = await this.findOne(id);
    const grant = await this.prisma.moduleGrant.update({
      where: { id: existing.id },
      data: { status: "REVOKED" },
      include: { module: true },
    });
    await this.invalidateOwner(grant.userId, grant.organizationId);
    return grant;
  }

  private async invalidateOwner(
    userId: string | null,
    organizationId: string | null,
  ): Promise<void> {
    if (organizationId) {
      await this.entitlements.invalidateOrganization(organizationId);
      return;
    }
    if (userId) {
      await this.entitlements.invalidate(userId, null);
    }
  }
}
