import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "nestjs-prisma";
import { DomainEvent } from "src/shared/event/domain-listener";
import { IPaymentMethod } from "src/shared/types/schema.types";
import PaymentMethodModel from "../model/payment-method.model";
import {
  PAYMENT_METHOD_WHERE,
  PAYMENT_METHOD_INCLUDE,
  PAYMENT_METHOD_ORDER,
  PAYMENT_METHOD_CREATE,
  PAYMENT_METHOD_UPDATE,
  PAYMENT_METHOD_WICTH_ID,
  PAYMENT_METHOD_DEFAULT_INCLUDE,
  PAYMENT_METHOD_WHERE_UNIQUE,
} from "../dto/payment-method.type";
import { LoggerService } from "src/shared/logger/logger.service";
import {
  DuplicateEntryException,
  EntityNotFoundException,
} from "src/shared/error/domain-errors";

@Injectable()
export default class PaymentMethodRepository extends PaymentMethodModel {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {
    super();
  }

  public format(entity: any): IPaymentMethod {
    // if (!entity) return null;

    return {
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      deletedAt: entity.deletedAt,
      id: entity.id,
      name: entity.name,
      description: entity.description,
      code: entity.code,
      imagePath: entity.imagePath,
      colorStart: entity.colorStart,
      colorEnd: entity.colorEnd,
      colorText: entity.colorText,
      active: entity.active ? true : false,
      userMethods: entity.userMethods,
      fields: entity.fields,
    };
  }

