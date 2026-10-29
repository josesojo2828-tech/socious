import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "nestjs-prisma";
import { DomainEvent } from "src/shared/event/domain-listener";
import { LoggerService } from "src/shared/logger/logger.service";
import { EntityNotFoundException } from "src/shared/error/domain-errors";
import PediatricHistoryModel from "../model/pediatric-history.model";
import {
  PEDIATRIC_HISTORY_WHERE,
  PEDIATRIC_HISTORY_CREATE,
  PEDIATRIC_HISTORY_UPDATE,
  PEDIATRIC_HISTORY_INCLUDE,
  PEDIATRIC_HISTORY_DEFAULT_INCLUDE,
} from "../dto/pediatric-history.dto";

@Injectable()
export default class PediatricHistoryRepository extends PediatricHistoryModel {
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
      weightKg: entity.weightKg ? Number(entity.weightKg) : null,
      heightCm: entity.heightCm ? Number(entity.heightCm) : null,
      sittingHeightCm: entity.sittingHeightCm ? Number(entity.sittingHeightCm) : null,
      activityFactor: entity.activityFactor,
      growthCost: entity.growthCost,
      schofieldTmb: entity.schofieldTmb,
      harrisBenedictWoman: entity.harrisBenedictWoman,
      rct: entity.rct,
      mirwaldPhv: entity.mirwaldPhv,
      growthClassification: entity.growthClassification,
      growthChartType: entity.growthChartType,
      representativeName: entity.representativeName,
      representativePhone: entity.representativePhone,
      representativeEmail: entity.representativeEmail,
      representativeRelationship: entity.representativeRelationship,
      headCircumferenceCm: entity.headCircumferenceCm ? Number(entity.headCircumferenceCm) : null,
      midUpperArmCircumferenceCm: entity.midUpperArmCircumferenceCm ? Number(entity.midUpperArmCircumferenceCm) : null,
      tricepsSkinfoldMm: entity.tricepsSkinfoldMm ? Number(entity.tricepsSkinfoldMm) : null,
      subscapularSkinfoldMm: entity.subscapularSkinfoldMm ? Number(entity.subscapularSkinfoldMm) : null,
      totalArmAreaCm2: entity.totalArmAreaCm2 ? Number(entity.totalArmAreaCm2) : null,
      armMuscleAreaCm2: entity.armMuscleAreaCm2 ? Number(entity.armMuscleAreaCm2) : null,
      correctedArmMuscleAreaCm2: entity.correctedArmMuscleAreaCm2 ? Number(entity.correctedArmMuscleAreaCm2) : null,
      armFatAreaCm2: entity.armFatAreaCm2 ? Number(entity.armFatAreaCm2) : null,
      armFatIndexPercent: entity.armFatIndexPercent ? Number(entity.armFatIndexPercent) : null,
      frisanchoMuscleClassification: entity.frisanchoMuscleClassification ?? null,
      frisanchoFatClassification: entity.frisanchoFatClassification ?? null,
      infantFormulas: Array.isArray(entity.infantFormulas)
        ? entity.infantFormulas.map((f: any) => ({
            id: f.id,
            pediatricHistoryId: f.pediatricHistoryId,
            capacityMl: f.capacityMl ? Number(f.capacityMl) : null,
            dailyVolumeMl: f.dailyVolumeMl ? Number(f.dailyVolumeMl) : null,
            densityKcalPerMl: f.densityKcalPerMl ? Number(f.densityKcalPerMl) : null,
            feedingFrequency: f.feedingFrequency,
            formulaType: f.formulaType,
            date: f.date,
            createdAt: f.createdAt,
          }))
        : [],
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
    where: PEDIATRIC_HISTORY_WHERE;
    include?: PEDIATRIC_HISTORY_INCLUDE;
    orderBy?: any;
  }) {
    const entity = await this.prisma.pediatricHistory.findFirst({
      where,
      include: include || PEDIATRIC_HISTORY_DEFAULT_INCLUDE,
      orderBy,
    });
    return this.format(entity);
  }

  public async create({ data }: { data: PEDIATRIC_HISTORY_CREATE }) {
    const prev = new DomainEvent({
      action: this.EVENT_CREATED,
      entityName: this.MODEL_NAME,
      payload: data,
    });
    this.eventEmitter.emit(this.EVENT_CREATED, prev);

    try {
      const entity = await this.prisma.pediatricHistory.create({
        data,
        include: PEDIATRIC_HISTORY_DEFAULT_INCLUDE,
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
      this.logger.logError(`Error creando historia pediátrica`, error);
      throw error;
    }
  }

  public async update({ where, data }: { where: { id: string }; data: PEDIATRIC_HISTORY_UPDATE }) {
    const prev = new DomainEvent({
      action: this.EVENT_UPDATED,
      entityName: this.MODEL_NAME,
      payload: { where, data },
    });
    this.eventEmitter.emit(this.EVENT_UPDATED, prev);

    try {
      const entity = await this.prisma.pediatricHistory.update({
        where,
        data,
        include: PEDIATRIC_HISTORY_DEFAULT_INCLUDE,
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
        throw new EntityNotFoundException(`Historia pediátrica con ID ${where.id}`);
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
      const entity = await this.prisma.pediatricHistory.update({
        where,
        data: { isActive: false, deletedAt: new Date() },
        include: PEDIATRIC_HISTORY_DEFAULT_INCLUDE,
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
        throw new EntityNotFoundException(`Historia pediátrica con ID ${where.id}`);
      throw error;
    }
  }
}