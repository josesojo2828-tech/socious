import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "nestjs-prisma";
import { DomainEvent } from "src/shared/event/domain-listener";
import UserPaymentMethodModel from "../model/user-payment-method.model";
import {
  USER_PAYMENT_METHOD_WHERE,
  USER_PAYMENT_METHOD_INCLUDE,
  USER_PAYMENT_METHOD_ORDER,
  USER_PAYMENT_METHOD_CREATE,
  USER_PAYMENT_METHOD_UPDATE,
  USER_PAYMENT_METHOD_WICTH_ID,
  USER_PAYMENT_METHOD_DEFAULT_INCLUDE,
  USER_PAYMENT_METHOD_WHERE_UNIQUE,
} from "../dto/user-payment-method.types";
import type { IUserPaymentMethod } from "src/shared/types/schema.types";
import { LoggerService } from "src/shared/logger/logger.service";
import {
  DuplicateEntryException,
  EntityNotFoundException,
} from "src/shared/error/domain-errors";

@Injectable()
export default class UserPaymentMethodRepository extends UserPaymentMethodModel {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {
    super();
  }

  private format(entity: any): IUserPaymentMethod {
    // if (!entity) return null; // Protección contra nulos

    return {
      id: entity.id,
      userId: entity.userId,
      paymentMethodId: entity.paymentMethodId,
      details: entity.details,
      isDefault: entity.isDefault,
      active: entity.active ? true : false,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      deletedAt: entity.deletedAt,
      paymentMethod: entity.paymentMethod,
      user: entity.user,
    };
  }

