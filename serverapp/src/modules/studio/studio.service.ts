import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import {
  CreateAppointmentDto,
  CreateStationDto,
  UpdateAppointmentDto,
  UpdateStationDto,
} from "./dto/studio.dto";

export interface StudioScope {
  organizationId: string | null;
}

/** Relations the agenda screen renders without a second round-trip. */
const APPOINTMENT_INCLUDE = {
  client: { select: { id: true, name: true, phone: true } },
  service: { select: { id: true, name: true, salePriceUSD: true } },
  station: { select: { id: true, name: true, kind: true } },
  staff: { select: { id: true, fullName: true, email: true } },
} as const;

/** Statuses that no longer occupy a slot. */
const DEAD_STATUSES = ["CANCELED", "NO_SHOW"] as const;

/**
 * Studio plan (Mesas/Sillas + Agenda).
 *
 * Both resources are strictly organization-scoped: the caller's effective
 * workspace comes from the shared `OrganizationScopeService` rule, never from
 * a client-supplied id.
 */
@Injectable()
export class StudioService {
  constructor(private readonly prisma: PrismaService) {}

  private requireOrg(scope: StudioScope): string {
    if (!scope.organizationId) {
      throw new ForbiddenException(
        "Crea una organización para gestionar el studio.",
      );
    }
    return scope.organizationId;
  }

  // --- Mesas / Sillas -------------------------------------------------------

  async listStations(scope: StudioScope) {
    const organizationId = this.requireOrg(scope);

    return this.prisma.studioStation.findMany({
      where: { organizationId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }

  async createStation(scope: StudioScope, data: CreateStationDto) {
    const organizationId = this.requireOrg(scope);
    const name = data.name.trim();

    try {
      return await this.prisma.studioStation.create({
        data: {
          organizationId,
          name,
          kind: data.kind ?? "TABLE",
          capacity: data.capacity ?? 1,
          sortOrder: data.sortOrder ?? 0,
        },
      });
    } catch (error: any) {
      if (error?.code === "P2002") {
        throw new ConflictException(
          `Ya existe una mesa o silla llamada "${name}".`,
        );
      }
      throw error;
    }
  }

  async updateStation(scope: StudioScope, id: string, data: UpdateStationDto) {
    await this.getStation(scope, id);
    const name = data.name?.trim();

    try {
      return await this.prisma.studioStation.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(data.kind !== undefined && { kind: data.kind }),
          ...(data.capacity !== undefined && { capacity: data.capacity }),
          ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
        },
      });
    } catch (error: any) {
      if (error?.code === "P2002") {
        throw new ConflictException(
          `Ya existe una mesa o silla llamada "${name}".`,
        );
      }
      throw error;
    }
  }

  /**
   * Deleting a station keeps the appointment history: the FK is SET NULL, so
   * past slots stay in the agenda without a station.
   */
  async removeStation(scope: StudioScope, id: string) {
    await this.getStation(scope, id);
    await this.prisma.studioStation.delete({ where: { id } });
    return { id, deleted: true };
  }

  async getStation(scope: StudioScope, id: string) {
    const organizationId = this.requireOrg(scope);

    const station = await this.prisma.studioStation.findFirst({
      where: { id, organizationId },
    });
    if (!station) throw new NotFoundException("Mesa o silla no encontrada.");
    return station;
  }

  // --- Agenda ---------------------------------------------------------------

  async listAppointments(
    scope: StudioScope,
    range: { from?: string; to?: string } = {},
  ) {
    const organizationId = this.requireOrg(scope);

    const startAt: { gte?: Date; lt?: Date } = {};
    if (range.from) startAt.gte = new Date(range.from);
    if (range.to) startAt.lt = new Date(range.to);

    return this.prisma.studioAppointment.findMany({
      where: {
        organizationId,
        ...(range.from || range.to ? { startAt } : {}),
      },
      include: APPOINTMENT_INCLUDE,
      orderBy: { startAt: "asc" },
    });
  }

  async createAppointment(
    scope: StudioScope,
    data: CreateAppointmentDto,
    createdById?: string | null,
  ) {
    const organizationId = this.requireOrg(scope);
    const { startAt, endAt } = this.parseWindow(data);

    await this.assertNoOverlap(
      organizationId,
      startAt,
      endAt,
      data.stationId,
      data.staffId,
    );
    await this.assertReferences(organizationId, data);

    return this.prisma.studioAppointment.create({
      data: {
        organizationId,
        clientId: data.clientId ?? null,
        serviceId: data.serviceId ?? null,
        stationId: data.stationId ?? null,
        staffId: data.staffId ?? null,
        startAt,
        endAt,
        status: data.status ?? "SCHEDULED",
        notes: data.notes?.trim() || null,
        createdById: createdById ?? null,
      },
      include: APPOINTMENT_INCLUDE,
    });
  }

