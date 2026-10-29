import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "nestjs-prisma";
import { DomainEvent } from "src/shared/event/domain-listener";
import { Transaction } from "src/shared/types/schema.types";
import TransactionModel from "../model/transaction.model";
import {
  TRANSACTION_WHERE,
  TRANSACTION_INCLUDE,
  TRANSACTION_ORDER,
  TRANSACTION_CREATE,
  TRANSACTION_UPDATE,
  TRANSACTION_WICTH_ID,
  TRANSACTION_DEFAULT_INCLUDE,
  TRANSACTION_WHERE_UNIQUE,
} from "../dto/transaction.type";
import { LoggerService } from "src/shared/logger/logger.service";

@Injectable()
export default class TransactionReporitory extends TransactionModel {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private logger: LoggerService,
  ) {
    super();
  }

  public format(entity: any): Transaction {
    return {
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      deletedAt: entity.deletedAt,

      id: entity.id,

      description: entity.description,
      amount: entity.amount,
      referenceCode: entity.referenceCode,
      status: entity.status,
      userId: entity.userId,
      // walletId: entity.walletId,
      type: entity.type,

      user: entity.user,
      paymentMethodId: entity.paymentMethodId,
      paymentMethod: entity.paymentMethod,
    };
  }

  public async findMany({
    include,
    orderBy,
    skip,
    take,
    where,
  }: {
    where: TRANSACTION_WHERE;
    include?: TRANSACTION_INCLUDE;
    orderBy?: TRANSACTION_ORDER;
    skip: number;
    take: number;
  }) {
    const entityPromise = this.prisma.transaction.findMany({
      where,
      include: include ? include : TRANSACTION_DEFAULT_INCLUDE,
      orderBy: orderBy ? orderBy : { createdAt: "desc" },
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
    where: TRANSACTION_WHERE_UNIQUE;
    include?: TRANSACTION_INCLUDE;
  }) {
    const entityPromise = this.prisma.transaction.findFirst({
      where,
      include: include ? include : TRANSACTION_DEFAULT_INCLUDE,
    });

    const entity = await entityPromise;
    return this.format(entity);
  }

  public async create({ data }: { data: TRANSACTION_CREATE }) {
    this.logger.logInfo(`Creando transaccion: ${data.description}`);
    const organizationId = await this.resolveOrganizationId(data);
    const entityPromise = this.prisma.transaction.create({
      data: organizationId
        ? { ...data, organization: { connect: { id: organizationId } } }
        : data,
    });

    const entity = await entityPromise;
    this.logger.logInfo(`Transaccion creada: ${data.description}`);
    return entity;
  }

  /**
   * D9: populate `Transaction.organizationId` from the related subscription when
   * determinable. If the caller already provided the relation, honor it. Unknown
   * orgs stay null and are DOCUMENTED as excluded from org-scoped analytics
   * (`admin-analytics.service`), never crashing the filter.
   */
  private async resolveOrganizationId(
    data: TRANSACTION_CREATE,
  ): Promise<string | null> {
    const provided = (data as any)?.organization?.connect?.id;
    if (typeof provided === "string" && provided.length > 0) return provided;

    const userId = (data as any)?.user?.connect?.id;
    if (!userId) return null;

    try {
      const subscription = await this.prisma.subscription.findFirst({
        where: { userId, organizationId: { not: null }, status: "ACTIVE" },
        orderBy: { startDate: "desc" },
        select: { organizationId: true },
      });
      return subscription?.organizationId ?? null;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.logError(
        `No se pudo resolver la organización de la transacción: ${message}`,
        message,
      );
      return null;
    }
  }

  public async update({
    data,
    where,
  }: {
    data: TRANSACTION_UPDATE;
    where: TRANSACTION_WICTH_ID;
  }) {
    this.logger.logInfo(`Actualizando transaccion: ${data.description}`);
    const entityPromise = this.prisma.transaction.update({
      where,
      data,
      include: TRANSACTION_DEFAULT_INCLUDE,
    });

    const entity = await entityPromise;
    this.logger.logInfo(`Transaccion actualizada: ${data.description}`);
    return this.format(entity);
  }

  public async delete({ where }: { where: TRANSACTION_WICTH_ID }) {
    this.logger.logInfo(`Eliminando transaccion: ${where.id}`);
    const entityPromise = this.prisma.transaction.delete({ where });

    const entity = await entityPromise;
    this.logger.logInfo(`Transaccion eliminada: ${where.id}`);
    return entity;
  }

  public async count({ where }: { where: TRANSACTION_WHERE }) {
    const entityPromise = this.prisma.transaction.count({
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
    where: TRANSACTION_WHERE_UNIQUE;
    create: TRANSACTION_CREATE;
    update: TRANSACTION_UPDATE;
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
    // this.logger.logInfo(`UPSERT transaccion: ${where.id}`);

    try {
      const entityPromise = this.prisma.transaction.upsert({
        where,
        create,
        update,
      });

      const entity = await entityPromise;
      this.eventEmitter.emit(this.EVENT_UPDATED_SUCCESS, success);
      this.logger.logInfo(`Transaccion actualizada: ${where.id}`);
      return entity;
    } catch (error) {
      const failed = new DomainEvent({
        action: this.EVENT_UPDATED_FAILED,
        entityName: this.MODEL_NAME,
        payload: where,
        metadata: { error: error },
      });
      this.eventEmitter.emit(this.EVENT_UPDATED_FAILED, failed);
      // this.logger.logError(`UPSERT transaccion error: ${where.id}`, error);
      return { error: true, object: error };
    }
  }
}
