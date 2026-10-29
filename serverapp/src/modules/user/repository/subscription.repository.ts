import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "nestjs-prisma";
import { DomainEvent } from "src/shared/event/domain-listener";
import {
  SUBSCRIPTION_WHERE,
  SUBSCRIPTION_CREATE,
  SUBSCRIPTION_ORDER,
  SUBSCRIPTION_INCLUDE,
  SUBSCRIPTION_UPDATE,
  SUBSCRIPTION_WITH_ID,
  SUBSCRIPTION_DEFAULT_INCLUDE,
  SUBSCRIPTION_SELECT,
} from "../dto/subscription.type";
import SubscriptionModel from "../model/subscription.model";
import { Subscription } from "src/shared/types/schema.types";
import { LoggerService } from "src/shared/logger/logger.service";
import {
  DuplicateEntryException,
  EntityNotFoundException,
} from "src/shared/error/domain-errors";

@Injectable()
export default class SubscriptionRepository extends SubscriptionModel {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {
    super();
  }

  private format(entity: any): Subscription | null {
    if (!entity) return null; // Protección contra nulos

    return {
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      deletedAt: entity.deletedAt,
      id: entity.id,
      userId: entity.userId,
      organizationId: entity.organizationId,
      planId: entity.planId,
      status: entity.status,
      startDate: entity.startDate,
      endDate: entity.endDate,
      autoRenew: entity.autoRenew,
      gracePeriodEndsAt: entity.gracePeriodEndsAt,
      readOnlyEndsAt: entity.readOnlyEndsAt,
      canceledAt: entity.canceledAt,
      lastPlanChangeAt: (entity as any).lastPlanChangeAt ?? null,
      plan: entity.plan,
      user: entity.user,
      organization: entity.organization,
    };
  }

