import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import type { Prisma } from "@prisma/client";
import { round2 } from "src/shared/utils/money";
import {
  CreateSupplierDto,
  ListSuppliersQueryDto,
  UpdateSupplierDto,
} from "./dto/supplier.dto";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

export interface SupplierScope {
  organizationId: string | null;
  createdById?: string | null;
}

/**
 * Supplier directory (S4) with the payable balance the same way the client
 * module keeps the receivable balance.
 */
@Injectable()
export class SupplierService {
  constructor(private readonly prisma: PrismaService) {}

  private scopeWhere(organizationId: string | null): Prisma.SupplierWhereInput {
    return { organizationId, deletedAt: null };
  }

  async list(scope: SupplierScope, query: ListSuppliersQueryDto) {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(Math.max(query.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);

    const filters: Prisma.SupplierWhereInput[] = [
      this.scopeWhere(scope.organizationId),
    ];

    if (query.isActive !== undefined) {
      filters.push({ isActive: query.isActive });
    }

    if (query.q?.trim()) {
      const q = query.q.trim();
      filters.push({
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { taxId: { contains: q, mode: "insensitive" } },
          { contactName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
        ],
      });
    }

    const where: Prisma.SupplierWhereInput = { AND: filters };
    const [list, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return {
      list,
      total,
      totalRecords: total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      limit,
      hasPrev: page > 1,
      hasNext: page < Math.ceil(total / limit),
    };
  }

  async getOne(scope: SupplierScope, id: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, ...this.scopeWhere(scope.organizationId) },
    });

    if (!supplier) throw new NotFoundException("Proveedor no encontrado.");
    return supplier;
  }

  async create(scope: SupplierScope, data: CreateSupplierDto) {
    await this.assertTaxIdAvailable(scope, data.taxId);

    return this.prisma.supplier.create({
      data: {
        name: data.name.trim(),
        taxId: data.taxId?.trim() || null,
        contactName: data.contactName?.trim() || null,
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        address: data.address?.trim() || null,
        city: data.city?.trim() || null,
        state: data.state?.trim() || null,
        notes: data.notes?.trim() || null,
        isActive: data.isActive ?? true,
        organizationId: scope.organizationId,
      },
    });
  }

  async update(scope: SupplierScope, id: string, data: UpdateSupplierDto) {
    const supplier = await this.getOne(scope, id);

    if (data.taxId !== undefined && data.taxId !== supplier.taxId) {
      await this.assertTaxIdAvailable(scope, data.taxId, id);
    }

    return this.prisma.supplier.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.taxId !== undefined && { taxId: data.taxId?.trim() || null }),
        ...(data.contactName !== undefined && {
          contactName: data.contactName?.trim() || null,
        }),
        ...(data.email !== undefined && { email: data.email || null }),
        ...(data.phone !== undefined && { phone: data.phone?.trim() || null }),
        ...(data.address !== undefined && {
          address: data.address?.trim() || null,
        }),
        ...(data.city !== undefined && { city: data.city?.trim() || null }),
        ...(data.state !== undefined && { state: data.state?.trim() || null }),
        ...(data.notes !== undefined && { notes: data.notes?.trim() || null }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  async remove(scope: SupplierScope, id: string) {
    await this.getOne(scope, id);

    const purchases = await this.prisma.purchase.count({
      where: { supplierId: id, deletedAt: null },
    });
    if (purchases > 0) {
      throw new ConflictException(
        "El proveedor tiene compras registradas: desactívalo en lugar de eliminarlo.",
      );
    }

    await this.prisma.supplier.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { id, deleted: true };
  }

  /** Amount owed to the supplier: purchased minus paid. */
  async getBalance(scope: SupplierScope, id: string) {
    await this.getOne(scope, id);

    const dueAgg = await this.prisma.purchase.aggregate({
      _sum: { totalUSD: true },
      where: {
        supplierId: id,
        organizationId: scope.organizationId,
        deletedAt: null,
      },
    });
    const paidAgg = await this.prisma.purchasePayment.aggregate({
      _sum: { amountUSD: true },
      where: { purchase: { supplierId: id, organizationId: scope.organizationId } },
    });

    const totalUSD = Number(dueAgg._sum.totalUSD ?? 0);
    const paidUSD = Number(paidAgg._sum.amountUSD ?? 0);

    return {
      supplierId: id,
      totalUSD,
      paidUSD,
      currentBalanceUSD: round2(Math.max(0, totalUSD - paidUSD)),
    };
  }

  private async assertTaxIdAvailable(
    scope: SupplierScope,
    taxId: string | undefined,
    excludeId?: string,
  ): Promise<void> {
    const normalized = taxId?.trim();
    if (!normalized) return;

    const existing = await this.prisma.supplier.findFirst({
      where: {
        taxId: normalized,
        organizationId: scope.organizationId,
        deletedAt: null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        "Ya existe un proveedor con ese documento en este negocio.",
      );
    }
  }
}
