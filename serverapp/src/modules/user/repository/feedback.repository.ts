import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "nestjs-prisma";
import { DomainEvent } from "src/shared/event/domain-listener";
import {
  FEEDBACK_INCLUDE,
  FEEDBACK_WHERE_UNIQUE,
  FEEDBACK_CREATE,
  FEEDBACK_UPDATE,
  FEEDBACK_WHERE,
  FEEDBACK_WICTH_ID,
  FEEDBACK_ORDER,
  DEFAULT_INCLUDE,
} from "../dto/feedback.type";
import { LoggerService } from "src/shared/logger/logger.service";
import {
  DuplicateEntryException,
  EntityNotFoundException,
} from "src/shared/error/domain-errors";
import FeedbackModel from "../model/feedback.model";

@Injectable()
export default class FeedbackRepository extends FeedbackModel {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {
    super();
  }

  private format(entity: any) {
    if (entity && !entity.user && entity.metadata) {
      const metadata = entity.metadata as any;
      if (metadata.email) {
        entity.user = { email: metadata.email };
      }
    }
    return entity;
  }

  public async findMany({
    include,
    orderBy,
    skip,
    take,
    where,
  }: {
    where: FEEDBACK_WHERE;
    include?: FEEDBACK_INCLUDE;
    orderBy?: FEEDBACK_ORDER;
    skip: number;
    take: number;
  }) {
    const entityPromise = this.prisma.feedback.findMany({
      where,
      include: include ? include : DEFAULT_INCLUDE,
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
    where: FEEDBACK_WHERE;
    include?: FEEDBACK_INCLUDE;
  }) {
    const entity = await this.prisma.feedback.findFirst({
      where,
      include: {
        ...DEFAULT_INCLUDE,
      },
    });

    return this.format(entity);
  }

  public async create({ data }: { data: FEEDBACK_CREATE }) {
    const prev = new DomainEvent({
      action: this.EVENT_CREATED,
      entityName: this.MODEL_NAME,
      payload: data,
    });
    this.eventEmitter.emit(this.EVENT_CREATED, prev);
    this.logger.logInfo(`Creando feedback: ${data.message}`);

    try {
      const entity = await this.prisma.feedback.create({
        data,
        include: DEFAULT_INCLUDE,
      });

      const success = new DomainEvent({
        action: this.EVENT_CREATED_SUSSCESS,
        entityName: this.MODEL_NAME,
        payload: entity,
      });
      this.eventEmitter.emit(this.EVENT_CREATED_SUSSCESS, success);
      this.logger.logInfo(`feedback creado: ${data.message}`);

      return this.format(entity);
    } catch (error) {
      // Manejo de errores específicos
      if (error.code === "P2002") {
        // Unique constraint failed
        const target =
          (error.meta?.target as string[])?.join(", ") || "campo único";
        throw new DuplicateEntryException(
          `El valor para ${target} ya está en uso.`,
        );
      }

      // Relanzar otros errores para que el Filter genérico (500) los maneje
      throw error;
    }
  }

  public async update({
    data,
    where,
  }: {
    data: FEEDBACK_UPDATE;
    where: FEEDBACK_WICTH_ID;
  }) {
    const prev = new DomainEvent({
      action: this.EVENT_UPDATED,
      entityName: this.MODEL_NAME,
      payload: data,
    });
    this.eventEmitter.emit(this.EVENT_UPDATED, prev);
    this.logger.logInfo(`Actualizando feedback: ${data.message || where.id}`);

    try {
      const entity = await this.prisma.feedback.update({
        where,
        data,
        include: DEFAULT_INCLUDE,
      });

      const success = new DomainEvent({
        action: this.EVENT_UPDATED_SUCCESS,
        entityName: this.MODEL_NAME,
        payload: data,
      });
      this.eventEmitter.emit(this.EVENT_UPDATED_SUCCESS, success);
      this.logger.logInfo(`feedback actualizado: ${where.id}`);

      return this.format(entity);
    } catch (error) {
      // Emitir evento de fallo
      const failed = new DomainEvent({
        action: this.EVENT_UPDATED_FAILED,
        entityName: this.MODEL_NAME,
        payload: data,
        metadata: { error: error },
      });
      this.eventEmitter.emit(this.EVENT_UPDATED_FAILED, failed);
      this.logger.logError(`Error al actualizar feedback: ${where.id}`, error);

      // Traducción de errores
      if (error.code === "P2025") {
        // Record not found
        throw new EntityNotFoundException(`feedback con ID ${where.id}`);
      }
      if (error.code === "P2002") {
        // Unique constraint
        throw new DuplicateEntryException(
          "Datos duplicados (email o username ya existen).",
        );
      }

      throw error;
    }
  }

  public async delete({ where }: { where: FEEDBACK_WICTH_ID }) {
    const prev = new DomainEvent({
      action: this.EVENT_DELETED,
      entityName: this.MODEL_NAME,
      payload: where,
    });
    this.eventEmitter.emit(this.EVENT_DELETED, prev);
    this.logger.logInfo(`Eliminando feedback: ${where.id}`);

    try {
      const entity = await this.prisma.feedback.update({
        where,
        data: { deletedAt: new Date() },
      });

      const success = new DomainEvent({
        action: this.EVENT_DELETED_SUCCESS,
        entityName: this.MODEL_NAME,
        payload: where,
      });
      this.eventEmitter.emit(this.EVENT_DELETED_SUCCESS, success);
      this.logger.logInfo(`feedback eliminado: ${where.id}`);

      return this.format(entity);
    } catch (error) {
      const failed = new DomainEvent({
        action: this.EVENT_DELETED_FAILED,
        entityName: this.MODEL_NAME,
        payload: where,
        metadata: { error: error },
      });
      this.eventEmitter.emit(this.EVENT_DELETED_FAILED, failed);
      this.logger.logError(`Error al eliminar feedback: ${where.id}`, error);

      if (error.code === "P2025") {
        throw new EntityNotFoundException(`feedback con ID ${where.id}`);
      }

      throw error;
    }
  }

  public async count({ where }: { where: FEEDBACK_WHERE }) {
    return await this.prisma.feedback.count({ where });
  }

  public async upsert({
    where,
    create,
    update,
  }: {
    where: FEEDBACK_WHERE_UNIQUE;
    create: FEEDBACK_CREATE;
    update: FEEDBACK_UPDATE;
  }) {
    const prev = new DomainEvent({
      action: this.EVENT_UPDATED,
      entityName: this.MODEL_NAME,
      payload: where,
    });
    this.eventEmitter.emit(this.EVENT_UPDATED, prev);

    try {
      const entity = await this.prisma.feedback.upsert({
        where,
        create,
        update,
      });

      const success = new DomainEvent({
        action: this.EVENT_UPDATED_SUCCESS,
        entityName: this.MODEL_NAME,
        payload: where,
      });
      this.eventEmitter.emit(this.EVENT_UPDATED_SUCCESS, success);
      return this.format(entity); // Formatear respuesta también aquí
    } catch (error) {
      const failed = new DomainEvent({
        action: this.EVENT_UPDATED_FAILED,
        entityName: this.MODEL_NAME,
        payload: where,
        metadata: { error: error },
      });
      this.eventEmitter.emit(this.EVENT_UPDATED_FAILED, failed);

      if (error.code === "P2002") throw new DuplicateEntryException();

      throw error;
    }
  }
}
