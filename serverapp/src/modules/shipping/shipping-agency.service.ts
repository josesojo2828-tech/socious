import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import {
  CreateShippingAgencyDto,
  UpdateShippingAgencyDto,
} from "./dto/shipping.dto";

/**
 * Shipping agency catalog (S4).
 *
 * Platform-owned (like `Category`): merchants READ the active agencies to
 * render the checkout and SWITCH them on/off through their tenant settings —
 * they never edit these rows. Only `SUPERADMIN` writes.
 */
@Injectable()
export class ShippingAgencyService {
  constructor(private readonly prisma: PrismaService) {}

  /** Active catalog for the public checkout (S4). */
  listActive() {
    return this.prisma.shippingAgency.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, key: true, name: true },
    });
  }

  /** Full catalog for the platform admin. */
  listAll() {
    return this.prisma.shippingAgency.findMany({ orderBy: { name: "asc" } });
  }

  async create(data: CreateShippingAgencyDto) {
    const existing = await this.prisma.shippingAgency.findUnique({
      where: { key: data.key },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(`Ya existe una agencia con la clave "${data.key}".`);
    }

    return this.prisma.shippingAgency.create({
      data: { key: data.key, name: data.name.trim() },
    });
  }

  async update(id: string, data: UpdateShippingAgencyDto) {
    await this.getOne(id);

    return this.prisma.shippingAgency.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.active !== undefined && { active: data.active }),
      },
    });
  }

  async getOne(id: string) {
    const agency = await this.prisma.shippingAgency.findUnique({ where: { id } });
    if (!agency) throw new NotFoundException("Agencia no encontrada.");
    return agency;
  }

  /**
   * Validates an agency for an order (S4): it must exist, be active AND be one
   * of the keys the tenant enabled in its settings.
   */
  async assertUsable(
    agencyId: string,
    enabledKeys: string[],
  ): Promise<{ id: string; key: string; name: string }> {
    const agency = await this.prisma.shippingAgency.findFirst({
      where: { id: agencyId, active: true },
      select: { id: true, key: true, name: true },
    });

    if (!agency) {
      throw new NotFoundException("La agencia de envío no existe o está inactiva.");
    }

    if (!enabledKeys.includes(agency.key)) {
      throw new ConflictException(
        `La agencia "${agency.name}" no está habilitada en la configuración de la tienda.`,
      );
    }

    return agency;
  }
}
