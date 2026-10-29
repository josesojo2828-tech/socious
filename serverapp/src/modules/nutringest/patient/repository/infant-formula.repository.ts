import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "nestjs-prisma";
import { DomainEvent } from "src/shared/event/domain-listener";
import { LoggerService } from "src/shared/logger/logger.service";
import { EntityNotFoundException } from "src/shared/error/domain-errors";
import InfantFormulaModel from "../model/infant-formula.model";
import {
  INFANT_FORMULA_WHERE,
  INFANT_FORMULA_CREATE,
  INFANT_FORMULA_UPDATE,
  INFANT_FORMULA_INCLUDE,
  INFANT_FORMULA_DEFAULT_INCLUDE,
} from "../dto/infant-formula.dto";

@Injectable()
export default class InfantFormulaRepository extends InfantFormulaModel {
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
      pediatricHistoryId: entity.pediatricHistoryId,
      capacityMl: entity.capacityMl ? Number(entity.capacityMl) : null,
      dailyVolumeMl: entity.dailyVolumeMl ? Number(entity.dailyVolumeMl) : null,
      densityKcalPerMl: entity.densityKcalPerMl ? Number(entity.densityKcalPerMl) : null,
      feedingFrequency: entity.feedingFrequency,
      formulaType: entity.formulaType,
      date: entity.date,
      createdBy: entity.createdBy,
      pediatricHistory: entity.pediatricHistory,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      deletedAt: entity.deletedAt,
    };
  }

  public async findMany({
    where,
    include,
    orderBy,
    skip,
    take,
  }: {
    where: INFANT_FORMULA_WHERE;
    include?: INFANT_FORMULA_INCLUDE;
    orderBy?: any;
    skip: number;
    take: number;
  }) {
    const entities = await this.prisma.infantFormulaHistory.findMany({
      where,
      include: include || INFANT_FORMULA_DEFAULT_INCLUDE,
      orderBy,
      skip,
      take,
    });
    return entities.map((e) => this.format(e));
  }

  public async create({ data }: { data: INFANT_FORMULA_CREATE }) {
    const prev = new DomainEvent({
      action: this.EVENT_CREATED,
      entityName: this.MODEL_NAME,
      payload: data,
    });
    this.eventEmitter.emit(this.EVENT_CREATED, prev);

    try {
      const entity = await this.prisma.infantFormulaHistory.create({
        data,
        include: INFANT_FORMULA_DEFAULT_INCLUDE,
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
      this.logger.logError(`Error creando fórmula láctea`, error);
      throw error;
    }
  }

  public async update({ where, data }: { where: { id: string }; data: INFANT_FORMULA_UPDATE }) {
    const prev = new DomainEvent({
      action: this.EVENT_UPDATED,
      entityName: this.MODEL_NAME,
      payload: { where, data },
    });
    this.eventEmitter.emit(this.EVENT_UPDATED, prev);

    try {
      const entity = await this.prisma.infantFormulaHistory.update({
        where,
        data,
        include: INFANT_FORMULA_DEFAULT_INCLUDE,
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
        throw new EntityNotFoundException(`Fórmula láctea con ID ${where.id}`);
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
      const entity = await this.prisma.infantFormulaHistory.update({
        where,
        data: { isActive: false, deletedAt: new Date() },
        include: INFANT_FORMULA_DEFAULT_INCLUDE,
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
        throw new EntityNotFoundException(`Fórmula láctea con ID ${where.id}`);
      throw error;
    }
  }
}