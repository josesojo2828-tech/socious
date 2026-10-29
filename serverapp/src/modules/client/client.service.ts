import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import type { Prisma } from "@prisma/client";
import {
  CreateClientDto,
  ListClientsQueryDto,
  UpdateClientDto,
} from "./dto/client.dto";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

export interface ClientScope {
  /** Effective organization from `OrganizationScopeService`; null = personal. */
  organizationId: string | null;
  /** Authenticated caller, recorded as the author of the record. */
  createdById?: string | null;
}

@Injectable()
export class ClientService {
  constructor(private readonly prisma: PrismaService) {}

  /** Tenant scope: clients never leak across organizations. */
  private scopeWhere(organizationId: string | null): Prisma.ClientWhereInput {
    return { organizationId, deletedAt: null };
  }

  async list(scope: ClientScope, query: ListClientsQueryDto) {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(Math.max(query.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);

    const filters: Prisma.ClientWhereInput[] = [this.scopeWhere(scope.organizationId)];

    if (query.isActive !== undefined) {
      filters.push({ isActive: query.isActive });
    }

    if (query.q?.trim()) {
      const q = query.q.trim();
      filters.push({
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { taxId: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
        ],
      });
    }

    const where: Prisma.ClientWhereInput = { AND: filters };
    const [list, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.client.count({ where }),
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

  async getOne(scope: ClientScope, id: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, ...this.scopeWhere(scope.organizationId) },
    });

    if (!client) throw new NotFoundException("Cliente no encontrado.");
    return client;
  }

  async create(scope: ClientScope, data: CreateClientDto) {
    await this.assertTaxIdAvailable(scope, data.taxId);

    return this.prisma.client.create({
      data: {
        name: data.name.trim(),
        taxId: data.taxId?.trim() || null,
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        address: data.address?.trim() || null,
        city: data.city?.trim() || null,
        state: data.state?.trim() || null,
        creditLimitUSD: data.creditLimitUSD ?? 0,
        notes: data.notes?.trim() || null,
        isActive: data.isActive ?? true,
        organizationId: scope.organizationId,
        createdById: scope.createdById ?? null,
      },
    });
  }

  async update(scope: ClientScope, id: string, data: UpdateClientDto) {
    const client = await this.getOne(scope, id);

    if (data.taxId !== undefined && data.taxId !== client.taxId) {
      await this.assertTaxIdAvailable(scope, data.taxId, id);
    }

    return this.prisma.client.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.taxId !== undefined && { taxId: data.taxId?.trim() || null }),
        ...(data.email !== undefined && { email: data.email || null }),
        ...(data.phone !== undefined && { phone: data.phone?.trim() || null }),
        ...(data.address !== undefined && { address: data.address?.trim() || null }),
        ...(data.city !== undefined && { city: data.city?.trim() || null }),
        ...(data.state !== undefined && { state: data.state?.trim() || null }),
        ...(data.creditLimitUSD !== undefined && {
          creditLimitUSD: data.creditLimitUSD,
        }),
        ...(data.notes !== undefined && { notes: data.notes?.trim() || null }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  /**
   * Soft delete: a client with sales history must keep its foreign key, so the
   * record is archived instead of destroyed.
   */
  async remove(scope: ClientScope, id: string) {
    await this.getOne(scope, id);

    const sales = await this.prisma.sale.count({
      where: { clientId: id, deletedAt: null },
    });
    if (sales > 0) {
      throw new ConflictException(
        "El cliente tiene ventas registradas: desactívalo en lugar de eliminarlo.",
      );
    }

    await this.prisma.client.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { id, deleted: true };
  }

  /** Outstanding balance plus the credit still available. */
  async getBalance(scope: ClientScope, id: string) {
    const client = await this.getOne(scope, id);

    const paidAgg = await this.prisma.salePayment.aggregate({
      _sum: { amountUSD: true },
      where: { sale: { clientId: id, organizationId: scope.organizationId } },
    });

    const dueAgg = await this.prisma.sale.aggregate({
      _sum: { totalUSD: true },
      where: {
        clientId: id,
        organizationId: scope.organizationId,
        deletedAt: null,
      },
    });

    const totalUSD = Number(dueAgg._sum.totalUSD ?? 0);
    const paidUSD = Number(paidAgg._sum.amountUSD ?? 0);
    const currentBalanceUSD = Math.max(0, totalUSD - paidUSD);
    const creditLimitUSD = Number(client.creditLimitUSD ?? 0);

    return {
      clientId: id,
      totalUSD,
      paidUSD,
      currentBalanceUSD,
      creditLimitUSD,
      availableCreditUSD: Math.max(0, creditLimitUSD - currentBalanceUSD),
    };
  }

  /**
   * The document number is the client's public identifier in a multi-tenant
   * ERP, so a duplicate inside the SAME tenant is rejected; across tenants the
   * same document is a different company.
   */
  private async assertTaxIdAvailable(
    scope: ClientScope,
    taxId: string | undefined,
    excludeId?: string,
  ): Promise<void> {
    const normalized = taxId?.trim();
    if (!normalized) return;

    const existing = await this.prisma.client.findFirst({
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
        "Ya existe un cliente con ese documento en este negocio.",
      );
    }
  }
}
