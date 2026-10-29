import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "nestjs-prisma";
import { DomainEvent } from "src/shared/event/domain-listener";
import CmsModel from "../model/cms.model";
import {
  CMS_WHERE,
  CMS_ORDER,
  CMS_CREATE,
  CMS_UPDATE,
  CMS_WICTH_ID,
  CMS_WHERE_UNIQUE,
} from "../dto/cms.type";
import { LoggerService } from "src/shared/logger/logger.service";
import {
  DuplicateEntryException,
  EntityNotFoundException,
} from "src/shared/error/domain-errors";

@Injectable()
export default class CmsRepository extends CmsModel {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {
    super();
  }

  public format(entity: any) {
    if (!entity) return null;
    return {
      id: entity.id,
      key: entity.key,
      title: entity.title,
      content: entity.content,
      description: entity.description,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      deletedAt: entity.deletedAt,
    };
  }

  public async findMany({
    orderBy,
    skip,
    take,
    where,
  }: {
    where: CMS_WHERE;
    orderBy?: CMS_ORDER;
    skip: number;
    take: number;
  }) {
    const entities = await this.prisma.corporateContent.findMany({
      where,
      orderBy,
      skip: Number(skip),
      take: Number(take),
    });
    return entities.map((e) => this.format(e));
  }

  public async findOne({
    where,
  }: {
    where: CMS_WHERE_UNIQUE;
  }) {
    const entity = await this.prisma.corporateContent.findUnique({
      where,
    });
    return this.format(entity);
  }

  public async create({ data }: { data: CMS_CREATE }) {
    const prev = new DomainEvent({
      action: this.EVENT_CREATED,
      entityName: this.MODEL_NAME,
      payload: data,
    });
    this.eventEmitter.emit(this.EVENT_CREATED, prev);
    this.logger.logInfo(`Creando contenido corporativo: ${data.key}`);

    try {
      const entity = await this.prisma.corporateContent.create({
        data,
      });

      const success = new DomainEvent({
        action: this.EVENT_CREATED_SUSSCESS,
        entityName: this.MODEL_NAME,
        payload: data,
      });
      this.eventEmitter.emit(this.EVENT_CREATED_SUSSCESS, success);
      this.logger.logInfo(`Contenido corporativo creado: ${data.key}`);

      return this.format(entity);
    } catch (error: any) {
      const failed = new DomainEvent({
        action: this.EVENT_CREATED_FAILED,
        entityName: this.MODEL_NAME,
        payload: data,
        metadata: { error },
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
    data: CMS_UPDATE;
    where: CMS_WICTH_ID;
  }) {
    const prev = new DomainEvent({
      action: this.EVENT_UPDATED,
      entityName: this.MODEL_NAME,
      payload: data,
    });
    this.eventEmitter.emit(this.EVENT_UPDATED, prev);
    this.logger.logInfo(`Actualizando contenido corporativo: ${where.id}`);

    try {
      const entity = await this.prisma.corporateContent.update({
        where,
        data,
      });

      const success = new DomainEvent({
        action: this.EVENT_UPDATED_SUCCESS,
        entityName: this.MODEL_NAME,
        payload: data,
      });
      this.eventEmitter.emit(this.EVENT_UPDATED_SUCCESS, success);
      this.logger.logInfo(`Contenido corporativo actualizado: ${where.id}`);
      return this.format(entity);
    } catch (error: any) {
      const failed = new DomainEvent({
        action: this.EVENT_UPDATED_FAILED,
        entityName: this.MODEL_NAME,
        payload: data,
        metadata: { error },
      });
      this.eventEmitter.emit(this.EVENT_UPDATED_FAILED, failed);

      if (error.code === "P2025")
        throw new EntityNotFoundException(`Contenido corporativo con ID ${where.id}`);
      if (error.code === "P2002") throw new DuplicateEntryException();
      throw error;
    }
  }

  public async delete({ where }: { where: CMS_WICTH_ID }) {
    const prev = new DomainEvent({
      action: this.EVENT_DELETED,
      entityName: this.MODEL_NAME,
      payload: where,
    });
    this.eventEmitter.emit(this.EVENT_DELETED, prev);

    try {
      // Usamos borrado lógico actualizando deletedAt
      const entity = await this.prisma.corporateContent.update({
        where,
        data: { deletedAt: new Date() },
      });

      const success = new DomainEvent({
        action: this.EVENT_DELETED_SUCCESS,
        entityName: this.MODEL_NAME,
        payload: where,
      });
      this.eventEmitter.emit(this.EVENT_DELETED_SUCCESS, success);
      return this.format(entity);
    } catch (error: any) {
      const failed = new DomainEvent({
        action: this.EVENT_DELETED_FAILED,
        entityName: this.MODEL_NAME,
        payload: where,
        metadata: { error },
      });
      this.eventEmitter.emit(this.EVENT_DELETED_FAILED, failed);
      if (error.code === "P2025")
        throw new EntityNotFoundException(`Contenido corporativo con ID ${where.id}`);
      throw error;
    }
  }

  public async count({ where }: { where: CMS_WHERE }) {
    return await this.prisma.corporateContent.count({ where });
  }

  public async upsert({
    where,
    create,
    update,
  }: {
    where: CMS_WHERE_UNIQUE;
    create: CMS_CREATE;
    update: CMS_UPDATE;
  }) {
    try {
      const entity = await this.prisma.corporateContent.upsert({
        where,
        create,
        update: { ...update, deletedAt: null },
      });
      this.logger.logInfo(`UPSERT contenido corporativo exitoso: ${where.key || create.key}`);
      return this.format(entity);
    } catch (error: any) {
      if (error.code === "P2002") {
        this.logger.warn(`Upsert omitido para key '${where.key}': ya existe.`);
        return null;
      }
      this.logger.logError(`UPSERT error inesperado`, error);
      throw error;
    }
  }
}
