import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "nestjs-prisma";
import { DomainEvent } from "src/shared/event/domain-listener";
import WalletModel from "../model/wallet.model";
import {
  WALLET_WHERE,
  WALLET_INCLUDE,
  WALLET_ORDER,
  WALLET_CREATE,
  WALLET_UPDATE,
  WALLET_WICTH_ID,
  DEFAULT_INCLUDE,
} from "../dto/wallet.type";
import { UserWallet } from "src/shared/types/schema.types";
import { LoggerService } from "src/shared/logger/logger.service";

// IMPORTACIÓN DE ERRORES (Ruta corregida)
import {
  DuplicateEntryException,
  EntityNotFoundException,
} from "src/shared/error/domain-errors";

@Injectable()
export default class WalletRepository extends WalletModel {
  // Corregido typo en nombre de clase 'Reporitory' -> 'Repository'
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {
    super();
  }

  private format(entity: any): UserWallet {
    // if (!entity) return null; // Protección contra nulos

    return {
      id: entity.id,
      userId: entity.userId,
      balance: entity.balance,
      currency: entity.currency,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      deletedAt: entity.deletedAt,
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
    where: WALLET_WHERE;
    include?: WALLET_INCLUDE;
    orderBy?: WALLET_ORDER;
    skip: number;
    take: number;
  }) {
    const entityPromise = this.prisma.userWallet.findMany({
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
    where: WALLET_WHERE;
    include?: WALLET_INCLUDE;
  }) {
    const entityPromise = this.prisma.userWallet.findFirst({
      where,
      include: include ? include : DEFAULT_INCLUDE,
    });

    const entity = await entityPromise;
    // Retornamos null y dejamos que el Service decida si es error 404
    return this.format(entity);
  }

  public async create({ data }: { data: WALLET_CREATE }) {
    const prev = new DomainEvent({
      action: this.EVENT_CREATED,
      entityName: this.MODEL_NAME,
      payload: data,
    });
    this.eventEmitter.emit(this.EVENT_CREATED, prev);
    this.logger.logInfo(
      `Creando billetera para usuario: ${data.user.connect?.id}`,
    );

    try {
      const entityPromise = this.prisma.userWallet.create({
        data,
        include: DEFAULT_INCLUDE,
      });

      const entity = await entityPromise;

      const success = new DomainEvent({
        action: this.EVENT_CREATED_SUSSCESS,
        entityName: this.MODEL_NAME,
        payload: data,
      });
      this.eventEmitter.emit(this.EVENT_CREATED_SUSSCESS, success);
      this.logger.logInfo(`Billetera creada: ${entity.id}`);

      return this.format(entity);
    } catch (error) {
      const failed = new DomainEvent({
        action: this.EVENT_CREATED_FAILED,
        entityName: this.MODEL_NAME,
        payload: data,
        metadata: { error: error },
      });
      this.eventEmitter.emit(this.EVENT_CREATED_FAILED, failed);
      this.logger.logError(`Error al crear billetera`, error);

      // Manejo de duplicados (Ej: Usuario ya tiene una billetera en esa moneda)
      if (error.code === "P2002") {
        throw new DuplicateEntryException(
          "El usuario ya posee una billetera registrada.",
        );
      }

      throw error;
    }
  }

  public async update({
    data,
    where,
  }: {
    data: WALLET_UPDATE;
    where: WALLET_WICTH_ID;
  }) {
    const prev = new DomainEvent({
      action: this.EVENT_UPDATED,
      entityName: this.MODEL_NAME,
      payload: data,
    });
    this.eventEmitter.emit(this.EVENT_UPDATED, prev);
    this.logger.logInfo(`Actualizando billetera: ${where.id}`);

    try {
      const entityPromise = this.prisma.userWallet.update({
        where,
        data,
        include: DEFAULT_INCLUDE,
      });

      const entity = await entityPromise;

      const success = new DomainEvent({
        action: this.EVENT_UPDATED_SUCCESS,
        entityName: this.MODEL_NAME,
        payload: data,
      });
      this.eventEmitter.emit(this.EVENT_UPDATED_SUCCESS, success);
      this.logger.logInfo(`Billetera actualizada: ${where.id}`);

      return this.format(entity);
    } catch (error) {
      const failed = new DomainEvent({
        action: this.EVENT_UPDATED_FAILED,
        entityName: this.MODEL_NAME,
        payload: data,
        metadata: { error: error },
      });
      this.eventEmitter.emit(this.EVENT_UPDATED_FAILED, failed);
      this.logger.logError(`Error al actualizar billetera`, error);

      // Manejo de no encontrado
      if (error.code === "P2025") {
        throw new EntityNotFoundException(`Billetera con ID ${where.id}`);
      }

      throw error;
    }
  }

  public async delete({ where }: { where: WALLET_WICTH_ID }) {
    const prev = new DomainEvent({
      action: this.EVENT_DELETED,
      entityName: this.MODEL_NAME,
      payload: where,
    });
    this.eventEmitter.emit(this.EVENT_DELETED, prev);
    this.logger.logInfo(`Eliminando billetera: ${where.id}`);

    try {
      // Soft delete
      const entityPromise = this.prisma.userWallet.update({
        where,
        include: DEFAULT_INCLUDE,
        data: { deletedAt: new Date() },
      });

      const entity = await entityPromise;

      const success = new DomainEvent({
        action: this.EVENT_DELETED_SUCCESS,
        entityName: this.MODEL_NAME,
        payload: where,
      });
      this.eventEmitter.emit(this.EVENT_DELETED_SUCCESS, success);
      this.logger.logInfo(`Billetera eliminada: ${where.id}`);

      return this.format(entity);
    } catch (error) {
      const failed = new DomainEvent({
        action: this.EVENT_DELETED_FAILED,
        entityName: this.MODEL_NAME,
        payload: where,
        metadata: { error: error },
      });
      this.eventEmitter.emit(this.EVENT_DELETED_FAILED, failed);
      this.logger.logError(`Error al eliminar billetera`, error);

      if (error.code === "P2025") {
        throw new EntityNotFoundException(`Billetera con ID ${where.id}`);
      }

      throw error;
    }
  }

  public async count({ where }: { where: WALLET_WHERE }) {
    return await this.prisma.userWallet.count({ where });
  }
}
