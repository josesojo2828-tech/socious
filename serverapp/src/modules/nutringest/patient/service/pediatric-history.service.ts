import { Injectable, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import { User } from "src/shared/types/schema.types";
import PediatricHistoryRepository from "../repository/pediatric-history.repository";
import {
  PEDIATRIC_HISTORY_CREATE,
  PEDIATRIC_HISTORY_UPDATE,
} from "../dto/pediatric-history.dto";
import {
  canAccessPatient,
  patientsWhereNutritionistAccess,
  hasPatientListAllPermit,
} from "../helpers/can-access-patient";

@Injectable()
export class PediatricHistoryService {
  constructor(
    private readonly pediatricHistoryRepository: PediatricHistoryRepository,
    private readonly prisma: PrismaService,
  ) {}

  private isPatientSession(userSession: User): boolean {
    return (
      userSession.permits?.name === "PATIENT" ||
      (!userSession.nutritionistProfile?.id &&
        ((userSession.patientProfiles?.length ?? 0) > 0 ||
          (userSession.permits?.list?.includes("PATIENT_DASHBOARD") ?? false)))
    );
  }

  private async validatePatientAccessForRead(patientId: string, userSession: User) {
    if (this.isPatientSession(userSession)) {
      const patient = await this.prisma.patient.findFirst({
        where: {
          OR: [{ id: patientId }, { userId: patientId }],
          AND: [
            {
              OR: [
                { userId: userSession.id },
                ...(userSession.patientProfiles?.map((p) => ({ id: p.id })) || []),
              ],
            },
          ],
        },
      });
      if (!patient) {
        throw new ForbiddenException(
          "No tienes permiso para consultar este paciente.",
        );
      }
      return patient;
    }

    const canViewAll = hasPatientListAllPermit(userSession);
    const effectiveNutId = canViewAll ? undefined : userSession.nutritionistProfile?.id;
    const patient = await this.prisma.patient.findFirst({
      where: {
        OR: [{ id: patientId }, { userId: patientId }],
        ...patientsWhereNutritionistAccess(effectiveNutId),
      },
    });
    if (!patient) {
      throw new ForbiddenException(
        "No tienes permiso para gestionar este paciente.",
      );
    }
    return patient;
  }

  private async validatePatientOwnershipForWrite(patientId: string, userSession: User) {
    if (this.isPatientSession(userSession)) {
      const patient = await this.prisma.patient.findFirst({
        where: {
          OR: [{ id: patientId }, { userId: patientId }],
          AND: [
            {
              OR: [
                { userId: userSession.id },
                ...(userSession.patientProfiles?.map((p) => ({ id: p.id })) || []),
              ],
            },
          ],
        },
      });
      if (!patient) {
        throw new ForbiddenException(
          "No tienes permiso para gestionar este paciente.",
        );
      }
      return patient;
    }

    const canViewAll = hasPatientListAllPermit(userSession);
    const effectiveNutId = canViewAll ? undefined : userSession.nutritionistProfile?.id;
    if (!canViewAll && !effectiveNutId) {
      throw new ForbiddenException(
        "Se requiere un perfil de nutricionista o administrador.",
      );
    }

    const patient = await this.prisma.patient.findFirst({
      where: {
        OR: [{ id: patientId }, { userId: patientId }],
        ...patientsWhereNutritionistAccess(effectiveNutId, { write: true }),
      },
    });
    if (!patient) {
      throw new ForbiddenException(
        "No tienes permiso para gestionar este paciente.",
      );
    }
    return patient;
  }

  private async findOwnedRecord(id: string, userSession: User) {
    if (this.isPatientSession(userSession)) {
      const record = await this.prisma.pediatricHistory.findUnique({
        where: { id },
        include: { patient: true },
      });
      const isOwner =
        record &&
        (record.patient?.userId === userSession.id ||
          userSession.patientProfiles?.some((p) => p.id === record.patient?.id));
      if (!record || !isOwner) {
        throw new ForbiddenException(
          "No tienes permiso para gestionar este registro.",
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

    const record = await this.prisma.pediatricHistory.findUnique({
      where: { id },
      include: { patient: { include: { nutritionists: true } } },
    });
    if (
      !record ||
      !canAccessPatient(record.patient, effectiveNutId, {
        write: true,
      })
    ) {
      throw new ForbiddenException(
        "No tienes permiso para gestionar este registro.",
      );
    }
    return record;
  }

  public async getLastActive({
    patientId,
    userSession,
  }: {
    patientId?: string;
    userSession: User;
  }) {
    let resolvedId = patientId;
    if (!resolvedId && this.isPatientSession(userSession)) {
      resolvedId = userSession.patientProfiles?.[0]?.id || userSession.id;
    }
    if (!resolvedId) return null;

    const patient = await this.validatePatientAccessForRead(resolvedId, userSession);
    return this.pediatricHistoryRepository.findFirst({
      where: { patientId: patient.id, isActive: true },
      orderBy: { createdAt: "desc" },
    });
  }

  public async create({
    userSession,
    data,
  }: {
    userSession: User;
    data: any;
  }) {
    const patient = await this.validatePatientOwnershipForWrite(data.patientId, userSession);
    const resolvedPatientId = patient.id;

    const dataCreate: PEDIATRIC_HISTORY_CREATE = {
      weightKg: data.weightKg,
      heightCm: data.heightCm,
      sittingHeightCm: data.sittingHeightCm,
      activityFactor: data.activityFactor,
      growthCost: data.growthCost,
      schofieldTmb: data.schofieldTmb,
      harrisBenedictWoman: data.harrisBenedictWoman,
      rct: data.rct,
      mirwaldPhv: data.mirwaldPhv,
      growthClassification: data.growthClassification,
      growthChartType: data.growthChartType,
      representativeName: data.representativeName,
      representativePhone: data.representativePhone,
      representativeEmail: data.representativeEmail,
      representativeRelationship: data.representativeRelationship,
      headCircumferenceCm: data.headCircumferenceCm,
      midUpperArmCircumferenceCm: data.midUpperArmCircumferenceCm,
      tricepsSkinfoldMm: data.tricepsSkinfoldMm,
      subscapularSkinfoldMm: data.subscapularSkinfoldMm,
      totalArmAreaCm2: data.totalArmAreaCm2,
      armMuscleAreaCm2: data.armMuscleAreaCm2,
      correctedArmMuscleAreaCm2: data.correctedArmMuscleAreaCm2,
      armFatAreaCm2: data.armFatAreaCm2,
      armFatIndexPercent: data.armFatIndexPercent,
      frisanchoMuscleClassification: data.frisanchoMuscleClassification,
      frisanchoFatClassification: data.frisanchoFatClassification,
      patient: { connect: { id: resolvedPatientId } },
      createdBy: { connect: { id: userSession.id } },
    };

    return this.pediatricHistoryRepository.create({ data: dataCreate });
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
    await this.findOwnedRecord(id, userSession);

    const dataUpdate: PEDIATRIC_HISTORY_UPDATE = {
      weightKg: data.weightKg,
      heightCm: data.heightCm,
      sittingHeightCm: data.sittingHeightCm,
      activityFactor: data.activityFactor,
      growthCost: data.growthCost,
      schofieldTmb: data.schofieldTmb,
      harrisBenedictWoman: data.harrisBenedictWoman,
      rct: data.rct,
      mirwaldPhv: data.mirwaldPhv,
      growthClassification: data.growthClassification,
      growthChartType: data.growthChartType,
      representativeName: data.representativeName,
      representativePhone: data.representativePhone,
      representativeEmail: data.representativeEmail,
      representativeRelationship: data.representativeRelationship,
      headCircumferenceCm: data.headCircumferenceCm,
      midUpperArmCircumferenceCm: data.midUpperArmCircumferenceCm,
      tricepsSkinfoldMm: data.tricepsSkinfoldMm,
      subscapularSkinfoldMm: data.subscapularSkinfoldMm,
      totalArmAreaCm2: data.totalArmAreaCm2,
      armMuscleAreaCm2: data.armMuscleAreaCm2,
      correctedArmMuscleAreaCm2: data.correctedArmMuscleAreaCm2,
      armFatAreaCm2: data.armFatAreaCm2,
      armFatIndexPercent: data.armFatIndexPercent,
      frisanchoMuscleClassification: data.frisanchoMuscleClassification,
      frisanchoFatClassification: data.frisanchoFatClassification,
    };

    return this.pediatricHistoryRepository.update({ where: { id }, data: dataUpdate });
  }

  public async softDelete({ id, userSession }: { id: string; userSession: User }) {
    if (this.isPatientSession(userSession)) {
      throw new ForbiddenException(
        "Los pacientes no tienen permiso para eliminar historias pediátricas.",
      );
    }
    await this.findOwnedRecord(id, userSession);
    return this.pediatricHistoryRepository.softDelete({ where: { id } });
  }
}