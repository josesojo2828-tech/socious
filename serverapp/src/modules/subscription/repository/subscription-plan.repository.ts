import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "nestjs-prisma";
import { DomainEvent } from "src/shared/event/domain-listener";
import { SubscriptionPlan } from "src/shared/types/schema.types";
import SubscriptionPlanModel from "../model/subscription-plan.model";
import {
  SUBSCRIPTION_PLAN_WHERE,
  SUBSCRIPTION_PLAN_INCLUDE,
  SUBSCRIPTION_PLAN_ORDER,
  SUBSCRIPTION_PLAN_CREATE,
  SUBSCRIPTION_PLAN_UPDATE,
  SUBSCRIPTION_PLAN_WICTH_ID,
  SUBSCRIPTION_PLAN_DEFAULT_INCLUDE,
  SUBSCRIPTION_PLAN_WHERE_UNIQUE,
} from "../dto/subscription-plan.type";
import { LoggerService } from "src/shared/logger/logger.service";
import {
  DuplicateEntryException,
  EntityNotFoundException,
} from "src/shared/error/domain-errors";

@Injectable()
export default class SubscriptionPlanRepository extends SubscriptionPlanModel {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {
    super();
  }

  public format(entity: any): SubscriptionPlan {
    // if (!entity) return null; // Protección contra nulos

    return {
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      deletedAt: entity.deletedAt,

      id: entity.id,

      name: entity.name,
      description: entity.description,
      price: entity.price,
      currency: entity.currency,

      content: entity.content,
      subscriptions: entity.subscriptions,
    };
  }

  public async findMany({
    include,
    orderBy,
    skip,
    take,
    where,
  }: {
    where: SUBSCRIPTION_PLAN_WHERE;
    include?: SUBSCRIPTION_PLAN_INCLUDE;
    orderBy?: SUBSCRIPTION_PLAN_ORDER;
    skip: number;
    take: number;
  }) {
    const entityPromise = this.prisma.subscriptionPlan.findMany({
      where,
      include: include ? include : SUBSCRIPTION_PLAN_DEFAULT_INCLUDE,
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
    where: SUBSCRIPTION_PLAN_WHERE_UNIQUE;
    include?: SUBSCRIPTION_PLAN_INCLUDE;
  }) {
    const entityPromise = this.prisma.subscriptionPlan.findFirst({
      where,
      include: include ? include : SUBSCRIPTION_PLAN_DEFAULT_INCLUDE,
    });

    const entity = await entityPromise;
    return this.format(entity);
  }

  public async create({ data }: { data: SUBSCRIPTION_PLAN_CREATE }) {
    const prev = new DomainEvent({
      action: this.EVENT_CREATED,
      entityName: this.MODEL_NAME,
      payload: data,
    });
    this.eventEmitter.emit(this.EVENT_CREATED, prev);
    this.logger.logInfo(`Creando plan de suscripcion: ${data.name}`);

    try {
      const entity = await this.prisma.subscriptionPlan.create({
        data,
        include: SUBSCRIPTION_PLAN_DEFAULT_INCLUDE, // Asegurar que devolvemos la data completa
      });

      const success = new DomainEvent({
        action: this.EVENT_CREATED_SUSSCESS,
        entityName: this.MODEL_NAME,
        payload: data,
      });
      this.eventEmitter.emit(this.EVENT_CREATED_SUSSCESS, success);
      this.logger.logInfo(`Plan de suscripcion creado: ${data.name}`);

      return this.format(entity);
    } catch (error) {
      const failed = new DomainEvent({
        action: this.EVENT_CREATED_FAILED,
        entityName: this.MODEL_NAME,
        payload: data,
        metadata: { error: error },
      });
      this.eventEmitter.emit(this.EVENT_CREATED_FAILED, failed);
      this.logger.logError(`Error creando plan`, error);

      if (error.code === "P2002") {
        throw new DuplicateEntryException(
          `El nombre del plan '${data.name}' ya existe.`,
        );
      }
      throw error;
    }
  }

  public async update({
    data,
    where,
  }: {
    data: SUBSCRIPTION_PLAN_UPDATE;
    where: SUBSCRIPTION_PLAN_WICTH_ID;
  }) {
    const prev = new DomainEvent({
      action: this.EVENT_UPDATED,
      entityName: this.MODEL_NAME,
      payload: data,
    });
    this.eventEmitter.emit(this.EVENT_UPDATED, prev);
    this.logger.logInfo(`Actualizando plan de suscripcion: ID:${where.id}`);

    try {
      const entity = await this.prisma.subscriptionPlan.update({
        where,
        data,
        include: SUBSCRIPTION_PLAN_DEFAULT_INCLUDE,
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

  public async delete({ where }: { where: SUBSCRIPTION_PLAN_WICTH_ID }) {
    const prev = new DomainEvent({
      action: this.EVENT_DELETED,
      entityName: this.MODEL_NAME,
      payload: where,
    });
    this.eventEmitter.emit(this.EVENT_DELETED, prev);
    this.logger.logInfo(`Eliminando plan de suscripcion: ${where.id}`);

    try {
      // Usamos update para Soft Delete (deletedAt)
      const entity = await this.prisma.subscriptionPlan.update({
        where,
        data: { deletedAt: new Date() },
        include: SUBSCRIPTION_PLAN_DEFAULT_INCLUDE,
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

  public async count({ where }: { where: SUBSCRIPTION_PLAN_WHERE }) {
    return await this.prisma.subscriptionPlan.count({ where });
  }

  public async upsert({
    where,
    create,
    update,
  }: {
    where: SUBSCRIPTION_PLAN_WHERE_UNIQUE;
    create: SUBSCRIPTION_PLAN_CREATE;
    update: SUBSCRIPTION_PLAN_UPDATE;
  }) {
    const prev = new DomainEvent({
      action: this.EVENT_UPDATED,
      entityName: this.MODEL_NAME,
      payload: where,
    });
    this.eventEmitter.emit(this.EVENT_UPDATED, prev);

    try {
      const entity = await this.prisma.subscriptionPlan.upsert({
        where,
        create,
        update,
        include: SUBSCRIPTION_PLAN_DEFAULT_INCLUDE,
      });

      const success = new DomainEvent({
        action: this.EVENT_UPDATED_SUCCESS,
        entityName: this.MODEL_NAME,
        payload: where,
      });
      this.eventEmitter.emit(this.EVENT_UPDATED_SUCCESS, success);
      this.logger.logInfo(`Plan de suscripcion upsert exitoso: ${where.id}`);

      return this.format(entity);
    } catch (error) {
      const failed = new DomainEvent({
        action: this.EVENT_UPDATED_FAILED,
        entityName: this.MODEL_NAME,
        payload: where,
        metadata: { error: error },
      });
      this.eventEmitter.emit(this.EVENT_UPDATED_FAILED, failed);
      this.logger.logError(`Error upsert plan`, error);

      if (error.code === "P2002") throw new DuplicateEntryException();

      throw error;
    }
  }
}
