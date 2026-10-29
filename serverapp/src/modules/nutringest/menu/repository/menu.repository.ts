import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "nestjs-prisma";
import { DomainEvent } from "src/shared/event/domain-listener";
import { LoggerService } from "src/shared/logger/logger.service";
import { EntityNotFoundException } from "src/shared/error/domain-errors";
import { MenuModel } from "../model/menu.model";
import { Menu, Patient } from "src/shared/types/schema.types";
import {
  MENU_WHERE,
  MENU_CREATE,
  MENU_UPDATE,
  MENU_WITH_ID,
  MENU_INCLUDE,
  MENU_ORDER,
  MENU_DEFAULT_INCLUDE,
} from "../dto/menu.type";

@Injectable()
export default class MenuRepository extends MenuModel {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {
    super();
  }

  private format(entity: any): Menu | null {
    if (!entity) return null;
    const isImported = Boolean(entity.importedFromId || entity.importedFrom);
    const originalAuthor = entity.importedFrom?.createdBy;
    const author = entity.createdBy || originalAuthor || (isImported ? { username: "Comunidad" } : null);

    return {
      id: entity.id,
      nutritionistId: entity.nutritionistId,
      createdBy: author,

      category: entity.category,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      archivedAt: entity.archivedAt ?? null,
      deletedAt: entity.deletedAt ?? null,
      description: entity.description,
      name: entity.name,
      tags: entity.tags,
      imageUrl: entity.imageUrl,
      prepTime: entity.prepTime != null ? Number(entity.prepTime) : null,
      difficulty: entity.difficulty || null,
      importedFromId: entity.importedFromId || null,
      importedFrom: entity.importedFrom || null,
      totalCarbs: entity.totalCarbs != null ? Number(entity.totalCarbs) : 0,
      totalFats: entity.totalFats != null ? Number(entity.totalFats) : 0,
      totalKcal: entity.totalKcal != null ? Number(entity.totalKcal) : 0,
      totalProtein: entity.totalProtein != null ? Number(entity.totalProtein) : 0,
      items: entity.items,
      nutritionist: entity.nutritionist,

      // 2. CORRECCIÓN CRÍTICA: Pasar el objeto _count
      // Sin esto, la columna '_count.dietPlans' rompe la vista
      _count: entity._count || { dietPlans: 0, consultations: 0 },
    };
  }

  public async findMany({
    where,
    include,
    orderBy,
    skip,
    take,
  }: {
    where: MENU_WHERE;
    include?: MENU_INCLUDE;
    orderBy?: MENU_ORDER;
    skip: number;
    take: number;
  }) {
    const entities = await this.prisma.menu.findMany({
      where,
      include: include || MENU_DEFAULT_INCLUDE,
      orderBy,
      skip,
      take,
    });
    return entities.map((e) => this.format(e));
  }

  public async findOne({
    where,
    include,
  }: {
    where: MENU_WHERE;
    include?: MENU_INCLUDE;
  }) {
    const entity = await this.prisma.menu.findFirst({
      where,
      include: include || MENU_DEFAULT_INCLUDE,
    });
    return this.format(entity);
  }

  public async create({ data }: { data: MENU_CREATE }) {
    const prev = new DomainEvent({
      action: this.EVENT_CREATED,
      entityName: this.MODEL_NAME,
      payload: data,
    });
    this.eventEmitter.emit(this.EVENT_CREATED, prev);
    this.logger.logInfo(`Creando menu: ${data.name}`);

    try {
      const entity = await this.prisma.menu.create({
        data,
        include: MENU_DEFAULT_INCLUDE,
      });

      const success = new DomainEvent({
        action: this.EVENT_CREATED_SUCCESS,
        entityName: this.MODEL_NAME,
        payload: data,
      });
      this.eventEmitter.emit(this.EVENT_CREATED_SUCCESS, success);

      return this.format(entity);
    } catch (error) {
      const failed = new DomainEvent({
        action: this.EVENT_CREATED_FAILED,
        entityName: this.MODEL_NAME,
        payload: data,
        metadata: { error },
      });
      this.eventEmitter.emit(this.EVENT_CREATED_FAILED, failed);
      this.logger.logError(`Error creando menu`, error);
      throw error;
    }
  }

  public async update({
    where,
    data,
  }: {
    where: MENU_WITH_ID;
    data: MENU_UPDATE;
  }) {
    const prev = new DomainEvent({
      action: this.EVENT_UPDATED,
      entityName: this.MODEL_NAME,
      payload: { where, data },
    });
    this.eventEmitter.emit(this.EVENT_UPDATED, prev);
    this.logger.logInfo(`Actualizando menu: ${where.id}`);

    try {
      const entity = await this.prisma.menu.update({
        where,
        data,
        include: MENU_DEFAULT_INCLUDE,
      });

      const success = new DomainEvent({
        action: this.EVENT_UPDATED_SUCCESS,
        entityName: this.MODEL_NAME,
        payload: where,
      });
      this.eventEmitter.emit(this.EVENT_UPDATED_SUCCESS, success);

      return this.format(entity);
    } catch (error) {
      const failed = new DomainEvent({
        action: this.EVENT_UPDATED_FAILED,
        entityName: this.MODEL_NAME,
        payload: where,
        metadata: { error },
      });
      this.eventEmitter.emit(this.EVENT_UPDATED_FAILED, failed);
      this.logger.logError(`Error actualizando menu`, error);

      if (error.code === "P2025")
        throw new EntityNotFoundException(`menu con ID ${where.id}`);
      throw error;
    }
  }

  public async delete({ where }: { where: MENU_WITH_ID }) {
    const prev = new DomainEvent({
      action: this.EVENT_DELETED,
      entityName: this.MODEL_NAME,
      payload: where,
    });
    this.eventEmitter.emit(this.EVENT_DELETED, prev);
    this.logger.logInfo(`Eliminando menu (soft): ${where.id}`);

    try {
      const entity = await this.prisma.menu.update({
        where,
        data: { deletedAt: new Date() },
        include: MENU_DEFAULT_INCLUDE,
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
        metadata: { error },
      });
      this.eventEmitter.emit(this.EVENT_DELETED_FAILED, failed);
      this.logger.logError(`Error eliminando menu`, error);

      if (error.code === "P2025")
        throw new EntityNotFoundException(`menu con ID ${where.id}`);
      throw error;
    }
  }

  public async count({ where }: { where: MENU_WHERE }) {
    return this.prisma.menu.count({ where });
  }
}