  // ... findMany y findOne se mantienen igual ...
  public async findMany({
    include,
    orderBy,
    skip,
    take,
    where,
  }: {
    where: PAYMENT_METHOD_WHERE;
    include?: PAYMENT_METHOD_INCLUDE;
    orderBy?: PAYMENT_METHOD_ORDER;
    skip: number;
    take: number;
  }) {
    const entityPromise = this.prisma.paymentMethod.findMany({
      where,
      include: include ? include : PAYMENT_METHOD_DEFAULT_INCLUDE,
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
    where: PAYMENT_METHOD_WHERE_UNIQUE;
    include?: PAYMENT_METHOD_INCLUDE;
  }) {
    const entityPromise = this.prisma.paymentMethod.findUnique({
      where,
      include: include ? include : PAYMENT_METHOD_DEFAULT_INCLUDE,
    });
    const entity = await entityPromise;
    return this.format(entity);
  }

  public async create({ data }: { data: PAYMENT_METHOD_CREATE }) {
    const prev = new DomainEvent({
      action: this.EVENT_CREATED,
      entityName: this.MODEL_NAME,
      payload: data,
    });
    this.eventEmitter.emit(this.EVENT_CREATED, prev);
    this.logger.logInfo(`Creando metodo de pago: ${data.name}`);

    try {
      const entity = await this.prisma.paymentMethod.create({
        data,
        include: PAYMENT_METHOD_DEFAULT_INCLUDE,
      });

      const success = new DomainEvent({
        action: this.EVENT_CREATED_SUSSCESS,
        entityName: this.MODEL_NAME,
        payload: data,
      });
      this.eventEmitter.emit(this.EVENT_CREATED_SUSSCESS, success);
      this.logger.logInfo(`Metodo de pago creado: ${data.name}`);

      return this.format(entity);
    } catch (error) {
      const failed = new DomainEvent({
        action: this.EVENT_CREATED_FAILED,
        entityName: this.MODEL_NAME,
        payload: data,
        metadata: { error: error },
      });
      this.eventEmitter.emit(this.EVENT_CREATED_FAILED, failed);

      if (error.code === "P2002") throw new DuplicateEntryException();
      throw error;
    }
  }

  public async update({
    data,
    where,
  }: {
    data: PAYMENT_METHOD_UPDATE;
    where: PAYMENT_METHOD_WICTH_ID;
  }) {
    const prev = new DomainEvent({
      action: this.EVENT_UPDATED,
      entityName: this.MODEL_NAME,
      payload: data,
    });
    this.eventEmitter.emit(this.EVENT_UPDATED, prev);
    this.logger.logInfo(`Actualizando metodo de pago: ${where.id}`);

    try {
      const entity = await this.prisma.paymentMethod.update({
        where,
        data,
        include: PAYMENT_METHOD_DEFAULT_INCLUDE,
      });

      const success = new DomainEvent({
        action: this.EVENT_UPDATED_SUCCESS,
        entityName: this.MODEL_NAME,
        payload: data,
      });
      this.eventEmitter.emit(this.EVENT_UPDATED_SUCCESS, success);
      this.logger.logInfo(`Metodo de pago actualizado: ${where.id}`);
      return this.format(entity);
    } catch (error) {
      const failed = new DomainEvent({
        action: this.EVENT_UPDATED_FAILED,
        entityName: this.MODEL_NAME,
        payload: data,
        metadata: { error: error },
      });
      this.eventEmitter.emit(this.EVENT_UPDATED_FAILED, failed);

      if (error.code === "P2025")
        throw new EntityNotFoundException(`Método de pago con ID ${where.id}`);
      if (error.code === "P2002") throw new DuplicateEntryException();
      throw error;
    }
  }

  public async delete({ where }: { where: PAYMENT_METHOD_WICTH_ID }) {
    const prev = new DomainEvent({
      action: this.EVENT_DELETED,
      entityName: this.MODEL_NAME,
      payload: where,
    });
    this.eventEmitter.emit(this.EVENT_DELETED, prev);

    try {
      const entity = await this.prisma.paymentMethod.update({
        where,
        data: { deletedAt: new Date() },
        include: PAYMENT_METHOD_DEFAULT_INCLUDE,
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
        metadata: { error: error },
      });
      this.eventEmitter.emit(this.EVENT_DELETED_FAILED, failed);
      if (error.code === "P2025")
        throw new EntityNotFoundException(`Método de pago con ID ${where.id}`);
      throw error;
    }
  }

  public async count({ where }: { where: PAYMENT_METHOD_WHERE }) {
    return await this.prisma.paymentMethod.count({ where });
  }

  // --- UPSERT SIMPLIFICADO ---
  public async upsert({
    where,
    create,
    update,
  }: {
    where: PAYMENT_METHOD_WHERE_UNIQUE;
    create: PAYMENT_METHOD_CREATE;
    update: PAYMENT_METHOD_UPDATE;
  }) {
    const prev = new DomainEvent({
      action: this.EVENT_UPDATED,
      entityName: this.MODEL_NAME,
      payload: where,
    });
    this.eventEmitter.emit(this.EVENT_UPDATED, prev);

    try {
      // Forzamos deletedAt: null para intentar reactivarlo si existe y Prisma lo permite
      const entity = await this.prisma.paymentMethod.upsert({
        where,
        create,
        update: { ...update, deletedAt: null },
        include: PAYMENT_METHOD_DEFAULT_INCLUDE,
      });

      const success = new DomainEvent({
        action: this.EVENT_UPDATED_SUCCESS,
        entityName: this.MODEL_NAME,
        payload: where,
      });
      this.eventEmitter.emit(this.EVENT_UPDATED_SUCCESS, success);
      this.logger.logInfo(
        `UPSERT método de pago exitoso: ${where.id || create.name}`,
      );

      return this.format(entity);
    } catch (error) {
      // --- CAMBIO AQUÍ: SILENCIAR EL ERROR P2002 ---
      if (error.code === "P2002") {
        // Simplemente avisamos en consola que se saltó, pero NO lanzamos error.
        this.logger.warn(
          `Upsert omitido para ID '${where.id}': El registro ya existe o hay conflicto de ID.`,
        );

        // Retornamos null para que el flujo quien llame a esta función continúe
        return null;
      }

      const failed = new DomainEvent({
        action: this.EVENT_UPDATED_FAILED,
        entityName: this.MODEL_NAME,
        payload: where,
        metadata: { error: error },
      });
      this.eventEmitter.emit(this.EVENT_UPDATED_FAILED, failed);
      this.logger.logError(`UPSERT error inesperado`, error);

      throw error;
    }
  }
}
