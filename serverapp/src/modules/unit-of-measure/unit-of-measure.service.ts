import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import { UnitKind } from "@prisma/client";
import { CreateUnitDto, UpdateUnitDto } from "./dto/unit.dto";

interface SystemUnitSeed {
  name: string;
  abbreviation: string;
  kind: UnitKind;
}

/** Read-only defaults every tenant sees; merchants add their own on top. */
const SYSTEM_UNITS: SystemUnitSeed[] = [
  { name: "Unidad", abbreviation: "UND", kind: UnitKind.COUNT },
  { name: "Kilogramo", abbreviation: "kg", kind: UnitKind.WEIGHT },
  { name: "Gramo", abbreviation: "g", kind: UnitKind.WEIGHT },
  { name: "Libra", abbreviation: "lb", kind: UnitKind.WEIGHT },
  { name: "Onza", abbreviation: "oz", kind: UnitKind.WEIGHT },
  { name: "Litro", abbreviation: "L", kind: UnitKind.VOLUME },
  { name: "Mililitro", abbreviation: "mL", kind: UnitKind.VOLUME },
];

/**
 * Units of measure (S2): a tenant-scoped CRUD on top of the read-only system
 * catalog. `Product.unit` keeps storing the abbreviation string, so no product
 * migration is needed — the select is simply fed from here.
 */
@Injectable()
export class UnitOfMeasureService implements OnModuleInit {
  private readonly logger = new Logger(UnitOfMeasureService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.ensureSystemDefaults();
  }

  /** Idempotent: re-running never duplicates the system catalog. */
  async ensureSystemDefaults(): Promise<void> {
    for (const unit of SYSTEM_UNITS) {
      const existing = await this.prisma.unitOfMeasure.findFirst({
        where: { organizationId: null, abbreviation: unit.abbreviation },
        select: { id: true },
      });
      if (!existing) {
        await this.prisma.unitOfMeasure.create({
          data: { ...unit, organizationId: null },
        });
      }
    }
    this.logger.log("System units of measure ready");
  }

  /** System catalog plus the tenant's own units (active and inactive). */
  async list(organizationId: string | null) {
    return this.prisma.unitOfMeasure.findMany({
      where: {
        OR: organizationId
          ? [{ organizationId: null }, { organizationId }]
          : [{ organizationId: null }],
      },
      orderBy: [{ organizationId: "asc" }, { kind: "asc" }, { name: "asc" }],
    });
  }

  async create(organizationId: string, dto: CreateUnitDto) {
    const abbreviation = dto.abbreviation.trim();
    const duplicate = await this.prisma.unitOfMeasure.findFirst({
      where: { organizationId, abbreviation },
      select: { id: true },
    });
    if (duplicate) {
      throw new BadRequestException(
        `Ya existe una unidad con la abreviatura "${abbreviation}".`,
      );
    }
    return this.prisma.unitOfMeasure.create({
      data: {
        organizationId,
        name: dto.name.trim(),
        abbreviation,
        kind: dto.kind,
      },
    });
  }

  private async ownUnit(organizationId: string, id: string) {
    const unit = await this.prisma.unitOfMeasure.findFirst({
      where: { id },
    });
    if (!unit) throw new NotFoundException("Unidad no encontrada.");
    if (!unit.organizationId) {
      throw new ForbiddenException(
        "Las unidades del sistema no se pueden modificar.",
      );
    }
    // Never leak or mutate a foreign tenant's row.
    if (unit.organizationId !== organizationId) {
      throw new NotFoundException("Unidad no encontrada.");
    }
    return unit;
  }

  async update(organizationId: string, id: string, dto: UpdateUnitDto) {
    await this.ownUnit(organizationId, id);
    return this.prisma.unitOfMeasure.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.abbreviation !== undefined
          ? { abbreviation: dto.abbreviation.trim() }
          : {}),
        ...(dto.kind !== undefined ? { kind: dto.kind } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
    });
  }

  async remove(organizationId: string, id: string) {
    await this.ownUnit(organizationId, id);
    await this.prisma.unitOfMeasure.delete({ where: { id } });
    return { deleted: true };
  }
}
