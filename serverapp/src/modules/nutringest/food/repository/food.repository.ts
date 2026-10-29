import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "nestjs-prisma";
import { DomainEvent } from "src/shared/event/domain-listener";
import { LoggerService } from "src/shared/logger/logger.service";
import {
  DuplicateEntryException,
  EntityNotFoundException,
} from "src/shared/error/domain-errors";
import FoodModel from "../model/food.model";
import { FoodItem } from "src/shared/types/schema.types";
import {
  FOOD_ITEM_WHERE,
  FOOD_ITEM_CREATE,
  FOOD_ITEM_UPDATE,
  FOOD_ITEM_WITH_ID,
  FOOD_ITEM_INCLUDE,
  FOOD_ITEM_ORDER,
  FOOD_ITEM_DEFAULT_INCLUDE,
} from "../dto/food.type";

@Injectable()
export default class FoodRepository extends FoodModel {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {
    super();
  }

  private format(entity: any): FoodItem | null {
    if (!entity) return null;
    return {
      id: entity.id,
      name: entity.name,
      categoryId: entity.categoryId,
      createdById: entity.createdById,
      createdBy: entity.createdBy,
      brand: entity.brand,
      baseUnit: entity.baseUnit,
      baseQuantity: Number(entity.baseQuantity),
      calories: Number(entity.calories),
      proteins: Number(entity.proteins),
      carbohydrates: Number(entity.carbohydrates),
      fats: Number(entity.fats),
      humidity: Number(entity.humidity),
      fiberTotal: Number(entity.fiberTotal),
      fiberInsoluble: Number(entity.fiberInsoluble),
      sugar: Number(entity.sugar),
      calcium: Number(entity.calcium),
      iron: Number(entity.iron),
      magnesium: Number(entity.magnesium),
      zinc: Number(entity.zinc),
      copper: Number(entity.copper),
      sodium: Number(entity.sodium),
      phosphorus: Number(entity.phosphorus),
      potassium: Number(entity.potassium),
      vitaminA: Number(entity.vitaminA),
      thiamin: Number(entity.thiamin),
      riboflavin: Number(entity.riboflavin), // Mapeo correcto DB -> TS
      niacin: Number(entity.niacin),
      vitaminB6: Number(entity.vitaminB6),
      ascorbicAcid: Number(entity.ascorbicAcid),
      isActive: entity.isActive,
      // Costeo y Precios
      currentPrice: entity.currentPrice ? Number(entity.currentPrice) : null,
      priceUnit: entity.priceUnit,
      lastPriceSync: entity.lastPriceSync,
      wasteFactor: entity.wasteFactor ? Number(entity.wasteFactor) : 1,
      // Relaciones
      portions: entity.portions,
    };
  }

  public async findMany({
    where,
    include,
    orderBy,
    skip,
    take,
  }: {
    where: FOOD_ITEM_WHERE;
    include?: FOOD_ITEM_INCLUDE;
    orderBy?: FOOD_ITEM_ORDER;
    skip: number;
    take: number;
  }) {
    const entities = await this.prisma.foodItem.findMany({
      where,
      include: include || FOOD_ITEM_DEFAULT_INCLUDE,
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
    where: FOOD_ITEM_WHERE;
    include?: FOOD_ITEM_INCLUDE;
  }) {
    const entity = await this.prisma.foodItem.findFirst({
      where,
      include: include || FOOD_ITEM_DEFAULT_INCLUDE,
    });
    return this.format(entity);
  }

  public async create({ data }: { data: FOOD_ITEM_CREATE }) {
    const prev = new DomainEvent({
      action: this.EVENT_CREATED,
      entityName: this.MODEL_NAME,
      payload: data,
    });
    this.eventEmitter.emit(this.EVENT_CREATED, prev);
    this.logger.logInfo(`Creando alimento: ${data.name}`);

    try {
      const entity = await this.prisma.foodItem.create({
        data,
        include: FOOD_ITEM_DEFAULT_INCLUDE,
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
      this.logger.logError(`Error creando alimento`, error);

      if (error.code === "P2002")
        throw new DuplicateEntryException(
          "Ya existe un alimento con este nombre o código.",
        );
      throw error;
    }
  }

  public async update({
    where,
    data,
  }: {
    where: FOOD_ITEM_WITH_ID;
    data: FOOD_ITEM_UPDATE;
  }) {
    const prev = new DomainEvent({
      action: this.EVENT_UPDATED,
      entityName: this.MODEL_NAME,
      payload: { where, data },
    });
    this.eventEmitter.emit(this.EVENT_UPDATED, prev);
    this.logger.logInfo(`Actualizando alimento: ${where.id}`);

    try {
      const entity = await this.prisma.foodItem.update({
        where,
        data,
        include: FOOD_ITEM_DEFAULT_INCLUDE,
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
      this.logger.logError(`Error actualizando alimento`, error);

      if (error.code === "P2025")
        throw new EntityNotFoundException(`Alimento con ID ${where.id}`);
      throw error;
    }
  }

  public async delete({ where }: { where: FOOD_ITEM_WITH_ID }) {
    // En alimentos, usualmente es borrado físico si no hay dependencias, o soft delete si prefieres.
    // Aquí uso Soft Delete (isActive = false) para no romper dietas históricas.
    const prev = new DomainEvent({
      action: this.EVENT_DELETED,
      entityName: this.MODEL_NAME,
      payload: where,
    });
    this.eventEmitter.emit(this.EVENT_DELETED, prev);
    this.logger.logInfo(`Desactivando alimento: ${where.id}`);

    try {
      const entity = await this.prisma.foodItem.update({
        where,
        data: { isActive: false },
        include: FOOD_ITEM_DEFAULT_INCLUDE,
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
      this.logger.logError(`Error desactivando alimento`, error);

      if (error.code === "P2025")
        throw new EntityNotFoundException(`Alimento con ID ${where.id}`);
      throw error;
    }
  }

  public async count({ where }: { where: FOOD_ITEM_WHERE }) {
    return this.prisma.foodItem.count({ where });
  }
}
