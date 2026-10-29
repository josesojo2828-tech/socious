import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "nestjs-prisma";
import { DomainEvent } from "src/shared/event/domain-listener";
import { LoggerService } from "src/shared/logger/logger.service";
import ShoppingListModel from "../model/shopping-list.model";
import { ShoppingList } from "src/shared/types/nutringest/shopping-list.interface";
import { SHOPPING_CREATE, SHOPPING_WHERE } from "../dto/shoping-list.type";
import { EntityNotFoundException } from "src/shared/error/domain-errors";

@Injectable()
export default class ShoppingListRepository extends ShoppingListModel {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {
    super();
  }

  private format(entity: any): ShoppingList | null {
    if (!entity) return null;
    return {
      id: entity.id,
      patientId: entity.patientId,
      createdBy: entity.createdBy,
      name: entity.name,
      items: entity.items,
      createdAt: entity.createdAt,
    };
  }

  // --- CREATE ---
  public async create({ data }: { data: SHOPPING_CREATE }) {
    const prev = new DomainEvent({
      action: this.EVENT_CREATED,
      entityName: this.MODEL_NAME,
      payload: data,
    });
    this.eventEmitter.emit(this.EVENT_CREATED, prev);

    try {
      const entity = await this.prisma.shoppingList.create({ data });
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
      throw error;
    }
  }

  // --- READ (FindMany) ---
  public async findMany({
    where,
    skip,
    take,
    orderBy,
  }: {
    where: SHOPPING_WHERE;
    skip: number;
    take: number;
    orderBy?: any;
  }) {
    const entities = await this.prisma.shoppingList.findMany({
      where,
      skip,
      take,
      orderBy,
    });
    return entities.map((e) => this.format(e));
  }

  // --- READ (FindOne) ---
  public async findOne({ where }: { where: SHOPPING_WHERE }) {
    const entity = await this.prisma.shoppingList.findFirst({ where });
    return this.format(entity);
  }

  // --- UPDATE ---
  public async update({ where, data }: { where: { id: string }; data: any }) {
    const prev = new DomainEvent({
      action: "SHOPPING_UPDATED",
      entityName: this.MODEL_NAME,
      payload: { where, data },
    });
    this.eventEmitter.emit("SHOPPING_UPDATED", prev);

    try {
      const entity = await this.prisma.shoppingList.update({ where, data });
      return this.format(entity);
    } catch (error) {
      if (error.code === "P2025")
        throw new EntityNotFoundException(`Lista con ID ${where.id}`);
      throw error;
    }
  }

  // --- DELETE ---
  public async delete({ where }: { where: { id: string } }) {
    const prev = new DomainEvent({
      action: "SHOPPING_DELETED",
      entityName: this.MODEL_NAME,
      payload: where,
    });
    this.eventEmitter.emit("SHOPPING_DELETED", prev);

    try {
      const entity = await this.prisma.shoppingList.delete({ where });
      return this.format(entity);
    } catch (error) {
      if (error.code === "P2025")
        throw new EntityNotFoundException(`Lista con ID ${where.id}`);
      throw error;
    }
  }

  // --- COUNT ---
  public async count({ where }: { where: SHOPPING_WHERE }) {
    return this.prisma.shoppingList.count({ where });
  }
}
