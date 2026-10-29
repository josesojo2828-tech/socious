import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "nestjs-prisma";
import { DomainEvent } from "src/shared/event/domain-listener";
import { LoggerService } from "src/shared/logger/logger.service";
import {
  DuplicateEntryException,
  EntityNotFoundException,
} from "src/shared/error/domain-errors";
import ExchangeListModel from "../model/food-exchange.model";
import {
  EXCHANGE_LIST_WHERE,
  EXCHANGE_LIST_CREATE,
  EXCHANGE_LIST_UPDATE,
  EXCHANGE_LIST_WITH_ID,
  EXCHANGE_LIST_INCLUDE,
  EXCHANGE_LIST_ORDER,
} from "../dto/food-exchange.type";
import { FoodExchangeList } from "src/shared/types/schema.types";

@Injectable()
export default class ExchangeListRepository extends ExchangeListModel {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {
    super();
  }

  private format(entity: any): FoodExchangeList | null {
    if (!entity) return null;
    return {
      id: entity.id,
      name: entity.name,
      category: entity.category,
      sub: entity.sub,
      unity: entity.unity,
      // Prisma returns a Decimal; `null` must survive so the UI can tell
      // "no source measure" from "0 grams".
      grams: entity.grams != null ? Number(entity.grams) : null,
      createdBy: entity.createdBy,
      calories: entity.calories ? Number(entity.calories) : 0,
      _count: entity._count || { exchange: 0 },
      exchange: entity.exchange,
    };
  }

  public async findMany({
    where,
    include,
    orderBy,
    skip,
    take,
  }: {
    where: EXCHANGE_LIST_WHERE;
    include?: EXCHANGE_LIST_INCLUDE;
    orderBy?: EXCHANGE_LIST_ORDER;
    skip: number;
    take: number;
  }) {
    const entities = await this.prisma.foodExchangeList.findMany({
      where,
      include,
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
    where: EXCHANGE_LIST_WHERE;
    include?: EXCHANGE_LIST_INCLUDE;
  }) {
    const entity = await this.prisma.foodExchangeList.findFirst({
      where,
      include,
    });
    return this.format(entity);
  }

  /**
   * Categories that actually exist in the table, alphabetically.
   *
   * The category selector used to be a hardcoded `<option>` list that had
   * drifted from the data, so filtering dropped foods from the categories it
   * did not name. 187 rows: the distinct is free.
   */
  public async findDistinctCategories(): Promise<string[]> {
    const rows = await this.prisma.foodExchangeList.findMany({
      distinct: ["category"],
      select: { category: true },
      orderBy: { category: "asc" },
    });
    return rows
      .map((row) => row.category)
      .filter((category): category is string => Boolean(category));
  }

  public async create({ data }: { data: EXCHANGE_LIST_CREATE }) {
    const prev = new DomainEvent({
      action: this.EVENT_CREATED,
      entityName: this.MODEL_NAME,
      payload: data,
    });
    this.eventEmitter.emit(this.EVENT_CREATED, prev);
    this.logger.logInfo(`Creando lista de intercambio: ${data.name}`);

    try {
      const entity = await this.prisma.foodExchangeList.create({
        data,
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
      this.logger.logError(`Error creando lista`, error);
      throw error;
    }
  }

  public async update({
    where,
    data,
  }: {
    where: EXCHANGE_LIST_WITH_ID;
    data: EXCHANGE_LIST_UPDATE;
  }) {
    const prev = new DomainEvent({
      action: this.EVENT_UPDATED,
      entityName: this.MODEL_NAME,
      payload: { where, data },
    });
    this.eventEmitter.emit(this.EVENT_UPDATED, prev);

    try {
      const entity = await this.prisma.foodExchangeList.update({
        where,
        data,
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
      if (error.code === "P2025")
        throw new EntityNotFoundException(`Lista con ID ${where.id}`);
      throw error;
    }
  }

  public async delete({ where }: { where: EXCHANGE_LIST_WITH_ID }) {
    const prev = new DomainEvent({
      action: this.EVENT_DELETED,
      entityName: this.MODEL_NAME,
      payload: where,
    });
    this.eventEmitter.emit(this.EVENT_DELETED, prev);

    try {
      const entity = await this.prisma.foodExchangeList.delete({ where });

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
      if (error.code === "P2025")
        throw new EntityNotFoundException(`Lista con ID ${where.id}`);
      throw error;
    }
  }

  public async count({ where }: { where: EXCHANGE_LIST_WHERE }) {
    return this.prisma.foodExchangeList.count({ where });
  }
}