  public async findMany({
    include,
    orderBy,
    skip,
    take,
    where,
  }: {
    where: USER_PAYMENT_METHOD_WHERE;
    include?: USER_PAYMENT_METHOD_INCLUDE;
    orderBy?: USER_PAYMENT_METHOD_ORDER;
    skip: number;
    take: number;
  }) {
    const entityPromise = this.prisma.userPaymentMethod.findMany({
      where,
      include: USER_PAYMENT_METHOD_DEFAULT_INCLUDE,
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
    where: USER_PAYMENT_METHOD_WHERE;
    include?: USER_PAYMENT_METHOD_INCLUDE;
  }) {
    const entityPromise = this.prisma.userPaymentMethod.findFirst({
      where,
      include: include ? include : USER_PAYMENT_METHOD_DEFAULT_INCLUDE,
    });
    const entity = await entityPromise;
    return this.format(entity);
  }

  public async create({ data }: { data: USER_PAYMENT_METHOD_CREATE }) {
    const prev = new DomainEvent({
      action: this.EVENT_CREATED,
      entityName: this.MODEL_NAME,
      payload: data,
    });
    this.eventEmitter.emit(this.EVENT_CREATED, prev);
    this.logger.logInfo(
      `Agregando método de pago a usuario: ${data.user.connect?.id}`,
    );

    try {
      if (data.isDefault === true) {
        const userId = data.user.connect?.id;
        if (userId) {
          await this.prisma.userPaymentMethod.updateMany({
            where: {
              userId,
              deletedAt: null,
            },
            data: {
              isDefault: false,
            },
          });
        }
      }

      const entityPromise = this.prisma.userPaymentMethod.create({
        data,
        include: USER_PAYMENT_METHOD_DEFAULT_INCLUDE,
      });

      const entity = await entityPromise;

      const success = new DomainEvent({
        action: this.EVENT_CREATED_SUSSCESS,
        entityName: this.MODEL_NAME,
        payload: data,
      });
      this.eventEmitter.emit(this.EVENT_CREATED_SUSSCESS, success);
      this.logger.logInfo(`Método de pago agregado: ${entity.id}`);

      return this.format(entity);
    } catch (error) {
      const failed = new DomainEvent({
        action: this.EVENT_CREATED_FAILED,
        entityName: this.MODEL_NAME,
        payload: data,
        metadata: { error: error },
      });
      this.eventEmitter.emit(this.EVENT_CREATED_FAILED, failed);
      this.logger.logError(`Error agregando método de pago`, error);

      if (error.code === "P2002") {
        throw new DuplicateEntryException(
          "El usuario ya tiene asignado este método de pago.",
        );
      }
      throw error;
    }
  }

  public async update({
    data,
    where,
  }: {
    data: USER_PAYMENT_METHOD_UPDATE;
    where: USER_PAYMENT_METHOD_WICTH_ID;
  }) {
    const prev = new DomainEvent({
      action: this.EVENT_UPDATED,
      entityName: this.MODEL_NAME,
      payload: data,
    });
    this.eventEmitter.emit(this.EVENT_UPDATED, prev);
    this.logger.logInfo(`Actualizando método de pago usuario: ${where.id}`);

    try {
      if (data.isDefault === true) {
        const current = await this.prisma.userPaymentMethod.findUnique({
          where,
          select: { userId: true },
        });
        if (current) {
          await this.prisma.userPaymentMethod.updateMany({
            where: {
              userId: current.userId,
              id: { not: where.id },
              deletedAt: null,
            },
            data: {
              isDefault: false,
            },
          });
        }
      }

      const entityPromise = this.prisma.userPaymentMethod.update({
        where,
        data,
        include: USER_PAYMENT_METHOD_DEFAULT_INCLUDE,
      });

      const entity = await entityPromise;

      const success = new DomainEvent({
        action: this.EVENT_UPDATED_SUCCESS,
        entityName: this.MODEL_NAME,
        payload: data,
      });
      this.eventEmitter.emit(this.EVENT_UPDATED_SUCCESS, success);
      this.logger.logInfo(`Método de pago actualizado: ${where.id}`);

      return this.format(entity);
    } catch (error) {
      const failed = new DomainEvent({
        action: this.EVENT_UPDATED_FAILED,
        entityName: this.MODEL_NAME,
        payload: data,
        metadata: { error: error },
      });
      this.eventEmitter.emit(this.EVENT_UPDATED_FAILED, failed);
      this.logger.logError(`Error actualizando método de pago`, error);

      if (error.code === "P2025") {
        throw new EntityNotFoundException(
          `Registro de pago con ID ${where.id}`,
        );
      }
      throw error;
    }
  }

  public async delete({ where }: { where: USER_PAYMENT_METHOD_WICTH_ID }) {
    const prev = new DomainEvent({
      action: this.EVENT_DELETED,
      entityName: this.MODEL_NAME,
      payload: where,
    });
    this.eventEmitter.emit(this.EVENT_DELETED, prev);
    this.logger.logInfo(`Eliminando método de pago usuario: ${where.id}`);

    try {
      // Soft Delete para mantener historial
      const entityPromise = this.prisma.userPaymentMethod.update({
        where,
        data: { deletedAt: new Date() },
        include: USER_PAYMENT_METHOD_DEFAULT_INCLUDE,
      });

      const entity = await entityPromise;

      const success = new DomainEvent({
        action: this.EVENT_DELETED_SUCCESS,
        entityName: this.MODEL_NAME,
        payload: where,
      });
      this.eventEmitter.emit(this.EVENT_DELETED_SUCCESS, success);
      this.logger.logInfo(`Método de pago eliminado: ${where.id}`);

      return this.format(entity);
    } catch (error) {
      const failed = new DomainEvent({
        action: this.EVENT_DELETED_FAILED,
        entityName: this.MODEL_NAME,
        payload: where,
        metadata: { error: error },
      });
      this.eventEmitter.emit(this.EVENT_DELETED_FAILED, failed);
      this.logger.logError(`Error eliminando método de pago`, error);

      if (error.code === "P2025") {
        throw new EntityNotFoundException(
          `Registro de pago con ID ${where.id}`,
        );
      }
      throw error;
    }
  }

  public async count({ where }: { where: USER_PAYMENT_METHOD_WHERE }) {
    return await this.prisma.userPaymentMethod.count({ where });
  }

  public async upsert({
    where,
    create,
    update,
  }: {
    where: USER_PAYMENT_METHOD_WHERE_UNIQUE;
    create: USER_PAYMENT_METHOD_CREATE;
    update: USER_PAYMENT_METHOD_UPDATE;
  }) {
    const prev = new DomainEvent({
      action: this.EVENT_UPDATED,
      entityName: this.MODEL_NAME,
      payload: where,
    });
    this.eventEmitter.emit(this.EVENT_UPDATED, prev);

    try {
      const entityPromise = this.prisma.userPaymentMethod.upsert({
        where,
        create,
        update,
        include: USER_PAYMENT_METHOD_DEFAULT_INCLUDE,
      });

      const entity = await entityPromise;

      const success = new DomainEvent({
        action: this.EVENT_UPDATED_SUCCESS,
        entityName: this.MODEL_NAME,
        payload: where,
      });
      this.eventEmitter.emit(this.EVENT_UPDATED_SUCCESS, success);
      this.logger.logInfo(`UPSERT método de pago usuario: ${where.id}`);

      return this.format(entity);
    } catch (error) {
      const failed = new DomainEvent({
        action: this.EVENT_UPDATED_FAILED,
        entityName: this.MODEL_NAME,
        payload: where,
        metadata: { error: error },
      });
      this.eventEmitter.emit(this.EVENT_UPDATED_FAILED, failed);
      this.logger.logError(`Error en upsert método de pago`, error);

      if (error.code === "P2002") throw new DuplicateEntryException();

      throw error;
    }
  }
}
