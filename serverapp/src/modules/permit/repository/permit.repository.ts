import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "nestjs-prisma";
import { DomainEvent } from "src/shared/event/domain-listener";
import PermitModel from "../model/permit.model";
import {
  PERMIT_WHERE,
  PERMIT_INCLUDE,
  PERMIT_ORDER,
  PERMIT_CREATE,
  PERMIT_UPDATE,
  PERMIT_WICTH_ID,
  PERMIT_DEFAULT_INCLUDE,
  PERMIT_WHERE_UNIQUE,
} from "../dto/permit.type";
import { Permit } from "src/shared/types/schema.types";
import { LoggerService } from "src/shared/logger/logger.service";

@Injectable()
export default class PermitReporitory extends PermitModel {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private logger: LoggerService,
  ) {
    super();
  }

  private format(entity: any): Permit {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      list: entity.list,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      deletedAt: entity.deletedAt,
    };
  }

  public async findMany({
    include,
    orderBy,
    skip,
    take,
    where,
  }: {
    where: PERMIT_WHERE;
    include?: PERMIT_INCLUDE;
    orderBy?: PERMIT_ORDER;
    skip: number;
    take: number;
  }) {
    const entityPromise = this.prisma.permit.findMany({
      where,
      include: include ? include : PERMIT_DEFAULT_INCLUDE,
      orderBy,
      skip: Number(skip),
      take: Number(take),
    });

    const entity = await entityPromise;
    return entity.map((entity) => this.format(entity));
  }

  public async findOne({
    where,
    include,
  }: {
    where: PERMIT_WHERE;
    include?: PERMIT_INCLUDE;
  }) {
    if (
      !where ||
      Object.keys(where).length === 0 ||
      Object.values(where).every((v) => v === undefined)
    ) {
      return null;
    }

    const entity = await this.prisma.permit.findFirst({
      where,
      include: include ? include : PERMIT_DEFAULT_INCLUDE,
    });

    if (!entity) return null;

    return this.format(entity);
  }

  public async create({ data }: { data: PERMIT_CREATE }) {
    const entityPromise = this.prisma.permit.create({
      data,
      include: PERMIT_DEFAULT_INCLUDE,
    });
    return entityPromise;
  }

  public async update({
    data,
    where,
  }: {
    data: PERMIT_UPDATE;
    where: PERMIT_WICTH_ID;
  }) {
    const prev = new DomainEvent({
      action: this.EVENT_UPDATED,
      entityName: this.MODEL_NAME,
      payload: data,
    });
    const success = new DomainEvent({
      action: this.EVENT_UPDATED_SUCCESS,
      entityName: this.MODEL_NAME,
      payload: data,
    });

    this.eventEmitter.emit(this.EVENT_UPDATED, prev);
    this.logger.logInfo(`Actualizando permiso: ${data.id}`);

    try {
      const entityPromise = this.prisma.permit.update({
        where,
        data,
        include: PERMIT_DEFAULT_INCLUDE,
      });

      const entity = await entityPromise;
      this.eventEmitter.emit(this.EVENT_UPDATED_SUCCESS, success);
      this.logger.logInfo(`Permiso actualizado: ${data.id}`);
      return this.format(entity);
    } catch (error) {
      const failed = new DomainEvent({
        action: this.EVENT_UPDATED_FAILED,
        entityName: this.MODEL_NAME,
        payload: data,
        metadata: { error: error },
      });
      this.eventEmitter.emit(this.EVENT_UPDATED_FAILED, failed);
      // this.logger.logError(`Error al actualizar permiso: ${data.id}`, error);
      return { error: true, object: error };
    }
  }

  public async delete({ where }: { where: PERMIT_WICTH_ID }) {
    const prev = new DomainEvent({
      action: this.EVENT_DELETED,
      entityName: this.MODEL_NAME,
      payload: where,
    });
    const success = new DomainEvent({
      action: this.EVENT_DELETED_SUCCESS,
      entityName: this.MODEL_NAME,
      payload: where,
    });

    this.eventEmitter.emit(this.EVENT_DELETED, prev);
    this.logger.logInfo(`Eliminando permiso: ${where.id}`);

    try {
      const entityPromise = this.prisma.permit.update({
        where,
        include: PERMIT_DEFAULT_INCLUDE,
        data: { deletedAt: new Date() },
      });

      const entity = await entityPromise;
      this.eventEmitter.emit(this.EVENT_DELETED_SUCCESS, success);
      this.logger.logInfo(`Permiso eliminado: ${where.id}`);
      return this.format(entity);
    } catch (error) {
      const failed = new DomainEvent({
        action: this.EVENT_DELETED_FAILED,
        entityName: this.MODEL_NAME,
        payload: where,
        metadata: { error: error },
      });
      this.eventEmitter.emit(this.EVENT_DELETED_FAILED, failed);
      // this.logger.logError(`Error al eliminar permiso: ${where.id}`, error);
      return { error: true, object: error };
    }
  }

  public async count({ where }: { where: PERMIT_WHERE }) {
    const entityPromise = this.prisma.permit.count({
      where,
    });

    const entity = await entityPromise;
    return entity;
  }

  public async upsert({
    where,
    create,
    update,
  }: {
    where: PERMIT_WHERE_UNIQUE;
    create: PERMIT_CREATE;
    update: PERMIT_UPDATE;
  }) {
    const prev = new DomainEvent({
      action: this.EVENT_UPDATED,
      entityName: this.MODEL_NAME,
      payload: where,
    });
    const success = new DomainEvent({
      action: this.EVENT_UPDATED_SUCCESS,
      entityName: this.MODEL_NAME,
      payload: where,
    });

    this.eventEmitter.emit(this.EVENT_UPDATED, prev);
    // this.logger.logInfo(`UPSERT permiso: ${where.id}`);

    try {
      const entityPromise = this.prisma.permit.upsert({
        where,
        create,
        update,
      });

      const entity = await entityPromise;
      this.eventEmitter.emit(this.EVENT_UPDATED_SUCCESS, success);
      this.logger.logInfo(`Permiso actualizado: ${entity.id}`);
      return entity;
    } catch (error) {
      const failed = new DomainEvent({
        action: this.EVENT_UPDATED_FAILED,
        entityName: this.MODEL_NAME,
        payload: where,
        metadata: { error: error },
      });
      this.eventEmitter.emit(this.EVENT_UPDATED_FAILED, failed);
      // this.logger.logError(`UPSERT permiso error: ${where.id}`, error);
      return { error: true, object: error };
    }
  }
}
