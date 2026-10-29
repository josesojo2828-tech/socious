import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import { EntitlementService } from "src/modules/permit/service/entitlement.service";
import { EnableEntitlementDto } from "./dto/entitlement.dto";

/**
 * Owner-scoped CRUD for the add-on entitlement catalog (design Phase 4).
 *
 * Enabling is idempotent: a soft-canceled/expired entitlement for the same
 * owner+add-on is REACTIVATED instead of duplicated (the DB enforces uniqueness
 * with partial indexes that Prisma cannot model — see the migration). Disabling
 * is a soft `CANCELED` so grants stay dormant and re-enabling is instant.
 *
 * Every mutation invalidates the owner's resolved-entitlement cache.
 */
@Injectable()
export class EntitlementAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementService,
  ) {}

  /** Active add-on catalog offered to owners. */
  listActiveAddOns() {
    return this.prisma.addOn.findMany({
      where: { active: true, deletedAt: null },
      orderBy: { name: "asc" },
    });
  }

  listForOrganization(organizationId: string) {
    return this.prisma.entitlement.findMany({
      where: { organizationId, deletedAt: null },
      include: { addOn: true },
      orderBy: { createdAt: "desc" },
    });
  }

  listForUser(userId: string) {
    return this.prisma.entitlement.findMany({
      where: { organizationId: null, userId, deletedAt: null },
      include: { addOn: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async enableForOrganization(
    organizationId: string,
    dto: EnableEntitlementDto,
    actorId?: string,
  ) {
    const addOn = await this.requireAddOn(dto.addOnId);

    const existing = await this.prisma.entitlement.findFirst({
      where: { organizationId, addOnId: addOn.id },
    });

    const entitlement = existing
      ? await this.prisma.entitlement.update({
          where: { id: existing.id },
          data: {
            status: "ACTIVE",
            deletedAt: null,
            startDate: new Date(),
            endDate: null,
            quantity: dto.quantity ?? existing.quantity,
          },
          include: { addOn: true },
        })
      : await this.prisma.entitlement.create({
          data: {
            organizationId,
            addOnId: addOn.id,
            quantity: dto.quantity ?? 1,
            priceAtPurchase: addOn.price,
            currency: addOn.currency,
            createdById: actorId ?? null,
          },
          include: { addOn: true },
        });

    await this.entitlements.invalidateOrganization(organizationId);
    return entitlement;
  }

  async disableForOrganization(organizationId: string, entitlementId: string) {
    const existing = await this.prisma.entitlement.findFirst({
      where: { id: entitlementId, organizationId },
    });
    if (!existing) {
      throw new NotFoundException("Entitlement no encontrado");
    }

    const entitlement = await this.prisma.entitlement.update({
      where: { id: existing.id },
      data: { status: "CANCELED", endDate: new Date() },
      include: { addOn: true },
    });

    await this.entitlements.invalidateOrganization(organizationId);
    return entitlement;
  }

  async enableForUser(
    userId: string,
    dto: EnableEntitlementDto,
    actorId?: string,
  ) {
    const addOn = await this.requireAddOn(dto.addOnId);

    const existing = await this.prisma.entitlement.findFirst({
      where: { organizationId: null, userId, addOnId: addOn.id },
    });

    const entitlement = existing
      ? await this.prisma.entitlement.update({
          where: { id: existing.id },
          data: {
            status: "ACTIVE",
            deletedAt: null,
            startDate: new Date(),
            endDate: null,
            quantity: dto.quantity ?? existing.quantity,
          },
          include: { addOn: true },
        })
      : await this.prisma.entitlement.create({
          data: {
            organizationId: null,
            userId,
            addOnId: addOn.id,
            quantity: dto.quantity ?? 1,
            priceAtPurchase: addOn.price,
            currency: addOn.currency,
            createdById: actorId ?? null,
          },
          include: { addOn: true },
        });

    await this.entitlements.invalidate(userId, null);
    return entitlement;
  }

  async disableForUser(userId: string, entitlementId: string) {
    const existing = await this.prisma.entitlement.findFirst({
      where: { id: entitlementId, organizationId: null, userId },
    });
    if (!existing) {
      throw new NotFoundException("Entitlement no encontrado");
    }

    const entitlement = await this.prisma.entitlement.update({
      where: { id: existing.id },
      data: { status: "CANCELED", endDate: new Date() },
      include: { addOn: true },
    });

    await this.entitlements.invalidate(userId, null);
    return entitlement;
  }

  private async requireAddOn(addOnId: string) {
    const addOn = await this.prisma.addOn.findUnique({
      where: { id: addOnId },
    });
    if (!addOn || addOn.deletedAt || !addOn.active) {
      throw new NotFoundException("Add-on no encontrado o inactivo");
    }
    return addOn;
  }
}
