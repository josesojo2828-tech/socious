import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "nestjs-prisma";
import { DomainEvent } from "src/shared/event/domain-listener";
import { LoggerService } from "src/shared/logger/logger.service";
import { EntityNotFoundException } from "src/shared/error/domain-errors";
import SportsHistoryModel from "../model/sports-history.model";
import {
  SPORTS_HISTORY_WHERE,
  SPORTS_HISTORY_CREATE,
  SPORTS_HISTORY_UPDATE,
  SPORTS_HISTORY_INCLUDE,
  SPORTS_HISTORY_DEFAULT_INCLUDE,
} from "../dto/sports-history.dto";

@Injectable()
export default class SportsHistoryRepository extends SportsHistoryModel {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {
    super();
  }

  public format(entity: any) {
    if (!entity) return null;
    return {
      id: entity.id,
      patientId: entity.patientId,
      background: entity.background,
      goals: entity.goals,
      assessment: entity.assessment,
      competitionLevel: entity.competitionLevel,
      trainingMinutesPerSession: entity.trainingMinutesPerSession,
      trainingDaysPerWeek: entity.trainingDaysPerWeek,
      trainingSessionsPerDay: entity.trainingSessionsPerDay,
      ffmKg: entity.ffmKg,
      cunninghamRmr: entity.cunninghamRmr,
      metsExpenditure: entity.metsExpenditure,
      disciplineIds: (entity.disciplines || []).map((d: any) => d.sportDisciplineId),
      disciplines: (entity.disciplines || []).map((d: any) => ({
        id: d.sportDisciplineId,
        sportDisciplineId: d.sportDisciplineId,
        name: d.sportDiscipline?.name,
        code: d.sportDiscipline?.code,
        metValue: d.sportDiscipline?.metValue != null ? Number(d.sportDiscipline.metValue) : undefined,
        category: d.sportDiscipline?.category,
      })),
      createdBy: entity.createdBy,
      patient: entity.patient,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      deletedAt: entity.deletedAt,
    };
  }

  public async findFirst({
    where,
    include,
    orderBy,
  }: {
    where: SPORTS_HISTORY_WHERE;
    include?: SPORTS_HISTORY_INCLUDE;
    orderBy?: any;
  }) {
    const entity = await this.prisma.sportsHistory.findFirst({
      where,
      include: include || SPORTS_HISTORY_DEFAULT_INCLUDE,
      orderBy,
    });
    return this.format(entity);
  }

  public async findMany({
    where,
    include,
    orderBy,
    skip,
    take,
  }: {
    where: SPORTS_HISTORY_WHERE;
    include?: SPORTS_HISTORY_INCLUDE;
    orderBy?: any;
    skip: number;
    take: number;
  }) {
    const entities = await this.prisma.sportsHistory.findMany({
      where,
      include: include || SPORTS_HISTORY_DEFAULT_INCLUDE,
      orderBy,
      skip,
      take,
    });
    return entities.map((e) => this.format(e));
  }

  public async create({ data }: { data: SPORTS_HISTORY_CREATE }) {
    const prev = new DomainEvent({
      action: this.EVENT_CREATED,
      entityName: this.MODEL_NAME,
      payload: data,
    });
    this.eventEmitter.emit(this.EVENT_CREATED, prev);

    try {
      const entity = await this.prisma.sportsHistory.create({
        data,
        include: SPORTS_HISTORY_DEFAULT_INCLUDE,
      });

      const success = new DomainEvent({
        action: this.EVENT_CREATED_SUCCESS,
        entityName: this.MODEL_NAME,
        payload: data,
      });
      this.eventEmitter.emit(this.EVENT_CREATED_SUCCESS, success);
      return this.format(entity);
    } catch (error) {
      const failed = new DomainEvent({
        action: this.EVENT_CREATED_FAILED,
        entityName: this.MODEL_NAME,
        payload: data,
        metadata: { error },
      });
      this.eventEmitter.emit(this.EVENT_CREATED_FAILED, failed);
      this.logger.logError(`Error creando historia deportiva`, error);
      throw error;
    }
  }

  public async update({ where, data }: { where: { id: string }; data: SPORTS_HISTORY_UPDATE }) {
    const prev = new DomainEvent({
      action: this.EVENT_UPDATED,
      entityName: this.MODEL_NAME,
      payload: { where, data },
    });
    this.eventEmitter.emit(this.EVENT_UPDATED, prev);

    try {
      const entity = await this.prisma.sportsHistory.update({
        where,
        data,
        include: SPORTS_HISTORY_DEFAULT_INCLUDE,
      });

      const success = new DomainEvent({
        action: this.EVENT_UPDATED_SUCCESS,
        entityName: this.MODEL_NAME,
        payload: where,
      });
      this.eventEmitter.emit(this.EVENT_UPDATED_SUCCESS, success);
      return this.format(entity);
    } catch (error) {
      const failed = new DomainEvent({
        action: this.EVENT_UPDATED_FAILED,
        entityName: this.MODEL_NAME,
        payload: where,
        metadata: { error },
      });
      this.eventEmitter.emit(this.EVENT_UPDATED_FAILED, failed);
      if (error.code === "P2025")
        throw new EntityNotFoundException(`Historia deportiva con ID ${where.id}`);
      throw error;
    }
  }

  public async softDelete({ where }: { where: { id: string } }) {
    const prev = new DomainEvent({
      action: this.EVENT_DELETED,
      entityName: this.MODEL_NAME,
      payload: where,
    });
    this.eventEmitter.emit(this.EVENT_DELETED, prev);

    try {
      const entity = await this.prisma.sportsHistory.update({
        where,
        data: { isActive: false, deletedAt: new Date() },
        include: SPORTS_HISTORY_DEFAULT_INCLUDE,
      });

      const success = new DomainEvent({
        action: this.EVENT_DELETED_SUCCESS,
        entityName: this.MODEL_NAME,
        payload: where,
      });
      this.eventEmitter.emit(this.EVENT_DELETED_SUCCESS, success);
      return this.format(entity);
    } catch (error) {
      const failed = new DomainEvent({
        action: this.EVENT_DELETED_FAILED,
        entityName: this.MODEL_NAME,
        payload: where,
        metadata: { error },
      });
      this.eventEmitter.emit(this.EVENT_DELETED_FAILED, failed);
      if (error.code === "P2025")
        throw new EntityNotFoundException(`Historia deportiva con ID ${where.id}`);
      throw error;
    }
  }
}