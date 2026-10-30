import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import type { Prisma } from "@prisma/client";
import { readPlanCapacity } from "src/shared/utils/plan-capacity";
import { CreateBranchDto, UpdateBranchDto } from "./dto/branch.dto";

export interface BranchScope {
  organizationId: string | null;
}

/**
 * Branches (S10).
 *
 * Every organization is born with one hidden default branch; extending is a
 * plan decision (Premium: 3), so `POST` reads the active subscription's
 * `capacity.maxBranches` and refuses past it instead of silently charging.
 */
@Injectable()
export class BranchService {
  constructor(private readonly prisma: PrismaService) {}

  private requireOrg(scope: BranchScope): string {
    if (!scope.organizationId) {
      throw new ForbiddenException("Crea una organización para gestionar sucursales.");
    }
    return scope.organizationId;
  }

  async list(scope: BranchScope) {
    const organizationId = this.requireOrg(scope);

    return this.prisma.branch.findMany({
      where: { organizationId },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      include: { _count: { select: { sales: true, orders: true } } },
    });
  }

  async create(scope: BranchScope, data: CreateBranchDto) {
    const organizationId = this.requireOrg(scope);

    const capacity = await this.readCapacity(organizationId);
    const maxBranches = capacity?.maxBranches ?? 1;
    const current = await this.prisma.branch.count({ where: { organizationId } });

    if (current >= maxBranches) {
      throw new ConflictException(
        `Tu plan permite ${maxBranches} sucursal(es). Amplía el plan para crear más.`,
      );
    }

    try {
      return await this.prisma.branch.create({
        data: {
          organizationId,
          name: data.name.trim(),
          address: data.address?.trim() || null,
        },
      });
    } catch (error: any) {
      if (error?.code === "P2002") {
        throw new ConflictException(
          `Ya existe una sucursal llamada "${data.name.trim()}" en este negocio.`,
        );
      }
      throw error;
    }
  }

  async update(scope: BranchScope, id: string, data: UpdateBranchDto) {
    const branch = await this.getOne(scope, id);

    if (branch.isDefault && data.name && data.name.trim() !== branch.name) {
      throw new ForbiddenException(
        "La sucursal por defecto no se renombra: es la base del negocio.",
      );
    }

    return this.prisma.branch.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.address !== undefined && { address: data.address?.trim() || null }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  /**
   * A branch with documents is deactivated, not deleted: sales, cash and
   * stock history must keep pointing at a real row.
   */
  async remove(scope: BranchScope, id: string) {
    const branch = await this.getOne(scope, id);

    if (branch.isDefault) {
      throw new ForbiddenException("La sucursal por defecto no se elimina.");
    }

    const [sales, orders, registers] = await Promise.all([
      this.prisma.sale.count({ where: { branchId: id } }),
      this.prisma.order.count({ where: { branchId: id } }),
      this.prisma.cashRegister.count({ where: { branchId: id } }),
    ]);
    if (sales + orders + registers > 0) {
      throw new ConflictException(
        "La sucursal tiene documentos a su nombre: desactívala en lugar de eliminarla.",
      );
    }

    await this.prisma.branch.delete({ where: { id } });
    return { id, deleted: true };
  }

  async getOne(scope: BranchScope, id: string) {
    const organizationId = this.requireOrg(scope);

    const branch = await this.prisma.branch.findFirst({
      where: { id, organizationId },
    });
    if (!branch) throw new NotFoundException("Sucursal no encontrada.");
    return branch;
  }

  private async readCapacity(organizationId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { organizationId, status: "ACTIVE" },
      include: { plan: { select: { content: true } } },
      orderBy: { startDate: "desc" },
    });

    return readPlanCapacity(subscription?.plan?.content ?? null);
  }
}
