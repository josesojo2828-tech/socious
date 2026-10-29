import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import { User } from "src/shared/types/schema.types";
import InfantFormulaRepository from "../repository/infant-formula.repository";
import {
  INFANT_FORMULA_CREATE,
  INFANT_FORMULA_UPDATE,
} from "../dto/infant-formula.dto";
import { canAccessPatient, hasPatientListAllPermit } from "../helpers/can-access-patient";

@Injectable()
export class InfantFormulaService {
  constructor(
    private readonly infantFormulaRepository: InfantFormulaRepository,
    private readonly prisma: PrismaService,
  ) {}

  private async findOwnedPediatricHistory(
    pediatricHistoryId: string,
    userSession: User,
    write = true,
  ) {
    const record = await this.prisma.pediatricHistory.findUnique({
      where: { id: pediatricHistoryId },
      include: { patient: { include: { nutritionists: true } } },
    });
    if (!record) {
      throw new NotFoundException("Historia pediátrica no encontrada.");
    }

    const isPatient =
      userSession.permits?.name === "PATIENT" ||
      (!userSession.nutritionistProfile?.id &&
        ((userSession.patientProfiles?.length ?? 0) > 0 ||
          (userSession.permits?.list?.includes("PATIENT_DASHBOARD") ?? false)));

    if (isPatient) {
      if (write) {
        throw new ForbiddenException(
          "Los pacientes no pueden modificar fórmulas lácteas.",
        );
      }
      const isOwner =
        record.patient.userId === userSession.id ||
        (userSession.patientProfiles?.some((p) => p.id === record.patient.id) ?? false);
      if (!isOwner) {
        throw new ForbiddenException(
          "No tienes permiso para consultar este registro.",
        );
      }
      return record;
    }

    const canViewAll = hasPatientListAllPermit(userSession);
    const effectiveNutId = canViewAll ? undefined : userSession.nutritionistProfile?.id;
    if (!canViewAll && !effectiveNutId) {
      throw new ForbiddenException(
        "Se requiere un perfil de nutricionista o administrador.",
      );
    }

    if (
      !canAccessPatient(record.patient, effectiveNutId, {
        write,
      })
    ) {
      throw new ForbiddenException(
        "No tienes permiso para gestionar este registro.",
      );
    }
    return record;
  }

  public async list({
    pediatricHistoryId,
    userSession,
  }: {
    pediatricHistoryId: string;
    userSession: User;
  }) {
    const history = await this.findOwnedPediatricHistory(
      pediatricHistoryId,
      userSession,
      false,
    );
    return this.infantFormulaRepository.findMany({
      where: { pediatricHistoryId: history.id, isActive: true },
      orderBy: { date: "desc" },
      skip: 0,
      take: 100,
    });
  }

  public async create({
    pediatricHistoryId,
    userSession,
    data,
  }: {
    pediatricHistoryId: string;
    userSession: User;
    data: any;
  }) {
    const history = await this.findOwnedPediatricHistory(
      pediatricHistoryId,
      userSession,
    );

    const dataCreate: INFANT_FORMULA_CREATE = {
      capacityMl: data.capacityMl,
      dailyVolumeMl: data.dailyVolumeMl,
      densityKcalPerMl: data.densityKcalPerMl,
      feedingFrequency: data.feedingFrequency,
      formulaType: data.formulaType,
      date: data.date ? new Date(data.date) : new Date(),
      pediatricHistory: { connect: { id: history.id } },
      createdBy: { connect: { id: userSession.id } },
    };

    return this.infantFormulaRepository.create({ data: dataCreate });
  }

  public async update({
    id,
    userSession,
    data,
  }: {
    id: string;
    userSession: User;
    data: any;
  }) {
    const existing = await this.prisma.infantFormulaHistory.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException("Fórmula láctea no encontrada.");
    await this.findOwnedPediatricHistory(existing.pediatricHistoryId, userSession);

    const dataUpdate: INFANT_FORMULA_UPDATE = {
      capacityMl: data.capacityMl,
      dailyVolumeMl: data.dailyVolumeMl,
      densityKcalPerMl: data.densityKcalPerMl,
      feedingFrequency: data.feedingFrequency,
      formulaType: data.formulaType,
      date: data.date ? new Date(data.date) : undefined,
    };

    return this.infantFormulaRepository.update({ where: { id }, data: dataUpdate });
  }

  public async softDelete({ id, userSession }: { id: string; userSession: User }) {
    const existing = await this.prisma.infantFormulaHistory.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException("Fórmula láctea no encontrada.");
    await this.findOwnedPediatricHistory(existing.pediatricHistoryId, userSession);

    return this.infantFormulaRepository.softDelete({ where: { id } });
  }
}