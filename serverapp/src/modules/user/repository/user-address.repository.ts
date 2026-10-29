import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "nestjs-prisma";
import { DomainEvent } from "src/shared/event/domain-listener";
import UserAddressModel from "../model/user-address.model";
import { UserAddress } from "src/shared/types/schema.types";
import {
  USER_ADDRESS_WHERE,
  USER_ADDRESS_INCLUDE,
  USER_ADDRESS_ORDER,
  USER_ADDRESS_CREATE,
  USER_ADDRESS_UPDATE,
  USER_ADDRESS_WICTH_ID,
  DEFAULT_INCLUDE,
  USER_ADDRESS_WHERE_UNIQUE,
} from "../dto/user-address.types";
import { LoggerService } from "src/shared/logger/logger.service";
import {
  DuplicateEntryException,
  EntityNotFoundException,
} from "src/shared/error/domain-errors";

@Injectable()
export default class UserAddressRepository extends UserAddressModel {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {
    super();
  }

  private format(entity: any): UserAddress {
    // if (!entity) return null; // Protección contra nulos

    return {
      id: entity.id,
      userId: entity.userId,
      label: entity.label,
      address1: entity.address1,
      address2: entity.address2,
      city: entity.city,
      state: entity.state,
      country: entity.country,
      postalCode: entity.postalCode,
      latitude: entity.latitude,
      longitude: entity.longitude,
      type: entity.type,
      isDefault: entity.isDefault,
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
    where: USER_ADDRESS_WHERE;
    include?: USER_ADDRESS_INCLUDE;
    orderBy?: USER_ADDRESS_ORDER;
    skip: number;
    take: number;
  }) {
    const entityPromise = this.prisma.userAddress.findMany({
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
    where: USER_ADDRESS_WHERE;
    include?: USER_ADDRESS_INCLUDE;
  }) {
    const entityPromise = this.prisma.userAddress.findFirst({
      where,
      include: include ? include : DEFAULT_INCLUDE,
    });
    const entity = await entityPromise;
    return this.format(entity);
  }

  public async create({ data }: { data: USER_ADDRESS_CREATE }) {
    const prev = new DomainEvent({
      action: this.EVENT_CREATED,
      entityName: this.MODEL_NAME,
      payload: data,
    });
    this.eventEmitter.emit(this.EVENT_CREATED, prev);
    this.logger.logInfo(
      `Creando dirección para usuario: ${data.user.connect?.id}`,
    );

    try {
      const entityPromise = this.prisma.userAddress.create({
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
      this.logger.logInfo(`Dirección creada: ${entity.id}`);

      return this.format(entity);
    } catch (error) {
      const failed = new DomainEvent({
        action: this.EVENT_CREATED_FAILED,
        entityName: this.MODEL_NAME,
        payload: data,
        metadata: { error: error },
      });
      this.eventEmitter.emit(this.EVENT_CREATED_FAILED, failed);
      this.logger.logError(`Error creando dirección`, error);

      // P2002: Unique constraint (Ej: si tuvieras lógica de dirección única por etiqueta)
      if (error.code === "P2002") {
        throw new DuplicateEntryException("Dirección duplicada.");
      }
      throw error;
    }
  }

  public async update({
    data,
    where,
  }: {
    data: USER_ADDRESS_UPDATE;
    where: USER_ADDRESS_WICTH_ID;
  }) {
    const prev = new DomainEvent({
      action: this.EVENT_UPDATED,
      entityName: this.MODEL_NAME,
      payload: data,
    });
    this.eventEmitter.emit(this.EVENT_UPDATED, prev);
    this.logger.logInfo(`Actualizando dirección: ${where.id}`);

    try {
      const entityPromise = this.prisma.userAddress.update({
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
      this.logger.logInfo(`Dirección actualizada: ${where.id}`);

      return this.format(entity);
    } catch (error) {
      const failed = new DomainEvent({
        action: this.EVENT_UPDATED_FAILED,
        entityName: this.MODEL_NAME,
        payload: data,
        metadata: { error: error },
      });
      this.eventEmitter.emit(this.EVENT_UPDATED_FAILED, failed);
      this.logger.logError(`Error actualizando dirección`, error);

      if (error.code === "P2025") {
        throw new EntityNotFoundException(`Dirección con ID ${where.id}`);
      }
      throw error;
    }
  }

  public async delete({ where }: { where: USER_ADDRESS_WICTH_ID }) {
    const prev = new DomainEvent({
      action: this.EVENT_DELETED,
      entityName: this.MODEL_NAME,
      payload: where,
    });
    this.eventEmitter.emit(this.EVENT_DELETED, prev);
    this.logger.logInfo(`Eliminando dirección: ${where.id}`);

    try {
      // Soft delete para consistencia
      const entityPromise = this.prisma.userAddress.update({
        where,
        data: { deletedAt: new Date() },
        include: DEFAULT_INCLUDE,
      });

      const entity = await entityPromise;

      const success = new DomainEvent({
        action: this.EVENT_DELETED_SUCCESS,
        entityName: this.MODEL_NAME,
        payload: where,
      });
      this.eventEmitter.emit(this.EVENT_DELETED_SUCCESS, success);
      this.logger.logInfo(`Dirección eliminada: ${where.id}`);

      return this.format(entity);
    } catch (error) {
      const failed = new DomainEvent({
        action: this.EVENT_DELETED_FAILED,
        entityName: this.MODEL_NAME,
        payload: where,
        metadata: { error: error },
      });
      this.eventEmitter.emit(this.EVENT_DELETED_FAILED, failed);
      this.logger.logError(`Error eliminando dirección`, error);

      if (error.code === "P2025") {
        throw new EntityNotFoundException(`Dirección con ID ${where.id}`);
      }
      throw error;
    }
  }

  public async count({ where }: { where: USER_ADDRESS_WHERE }) {
    return await this.prisma.userAddress.count({ where });
  }

  public async upsert({
    where,
    create,
    update,
  }: {
    where: USER_ADDRESS_WHERE_UNIQUE;
    create: USER_ADDRESS_CREATE;
    update: USER_ADDRESS_UPDATE;
  }) {
    const prev = new DomainEvent({
      action: this.EVENT_UPDATED,
      entityName: this.MODEL_NAME,
      payload: where,
    });
    this.eventEmitter.emit(this.EVENT_UPDATED, prev);

    try {
      const entityPromise = this.prisma.userAddress.upsert({
        where,
        create,
        update,
        include: DEFAULT_INCLUDE, // Importante incluir datos para el format
      });

      const entity = await entityPromise;

      const success = new DomainEvent({
        action: this.EVENT_UPDATED_SUCCESS,
        entityName: this.MODEL_NAME,
        payload: where,
      });
      this.eventEmitter.emit(this.EVENT_UPDATED_SUCCESS, success);
      this.logger.logInfo(`UPSERT dirección exitoso: ${where.id}`);

      return this.format(entity);
    } catch (error) {
      const failed = new DomainEvent({
        action: this.EVENT_UPDATED_FAILED,
        entityName: this.MODEL_NAME,
        payload: where,
        metadata: { error: error },
      });
      this.eventEmitter.emit(this.EVENT_UPDATED_FAILED, failed);
      this.logger.logError(`Error en upsert dirección`, error);

      if (error.code === "P2002") throw new DuplicateEntryException();

      throw error;
    }
  }
}