  async updateAppointment(
    scope: StudioScope,
    id: string,
    data: UpdateAppointmentDto,
  ) {
    const current = await this.getAppointment(scope, id);
    const organizationId = this.requireOrg(scope);

    const startAt = data.startAt ? new Date(data.startAt) : current.startAt;
    const endAt = data.endAt ? new Date(data.endAt) : current.endAt;
    if (endAt <= startAt) {
      throw new BadRequestException("La hora de fin debe ser posterior al inicio.");
    }

    const stationId =
      data.stationId !== undefined ? data.stationId : current.stationId;
    const staffId = data.staffId !== undefined ? data.staffId : current.staffId;

    await this.assertNoOverlap(
      organizationId,
      startAt,
      endAt,
      stationId ?? undefined,
      staffId ?? undefined,
      id,
    );
    await this.assertReferences(organizationId, data);

    return this.prisma.studioAppointment.update({
      where: { id },
      data: {
        ...(data.clientId !== undefined && { clientId: data.clientId || null }),
        ...(data.serviceId !== undefined && {
          serviceId: data.serviceId || null,
        }),
        ...(data.stationId !== undefined && {
          stationId: data.stationId || null,
        }),
        ...(data.staffId !== undefined && { staffId: data.staffId || null }),
        startAt,
        endAt,
        ...(data.status !== undefined && { status: data.status }),
        ...(data.notes !== undefined && { notes: data.notes?.trim() || null }),
      },
      include: APPOINTMENT_INCLUDE,
    });
  }

  /** Cancelling keeps the row for history; the slot becomes free again. */
  async cancelAppointment(scope: StudioScope, id: string) {
    await this.getAppointment(scope, id);
    return this.prisma.studioAppointment.update({
      where: { id },
      data: { status: "CANCELED" },
      include: APPOINTMENT_INCLUDE,
    });
  }

  async getAppointment(scope: StudioScope, id: string) {
    const organizationId = this.requireOrg(scope);

    const appointment = await this.prisma.studioAppointment.findFirst({
      where: { id, organizationId },
    });
    if (!appointment) throw new NotFoundException("Cita no encontrada.");
    return appointment;
  }

  // --- Helpers --------------------------------------------------------------

  private parseWindow(data: { startAt: string; endAt: string }) {
    const startAt = new Date(data.startAt);
    const endAt = new Date(data.endAt);
    if (endAt <= startAt) {
      throw new BadRequestException(
        "La hora de fin debe ser posterior al inicio.",
      );
    }
    return { startAt, endAt };
  }

  /** One station and one staff member cannot hold two live slots at once. */
  private async assertNoOverlap(
    organizationId: string,
    startAt: Date,
    endAt: Date,
    stationId?: string | null,
    staffId?: string | null,
    excludeId?: string,
  ): Promise<void> {
    if (!stationId && !staffId) return;

    const clash = await this.prisma.studioAppointment.findFirst({
      where: {
        organizationId,
        status: { notIn: [...DEAD_STATUSES] },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
        ...(excludeId ? { id: { not: excludeId } } : {}),
        OR: [
          ...(stationId ? [{ stationId }] : []),
          ...(staffId ? [{ staffId }] : []),
        ],
      },
      select: { id: true, startAt: true },
    });

    if (clash) {
      throw new ConflictException(
        "El horario se solapa con otra cita de la misma mesa o profesional.",
      );
    }
  }

  /** A referenced client / service / station / staff must belong to the org. */
  private async assertReferences(
    organizationId: string,
    data: {
      clientId?: string;
      serviceId?: string;
      stationId?: string;
      staffId?: string;
    },
  ): Promise<void> {
    if (data.clientId) {
      const client = await this.prisma.client.findFirst({
        where: { id: data.clientId, organizationId },
        select: { id: true },
      });
      if (!client) {
        throw new BadRequestException("El cliente no pertenece a este negocio.");
      }
    }

    if (data.serviceId) {
      const service = await this.prisma.product.findFirst({
        where: { id: data.serviceId, organizationId, isService: true },
        select: { id: true },
      });
      if (!service) {
        throw new BadRequestException("El servicio no pertenece a este negocio.");
      }
    }

    if (data.stationId) {
      const station = await this.prisma.studioStation.findFirst({
        where: { id: data.stationId, organizationId },
        select: { id: true },
      });
      if (!station) {
        throw new BadRequestException(
          "La mesa o silla no pertenece a este negocio.",
        );
      }
    }

    if (data.staffId) {
      const member = await this.prisma.organizationMember.findFirst({
        where: { userId: data.staffId, organizationId, status: "ACTIVE" },
        select: { id: true },
      });
      if (!member) {
        throw new BadRequestException(
          "El profesional no pertenece a este negocio.",
        );
      }
    }
  }
}
