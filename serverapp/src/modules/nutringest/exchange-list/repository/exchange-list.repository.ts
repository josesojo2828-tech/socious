import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "nestjs-prisma";
import { DomainEvent } from "src/shared/event/domain-listener";
import { LoggerService } from "src/shared/logger/logger.service";
import { EntityNotFoundException } from "src/shared/error/domain-errors";
import { ExchangeListModel } from "../model/exchange-list.model";
import { ExchangeList, Menu, Patient } from "src/shared/types/schema.types";
import {
  EXCHANGE_LIST_WHERE,
  EXCHANGE_LIST_CREATE,
  EXCHANGE_LIST_UPDATE,
  EXCHANGE_LIST_WITH_ID,
  EXCHANGE_LIST_INCLUDE,
  EXCHANGE_LIST_ORDER,
  EXCHANGE_LIST_DEFAULT_INCLUDE,
} from "../dto/exchange-list.type";

@Injectable()
export class ExchangeListRepository extends ExchangeListModel {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {
    super();
  }

  private format(entity: any): ExchangeList | null {
    if (!entity) return null;
    return {
      id: entity.id,
      nutritionistId: entity.nutritionistId,
      createdBy: entity.createdBy,

      name: entity.name,
      description: entity.description,
      baseCarbs: entity.baseCarbs,
      baseFat: entity.baseFat,
      baseKcal: entity.baseKcal,
      baseProtein: entity.baseProtein,
      nutritionist: entity.nutritionist,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      archivedAt: entity.archivedAt ?? null,
      deletedAt: entity.deletedAt ?? null,

      // 2. CORRECCIÓN CRÍTICA: Pasar el objeto _count
      // Sin esto, la columna '_count.dietPlans' rompe la vista
      _count: entity._count || { dietPlans: 0, consultations: 0 },
    };
  }

  public async findMany({
    where,
    include,
    orderBy,
    skip,
    take,
  }: {
    where: EXCHANGE_LIST_WHERE;
    include?: EXCHANGE_LIST_INCLUDE;
    orderBy?: EXCHANGE_LIST_ORDER;
    skip: number;
    take: number;
  }) {
    const entities = await this.prisma.exchangeList.findMany({
      where,
      include: include || EXCHANGE_LIST_DEFAULT_INCLUDE,
      orderBy,
      skip,
      take,
    });
    return entities.map((e) => this.format(e));
  }

  public async findOne({
    where,
    include,
  }: {
    where: EXCHANGE_LIST_WHERE;
    include?: EXCHANGE_LIST_INCLUDE;
  }) {
    const entity = await this.prisma.exchangeList.findFirst({
      where,
      include: include || EXCHANGE_LIST_DEFAULT_INCLUDE,
    });
    return this.format(entity);
  }

  public async create({ data }: { data: EXCHANGE_LIST_CREATE }) {
    const prev = new DomainEvent({
      action: this.EVENT_CREATED,
      entityName: this.MODEL_NAME,
      payload: data,
    });
    this.eventEmitter.emit(this.EVENT_CREATED, prev);
    this.logger.logInfo(`Creando lista de intercambio: ${data.name}`);

    try {
      const entity = await this.prisma.exchangeList.create({
        data,
        include: EXCHANGE_LIST_DEFAULT_INCLUDE,
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
      this.logger.logError(`Error creando lista de intercambio`, error);
      throw error;
    }
  }

  public async update({
    where,
    data,
  }: {
    where: EXCHANGE_LIST_WITH_ID;
    data: EXCHANGE_LIST_UPDATE;
  }) {
    const prev = new DomainEvent({
      action: this.EVENT_UPDATED,
      entityName: this.MODEL_NAME,
      payload: { where, data },
    });
    this.eventEmitter.emit(this.EVENT_UPDATED, prev);
    this.logger.logInfo(`Actualizando lista de intercambio: ${where.id}`);

    try {
      const entity = await this.prisma.exchangeList.update({
        where,
        data,
        include: EXCHANGE_LIST_DEFAULT_INCLUDE,
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
      this.logger.logError(`Error actualizando lista de intercambio`, error);

      if (error.code === "P2025")
        throw new EntityNotFoundException(`Lista de intercambio con ID ${where.id}`);
      throw error;
    }
  }

  public async delete({ where }: { where: EXCHANGE_LIST_WITH_ID }) {
    const prev = new DomainEvent({
      action: this.EVENT_DELETED,
      entityName: this.MODEL_NAME,
      payload: where,
    });
    this.eventEmitter.emit(this.EVENT_DELETED, prev);
    this.logger.logInfo(`Eliminando lista de intercambio (soft): ${where.id}`);

    try {
      const entity = await this.prisma.exchangeList.update({
        where,
        data: { deletedAt: new Date() },
        include: EXCHANGE_LIST_DEFAULT_INCLUDE,
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
      this.logger.logError(`Error eliminando lista de intercambio`, error);

      if (error.code === "P2025")
        throw new EntityNotFoundException(`Lista de intercambio con ID ${where.id}`);
      throw error;
    }
  }

  public async count({ where }: { where: EXCHANGE_LIST_WHERE }) {
    return this.prisma.exchangeList.count({ where });
  }
}
