import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "nestjs-prisma";
import { DomainEvent } from "src/shared/event/domain-listener";
import UniversityModel from "../model/university.model";
import {
  UNIVERSITY_WHERE,
  UNIVERSITY_INCLUDE,
  UNIVERSITY_ORDER,
  UNIVERSITY_CREATE,
  UNIVERSITY_UPDATE,
  UNIVERSITY_WICTH_ID,
  UNIVERSITY_DEFAULT_INCLUDE,
  UNIVERSITY_WHERE_UNIQUE,
} from "../dto/university.type";
import { LoggerService } from "src/shared/logger/logger.service";

@Injectable()
export default class UniversityRepository extends UniversityModel {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private logger: LoggerService,
  ) {
    super();
  }

  private format(entity: any) {
    if (!entity) return null;
    return {
      id: entity.id,
      name: entity.name,
      shortName: entity.shortName,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  public async findMany({
    include,
    orderBy,
    skip,
    take,
    where,
  }: {
    where: UNIVERSITY_WHERE;
    include?: UNIVERSITY_INCLUDE;
    orderBy?: UNIVERSITY_ORDER;
    skip: number;
    take: number;
  }) {
    const entities = await this.prisma.university.findMany({
      where,
      include: include ? include : UNIVERSITY_DEFAULT_INCLUDE,
      orderBy,
      skip: Number(skip),
      take: Number(take),
    });

    return entities.map((entity) => this.format(entity));
  }

  public async findOne({
    where,
    include,
  }: {
    where: UNIVERSITY_WHERE;
    include?: UNIVERSITY_INCLUDE;
  }) {
    if (
      !where ||
      Object.keys(where).length === 0 ||
      Object.values(where).every((v) => v === undefined)
    ) {
      return null;
    }

    const entity = await this.prisma.university.findFirst({
      where,
      include: include ? include : UNIVERSITY_DEFAULT_INCLUDE,
    });

    if (!entity) return null;

    return this.format(entity);
  }

  public async findById(id: string) {
    return this.findOne({ where: { id } });
  }

  public async findByName(name: string) {
    return this.findOne({ where: { name } });
  }

  public async create({ data }: { data: UNIVERSITY_CREATE }) {
    const prev = new DomainEvent({
      action: this.EVENT_CREATED,
      entityName: this.MODEL_NAME,
      payload: data,
    });
    this.eventEmitter.emit(this.EVENT_CREATED, prev);
    this.logger.logInfo(`Creando universidad: ${data.name}`);

    try {
      const entity = await this.prisma.university.create({
        data,
        include: UNIVERSITY_DEFAULT_INCLUDE,
      });

      const success = new DomainEvent({
        action: this.EVENT_CREATED_SUSSCESS,
        entityName: this.MODEL_NAME,
        payload: entity,
      });
      this.eventEmitter.emit(this.EVENT_CREATED_SUSSCESS, success);
      this.logger.logInfo(`Universidad creada: ${data.name}`);

      return this.format(entity);
    } catch (error) {
      const failed = new DomainEvent({
        action: this.EVENT_CREATED_FAILED,
        entityName: this.MODEL_NAME,
        payload: data,
        metadata: { error },
      });
      this.eventEmitter.emit(this.EVENT_CREATED_FAILED, failed);
      this.logger.logError(`Error al crear universidad: ${data.name}`, error);
      throw error;
    }
  }

  public async update({
    data,
    where,
  }: {
    data: UNIVERSITY_UPDATE;
    where: UNIVERSITY_WICTH_ID;
  }) {
    const prev = new DomainEvent({
      action: this.EVENT_UPDATED,
      entityName: this.MODEL_NAME,
      payload: data,
    });
    this.eventEmitter.emit(this.EVENT_UPDATED, prev);
    this.logger.logInfo(`Actualizando universidad: ${where.id}`);

    try {
      const entity = await this.prisma.university.update({
        where,
        data,
        include: UNIVERSITY_DEFAULT_INCLUDE,
      });

      const success = new DomainEvent({
        action: this.EVENT_UPDATED_SUCCESS,
        entityName: this.MODEL_NAME,
        payload: data,
      });
      this.eventEmitter.emit(this.EVENT_UPDATED_SUCCESS, success);
      this.logger.logInfo(`Universidad actualizada: ${where.id}`);

      return this.format(entity);
    } catch (error) {
      const failed = new DomainEvent({
        action: this.EVENT_UPDATED_FAILED,
        entityName: this.MODEL_NAME,
        payload: data,
        metadata: { error },
      });
      this.eventEmitter.emit(this.EVENT_UPDATED_FAILED, failed);
      this.logger.logError(`Error al actualizar universidad: ${where.id}`, error);
      return { error: true, object: error };
    }
  }

  public async softDelete({ where }: { where: UNIVERSITY_WICTH_ID }) {
    return this.update({
      where,
      data: { isActive: false },
    });
  }

  public async delete({ where }: { where: UNIVERSITY_WICTH_ID }) {
    const prev = new DomainEvent({
      action: this.EVENT_DELETED,
      entityName: this.MODEL_NAME,
      payload: where,
    });
    this.eventEmitter.emit(this.EVENT_DELETED, prev);
    this.logger.logInfo(`Eliminando universidad: ${where.id}`);

    try {
      const entity = await this.prisma.university.update({
        where,
        data: { isActive: false },
        include: UNIVERSITY_DEFAULT_INCLUDE,
      });

      const success = new DomainEvent({
        action: this.EVENT_DELETED_SUCCESS,
        entityName: this.MODEL_NAME,
        payload: where,
      });
      this.eventEmitter.emit(this.EVENT_DELETED_SUCCESS, success);
      this.logger.logInfo(`Universidad eliminada: ${where.id}`);

      return this.format(entity);
    } catch (error) {
      const failed = new DomainEvent({
        action: this.EVENT_DELETED_FAILED,
        entityName: this.MODEL_NAME,
        payload: where,
        metadata: { error },
      });
      this.eventEmitter.emit(this.EVENT_DELETED_FAILED, failed);
      this.logger.logError(`Error al eliminar universidad: ${where.id}`, error);
      return { error: true, object: error };
    }
  }

  public async count({ where }: { where: UNIVERSITY_WHERE }) {
    return await this.prisma.university.count({ where });
  }
}
