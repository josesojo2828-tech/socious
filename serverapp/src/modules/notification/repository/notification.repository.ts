import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "nestjs-prisma";
import { DomainEvent } from "src/shared/event/domain-listener";
import { Notification, NotificationType } from "src/shared/types/schema.types";
import NotificationModel from "../model/notification.model";
import {
  NOTIFICATION_WHERE,
  NOTIFICATION_INCLUDE,
  NOTIFICATION_ORDER,
  NOTIFICATION_CREATE,
  NOTIFICATION_UPDATE,
  NOTIFICATION_WICTH_ID,
  NOTIFICATION_DEFAULT_INCLUDE,
  NOTIFICATION_WHERE_UNIQUE,
} from "../dto/notification.type";
import { LoggerService } from "src/shared/logger/logger.service";
import {
  DuplicateEntryException,
  EntityNotFoundException,
} from "src/shared/error/domain-errors";

@Injectable()
export default class NotificationRepository extends NotificationModel {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {
    super();
  }

  async create(data: {
    userId: string;
    title: string;
    message: string;
    type: NotificationType;
    entityId?: string;
    entityType?: string;
  }) {
    return this.prisma.notification.create({ data });
  }

  async findByUser(userId: string, limit = 20) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  async countUnread(userId: string) {
    return this.prisma.notification.count({
      where: { userId, read: false },
    });
  }

  async markAsRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  public format(entity: any): Notification {
    // if (!entity) return null; // Protección contra nulos

    return {
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      deletedAt: entity.deletedAt,

      id: entity.id,

      entityId: entity.entityId,
      entityType: entity.entityType,
      message: entity.message,
      read: entity.read,
      title: entity.title,

      type: entity.type,
      user: entity.user,
      userId: entity.userId,
    };
  }

  public async findMany({
    include,
    orderBy,
    skip,
    take,
    where,
  }: {
    where: NOTIFICATION_WHERE;
    include?: NOTIFICATION_INCLUDE;
    orderBy?: NOTIFICATION_ORDER;
    skip: number;
    take: number;
  }) {
    const entityPromise = this.prisma.notification.findMany({
      where,
      include: include ? include : NOTIFICATION_DEFAULT_INCLUDE,
      orderBy,
      skip: Number(skip),
      take: Number(take),
    });

    const entity = await entityPromise;
    return entity.map((e) => this.format(e));
  }

  public async findOne({
    where,
    include,
  }: {
    where: NOTIFICATION_WHERE_UNIQUE;
    include?: NOTIFICATION_INCLUDE;
  }) {
    const entityPromise = this.prisma.notification.findFirst({
      where,
      include: include ? include : NOTIFICATION_DEFAULT_INCLUDE,
    });

    const entity = await entityPromise;
    return this.format(entity);
  }

  // public async create({ data }: { data: NOTIFICATION_CREATE }) {
  //     const prev = new DomainEvent({ action: this.EVENT_CREATED, entityName: this.MODEL_NAME, payload: data });
  //     this.eventEmitter.emit(this.EVENT_CREATED, prev);
  //     this.logger.logInfo(`Creando plan de suscripcion: ${data.title}`);

  //     try {
  //         const entity = await this.prisma.notification.create({
  //             data,
  //             include: NOTIFICATION_DEFAULT_INCLUDE // Asegurar que devolvemos la data completa
  //         });

  //         const success = new DomainEvent({ action: this.EVENT_CREATED_SUSSCESS, entityName: this.MODEL_NAME, payload: data });
  //         this.eventEmitter.emit(this.EVENT_CREATED_SUSSCESS, success);
  //         this.logger.logInfo(`Plan de suscripcion creado: ${data.title}`);

  //         return this.format(entity);

  //     } catch (error) {
  //         const failed = new DomainEvent({ action: this.EVENT_CREATED_FAILED, entityName: this.MODEL_NAME, payload: data, metadata: { error: error } });
  //         this.eventEmitter.emit(this.EVENT_CREATED_FAILED, failed);
  //         this.logger.logError(`Error creando plan`, error);

  //         if (error.code === 'P2002') {
  //             throw new DuplicateEntryException(`El nombre del plan '${data.title}' ya existe.`);
  //         }
  //         throw error;
  //     }
  // }

  public async update({
    data,
    where,
  }: {
    data: NOTIFICATION_UPDATE;
    where: NOTIFICATION_WICTH_ID;
  }) {
    const prev = new DomainEvent({
      action: this.EVENT_UPDATED,
      entityName: this.MODEL_NAME,
      payload: data,
    });
    this.eventEmitter.emit(this.EVENT_UPDATED, prev);
    this.logger.logInfo(`Actualizando plan de suscripcion: ID:${where.id}`);

    try {
      const entity = await this.prisma.notification.update({
        where,
        data,
        include: NOTIFICATION_DEFAULT_INCLUDE,
      });

      const success = new DomainEvent({
        action: this.EVENT_UPDATED_SUCCESS,
        entityName: this.MODEL_NAME,
        payload: data,
      });
      this.eventEmitter.emit(this.EVENT_UPDATED_SUCCESS, success);
      this.logger.logInfo(`Plan de suscripcion actualizado: ID:${where.id}`);

      return this.format(entity);
    } catch (error) {
      const failed = new DomainEvent({
        action: this.EVENT_UPDATED_FAILED,
        entityName: this.MODEL_NAME,
        payload: data,
        metadata: { error: error },
      });
      this.eventEmitter.emit(this.EVENT_UPDATED_FAILED, failed);
      this.logger.logError(`Error actualizando plan`, error);

      if (error.code === "P2025") {
        throw new EntityNotFoundException(`Plan con ID ${where.id}`);
      }
      if (error.code === "P2002") {
        throw new DuplicateEntryException(`El nombre del plan ya está en uso.`);
      }
      throw error;
    }
  }

  public async delete({ where }: { where: NOTIFICATION_WICTH_ID }) {
    const prev = new DomainEvent({
      action: this.EVENT_DELETED,
      entityName: this.MODEL_NAME,
      payload: where,
    });
    this.eventEmitter.emit(this.EVENT_DELETED, prev);
    this.logger.logInfo(`Eliminando plan de suscripcion: ${where.id}`);

    try {
      // Usamos update para Soft Delete (deletedAt)
      const entity = await this.prisma.notification.delete({
        where,
        include: NOTIFICATION_DEFAULT_INCLUDE,
      });

      const success = new DomainEvent({
        action: this.EVENT_DELETED_SUCCESS,
        entityName: this.MODEL_NAME,
        payload: where,
      });
      this.eventEmitter.emit(this.EVENT_DELETED_SUCCESS, success);
      this.logger.logInfo(`Plan de suscripcion eliminado: ${where.id}`);

      return this.format(entity);
    } catch (error) {
      const failed = new DomainEvent({
        action: this.EVENT_DELETED_FAILED,
        entityName: this.MODEL_NAME,
        payload: where,
        metadata: { error: error },
      });
      this.eventEmitter.emit(this.EVENT_DELETED_FAILED, failed);
      this.logger.logError(`Error eliminando plan`, error);

      if (error.code === "P2025") {
        throw new EntityNotFoundException(`Plan con ID ${where.id}`);
      }
      throw error;
    }
  }

  public async count({ where }: { where: NOTIFICATION_WHERE }) {
    return await this.prisma.notification.count({ where });
  }
}
