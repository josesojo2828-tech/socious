import { Injectable, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import { User } from "src/shared/types/schema.types";
import SportsHistoryRepository from "../repository/sports-history.repository";
import {
  SPORTS_HISTORY_CREATE,
  SPORTS_HISTORY_UPDATE,
} from "../dto/sports-history.dto";
import {
  canAccessPatient,
  patientsWhereNutritionistAccess,
} from "../helpers/can-access-patient";

@Injectable()
export class SportsHistoryService {
  constructor(
    private readonly sportsHistoryRepository: SportsHistoryRepository,
    private readonly prisma: PrismaService,
  ) {}

  private async validatePatientOwnership(patientId: string, userSession: User) {
    const patient = await this.prisma.patient.findFirst({
      where: {
        OR: [{ id: patientId }, { userId: patientId }],
        ...patientsWhereNutritionistAccess(
          userSession.nutritionistProfile?.id,
        ),
      },
    });
    if (!patient)
      throw new ForbiddenException(
        "No tienes permiso para gestionar este paciente.",
      );
    return patient;
  }

  private async findOwnedRecord(id: string, userSession: User) {
    const record = await this.prisma.sportsHistory.findUnique({
      where: { id },
      include: { patient: { include: { nutritionists: true } } },
    });
    if (
      !record ||
      !canAccessPatient(record.patient, userSession.nutritionistProfile?.id, {
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
    if (!patientId) return null;
    const patient = await this.validatePatientOwnership(patientId, userSession);
    return this.sportsHistoryRepository.findFirst({
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
    const patient = await this.validatePatientOwnership(data.patientId, userSession);
    const resolvedPatientId = patient.id;

    const dataCreate: SPORTS_HISTORY_CREATE = {
      background: data.background,
      goals: data.goals,
      assessment: data.assessment,
      competitionLevel: data.competitionLevel,
      trainingMinutesPerSession: data.trainingMinutesPerSession,
      trainingDaysPerWeek: data.trainingDaysPerWeek,
      trainingSessionsPerDay: data.trainingSessionsPerDay,
      ffmKg: data.ffmKg,
      cunninghamRmr: data.cunninghamRmr,
      metsExpenditure: data.metsExpenditure,
      patient: { connect: { id: resolvedPatientId } },
      createdBy: { connect: { id: userSession.id } },
      disciplines: {
        create: (data.disciplineIds || []).map((sportDisciplineId: string) => ({
          sportDisciplineId,
        })),
      },
    };

    return this.sportsHistoryRepository.create({ data: dataCreate });
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

    const dataUpdate: SPORTS_HISTORY_UPDATE = {
      background: data.background,
      goals: data.goals,
      assessment: data.assessment,
      competitionLevel: data.competitionLevel,
      trainingMinutesPerSession: data.trainingMinutesPerSession,
      trainingDaysPerWeek: data.trainingDaysPerWeek,
      trainingSessionsPerDay: data.trainingSessionsPerDay,
      ffmKg: data.ffmKg,
      cunninghamRmr: data.cunninghamRmr,
      metsExpenditure: data.metsExpenditure,
    };

    if (Array.isArray(data.disciplineIds)) {
      dataUpdate.disciplines = {
        deleteMany: {},
        create: data.disciplineIds.map((sportDisciplineId: string) => ({
          sportDisciplineId,
        })),
      };
    }

    return this.sportsHistoryRepository.update({ where: { id }, data: dataUpdate });
  }

  public async softDelete({ id, userSession }: { id: string; userSession: User }) {
    await this.findOwnedRecord(id, userSession);
    return this.sportsHistoryRepository.softDelete({ where: { id } });
  }
}