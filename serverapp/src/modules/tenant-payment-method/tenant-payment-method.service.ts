import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import { BUSINESS_PAYMENT_METHODS } from "src/shared/constants/payment-methods";

const CODE_PATTERN = /^[A-Z][A-Z0-9_]{1,39}$/;

export interface TenantMethodInput {
  name: string;
  code: string;
  currency: string;
  active?: boolean;
}

/**
 * Tenant payment methods (S1): merchants create their own codes (e.g.
 * PAGO_MOVIL_MERCANTIL) next to the built-in business catalog. Sales and
 * purchases accept both sets.
 */
@Injectable()
export class TenantPaymentMethodService {
  constructor(private readonly prisma: PrismaService) {}

  /** Built-ins first, then the tenant's methods (for the POS). */
  async posOptions(organizationId: string | null) {
    const customs = organizationId
      ? await this.prisma.tenantPaymentMethod.findMany({
          where: { organizationId, active: true },
          orderBy: { name: "asc" },
        })
      : [];
    return [
      ...BUSINESS_PAYMENT_METHODS,
      ...customs.map((row) => ({
        code: row.code,
        label: row.name,
        currency: row.currency,
      })),
    ];
  }

  async list(organizationId: string) {
    return this.prisma.tenantPaymentMethod.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
    });
  }

  async create(organizationId: string, input: TenantMethodInput) {
    const code = input.code.trim().toUpperCase();
    if (!CODE_PATTERN.test(code)) {
      throw new BadRequestException(
        "El código debe ir en mayúsculas: letras, números y guiones bajos (ej: PAGO_MOVIL_MERCANTIL).",
      );
    }
    if (BUSINESS_PAYMENT_METHODS.some((method) => method.code === code)) {
      throw new BadRequestException(
        `El código "${code}" ya existe en los métodos base.`,
      );
    }
    const duplicate = await this.prisma.tenantPaymentMethod.findFirst({
      where: { organizationId, code },
      select: { id: true },
    });
    if (duplicate) {
      throw new BadRequestException(`Ya existe un método con el código "${code}".`);
    }
    return this.prisma.tenantPaymentMethod.create({
      data: {
        organizationId,
        name: input.name.trim(),
        code,
        currency: input.currency,
        active: input.active ?? true,
      },
    });
  }

  private async own(organizationId: string, id: string) {
    const row = await this.prisma.tenantPaymentMethod.findFirst({
      where: { id, organizationId },
    });
    if (!row) throw new NotFoundException("Método de pago no encontrado.");
    return row;
  }

  async update(organizationId: string, id: string, input: Partial<TenantMethodInput>) {
    await this.own(organizationId, id);
    return this.prisma.tenantPaymentMethod.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.currency !== undefined ? { currency: input.currency } : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
      },
    });
  }

  async remove(organizationId: string, id: string) {
    await this.own(organizationId, id);
    await this.prisma.tenantPaymentMethod.delete({ where: { id } });
    return { deleted: true };
  }
}