  public async findMany({
    include,
    orderBy,
    skip,
    take,
    where,
  }: {
    where: SUBSCRIPTION_WHERE;
    include?: SUBSCRIPTION_INCLUDE;
    orderBy?: SUBSCRIPTION_ORDER;
    skip: number;
    take: number;
  }) {
    const entityPromise = this.prisma.subscription.findMany({
      where,
      select: SUBSCRIPTION_SELECT,
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
    where: SUBSCRIPTION_WHERE;
    include?: SUBSCRIPTION_INCLUDE;
  }) {
    const entityPromise = this.prisma.subscription.findFirst({
      where,
      select: SUBSCRIPTION_SELECT,
    });
    const entity = await entityPromise;
    return this.format(entity);
  }

  public async create({ data }: { data: SUBSCRIPTION_CREATE }) {
    const prev = new DomainEvent({
      action: this.EVENT_CREATED,
      entityName: this.MODEL_NAME,
      payload: data,
    });
    this.eventEmitter.emit(this.EVENT_CREATED, prev);
    this.logger.logInfo(
      `Creando subscripcion para usuario: ${data.user.connect?.id}`,
    );

    try {
      const entityPromise = this.prisma.subscription.create({
        data,
        select: SUBSCRIPTION_SELECT,
      });

      const entity = await entityPromise;

      const success = new DomainEvent({
        action: this.EVENT_CREATED_SUSSCESS,
        entityName: this.MODEL_NAME,
        payload: data,
      });
      this.eventEmitter.emit(this.EVENT_CREATED_SUSSCESS, success);
      this.logger.logInfo(`Subscricion creada: ${entity.id}`);

      return this.format(entity);
    } catch (error) {
      const failed = new DomainEvent({
        action: this.EVENT_CREATED_FAILED,
        entityName: this.MODEL_NAME,
        payload: data,
        metadata: { error: error },
      });
      this.eventEmitter.emit(this.EVENT_CREATED_FAILED, failed);
      this.logger.logError(`Error creando suscripción`, error);

      if (error.code === "P2002") {
        throw new DuplicateEntryException(
          "El usuario ya tiene una suscripción activa o en proceso.",
        );
      }
      throw error;
    }
  }

  public async update({
    data,
    where,
  }: {
    data: SUBSCRIPTION_UPDATE;
    where: SUBSCRIPTION_WITH_ID;
  }) {
    const prev = new DomainEvent({
      action: this.EVENT_UPDATED,
      entityName: this.MODEL_NAME,
      payload: data,
    });
    this.eventEmitter.emit(this.EVENT_UPDATED, prev);
    this.logger.logInfo(`Actualizando subscripcion: ${where.id}`);

    try {
      const entityPromise = this.prisma.subscription.update({
        where,
        data,
        select: SUBSCRIPTION_SELECT,
      });

      const entity = await entityPromise;

      const success = new DomainEvent({
        action: this.EVENT_UPDATED_SUCCESS,
        entityName: this.MODEL_NAME,
        payload: data,
      });
      this.eventEmitter.emit(this.EVENT_UPDATED_SUCCESS, success);
      this.logger.logInfo(`Subscricion actualizada: ${where.id}`);

      return this.format(entity);
    } catch (error) {
      const failed = new DomainEvent({
        action: this.EVENT_UPDATED_FAILED,
        entityName: this.MODEL_NAME,
        payload: data,
        metadata: { error: error },
      });
      this.eventEmitter.emit(this.EVENT_UPDATED_FAILED, failed);
      this.logger.logError(`Error actualizando suscripción`, error);

      if (error.code === "P2025") {
        throw new EntityNotFoundException(`Suscripción con ID ${where.id}`);
      }
      throw error;
    }
  }

  public async delete({ where }: { where: SUBSCRIPTION_WITH_ID }) {
    const prev = new DomainEvent({
      action: this.EVENT_DELETED,
      entityName: this.MODEL_NAME,
      payload: where,
    });
    this.eventEmitter.emit(this.EVENT_DELETED, prev);
    this.logger.logInfo(`Eliminando subscripcion: ${where.id}`);

    try {
      const entityPromise = this.prisma.subscription.update({
        where,
        data: { deletedAt: new Date() },
        select: SUBSCRIPTION_SELECT,
      });

      const entity = await entityPromise;

      const success = new DomainEvent({
        action: this.EVENT_DELETED_SUCCESS,
        entityName: this.MODEL_NAME,
        payload: where,
      });
      this.eventEmitter.emit(this.EVENT_DELETED_SUCCESS, success);
      this.logger.logInfo(`Subscricion eliminada: ${where.id}`);

      return this.format(entity);
    } catch (error) {
      const failed = new DomainEvent({
        action: this.EVENT_DELETED_FAILED,
        entityName: this.MODEL_NAME,
        payload: where,
        metadata: { error: error },
      });
      this.eventEmitter.emit(this.EVENT_DELETED_FAILED, failed);
      this.logger.logError(`Error eliminando suscripción`, error);

      if (error.code === "P2025") {
        throw new EntityNotFoundException(`Suscripción con ID ${where.id}`);
      }
      throw error;
    }
  }

  public async findByUserAndWorkspace(userId: string, organizationId: string | null) {
    const whereClause: SUBSCRIPTION_WHERE = {
      userId,
      organizationId,
      deletedAt: null,
    };

    const entity = await this.prisma.subscription.findFirst({
      where: whereClause,
      select: SUBSCRIPTION_SELECT,
      orderBy: { createdAt: 'desc' },
    });

    return this.format(entity);
  }

  public async findByWorkspace(organizationId: string) {
    const entity = await this.prisma.subscription.findFirst({
      where: {
        organizationId,
        deletedAt: null,
        status: { in: ['ACTIVE', 'GRACE_PERIOD'] },
      },
      select: SUBSCRIPTION_SELECT,
      orderBy: { createdAt: 'desc' },
    });

    return this.format(entity);
  }

  public async countByUserAndWorkspace(userId: string, organizationId: string | null) {
    return await this.prisma.subscription.count({
      where: {
        userId,
        organizationId,
        deletedAt: null,
      },
    });
  }

  public async count({ where }: { where: SUBSCRIPTION_WHERE }) {
    return await this.prisma.subscription.count({ where });
  }

  public async getSubscriptionNext({
    userId,
    notId,
  }: {
    userId: string;
    notId?: string;
  }) {
    // Construcción dinámica del filtro para evitar undefined strings
    const whereClause: any = {
      status: "NEXT",
      userId,
    };

    if (notId) {
      whereClause.id = { not: notId };
    }

    const entity = await this.prisma.subscription.findFirst({
      where: whereClause,
      select: SUBSCRIPTION_SELECT,
    });

    return this.format(entity);
  }

  addOneMonth(date: Date): Date {
    const newDate = new Date(date);
    const currentMonth = newDate.getMonth();
    newDate.setMonth(currentMonth + 1);
    return newDate;
  }
}
