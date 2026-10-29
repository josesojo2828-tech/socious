import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "nestjs-prisma";
import { DomainEvent } from "src/shared/event/domain-listener";
import FileModel from "../model/file.model";
import {
  FILE_WHERE,
  FILE_INCLUDE,
  FILE_ORDER,
  FILE_CREATE,
  FILE_UPDATE,
  FILE_WICTH_ID,
  FILE_DEFAULT_INCLUDE,
} from "../dto/file.type";
import { LoggerService } from "src/shared/logger/logger.service";

@Injectable()
export default class FileReporitory extends FileModel {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private logger: LoggerService,
  ) {
    super();
  }

  public async findMany({
    include,
    orderBy,
    skip,
    take,
    where,
  }: {
    where: FILE_WHERE;
    include?: FILE_INCLUDE;
    orderBy?: FILE_ORDER;
    skip: number;
    take: number;
  }) {
    const entityPromise = this.prisma.file.findMany({
      where,
      include: include ? include : FILE_DEFAULT_INCLUDE,
      orderBy,
      skip: Number(skip),
      take: Number(take),
    });

    const entity = await entityPromise;

    return entity;
  }

  public async findOne({
    where,
    include,
  }: {
    where: FILE_WHERE;
    include?: FILE_INCLUDE;
  }) {
    const entityPromise = this.prisma.file.findUnique({
      where,
      include: include ? include : FILE_DEFAULT_INCLUDE,
    });

    const entity = await entityPromise;

    return entity;
  }

  public async create({ data }: { data: FILE_CREATE }) {
    const prev = new DomainEvent({
      action: this.EVENT_CREATED,
      entityName: this.MODEL_NAME,
      payload: data,
    });
    const success = new DomainEvent({
      action: this.EVENT_CREATED_SUSSCESS,
      entityName: this.MODEL_NAME,
      payload: data,
    });

    this.eventEmitter.emit(this.EVENT_CREATED, prev);
    this.logger.logInfo(`Creando archivo: ${data.name}`);

    try {
      const entityPromise = this.prisma.file.create({
        data,
      });

      const entity = await entityPromise;
      this.eventEmitter.emit(this.EVENT_CREATED_SUSSCESS, success);
      this.logger.logInfo(`Archivo creado: ${data.name}`);
      return entity;
    } catch (error) {
      const failed = new DomainEvent({
        action: this.EVENT_CREATED_FAILED,
        entityName: this.MODEL_NAME,
        payload: data,
        metadata: { error: error },
      });
      this.eventEmitter.emit(this.EVENT_CREATED_FAILED, failed);
      // this.logger.logError(`Error al crear archivo: ${data.name}`, error);
      return { error: true, object: error };
    }
  }

  public async update({
    data,
    where,
  }: {
    data: FILE_UPDATE;
    where: FILE_WICTH_ID;
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
    this.logger.logInfo(`Actualizando archivo: ${data.name}`);

    try {
      const entityPromise = this.prisma.file.update({
        where,
        data,
      });

      const entity = await entityPromise;
      this.eventEmitter.emit(this.EVENT_UPDATED_SUCCESS, success);
      this.logger.logInfo(`Archivo actualizado: ${data.name}`);
      return entity;
    } catch (error) {
      const failed = new DomainEvent({
        action: this.EVENT_UPDATED_FAILED,
        entityName: this.MODEL_NAME,
        payload: data,
        metadata: { error: error },
      });
      this.eventEmitter.emit(this.EVENT_UPDATED_FAILED, failed);
      // this.logger.logError(`Error al actualizar archivo: ${data.name}`, error);
      return { error: true, object: error };
    }
  }

  public async delete({ where }: { where: FILE_WICTH_ID }) {
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
    this.logger.logInfo(`Eliminando archivo: ${where.id}`);

    try {
      const entityPromise = this.prisma.file.delete({ where });

      const entity = await entityPromise;
      this.eventEmitter.emit(this.EVENT_DELETED_SUCCESS, success);
      this.logger.logInfo(`Archivo eliminado: ${where.id}`);
      return entity;
    } catch (error) {
      const failed = new DomainEvent({
        action: this.EVENT_DELETED_FAILED,
        entityName: this.MODEL_NAME,
        payload: where,
        metadata: { error: error },
      });
      this.eventEmitter.emit(this.EVENT_DELETED_FAILED, failed);
      // this.logger.logError(`Error al eliminar archivo: ${where.id}`, error);
      return { error: true, object: error };
    }
  }

  public async count({ where }: { where: FILE_WHERE }) {
    const entityPromise = this.prisma.file.count({
      where,
    });

    const entity = await entityPromise;
    return entity;
  }
}
