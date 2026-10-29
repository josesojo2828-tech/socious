import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "nestjs-prisma";
import { DomainEvent } from "src/shared/event/domain-listener";
import { LoggerService } from "src/shared/logger/logger.service";
import {
  DuplicateEntryException,
  EntityNotFoundException,
} from "src/shared/error/domain-errors";
import CondimentModel from "../model/condiment.model";
import { Condiment } from "src/shared/types/schema.types";
import {
  CONDIMENT_WHERE,
  CONDIMENT_CREATE,
  CONDIMENT_UPDATE,
  CONDIMENT_WITH_ID,
  CONDIMENT_INCLUDE,
  CONDIMENT_ORDER,
  CONDIMENT_DEFAULT_INCLUDE,
} from "../dto/condiment.type";

@Injectable()
export default class CondimentRepository extends CondimentModel {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {
    super();
  }

  private format(entity: any): Condiment | null {
    if (!entity) return null;
    return {
      id: entity.id,
      name: entity.name,
      isActive: entity.isActive,
    };
  }

  public async findMany({
    where,
    include,
    orderBy,
    skip,
    take,
  }: {
    where: CONDIMENT_WHERE;
    include?: CONDIMENT_INCLUDE;
    orderBy?: CONDIMENT_ORDER;
    skip: number;
    take: number;
  }): Promise<Condiment[]> {
    const entities = await this.prisma.condiment.findMany({
      where,
      include,
      orderBy,
      skip,
      take,
    });
    return entities.map((e: any) => this.format(e)!);
  }

  public async count(where: CONDIMENT_WHERE): Promise<number> {
    return this.prisma.condiment.count({ where });
  }

  public async findOne(
    where: CONDIMENT_WHERE & CONDIMENT_WITH_ID,
    include?: CONDIMENT_INCLUDE,
  ): Promise<Condiment | null> {
    const entity = await this.prisma.condiment.findUnique({
      where: { id: where.id },
      include,
    });
    return this.format(entity);
  }

  public async findByName(name: string): Promise<Condiment | null> {
    const entity = await this.prisma.condiment.findUnique({ where: { name } });
    return this.format(entity);
  }

  public async create(data: CONDIMENT_CREATE): Promise<Condiment> {
    const existing = await this.prisma.condiment.findUnique({
      where: { name: String(data.name) },
    });
    if (existing) throw new DuplicateEntryException("Condiment", "name", data.name);

    const prev = new DomainEvent({
      action: this.EVENT_CREATED,
      payload: { name: data.name },
    });

    const entity = await this.prisma.condiment.create({ data });

    this.eventEmitter.emit(this.EVENT_CREATED_SUCCESS, {
      event: prev,
      response: entity,
    });

    return this.format(entity)!;
  }

  public async update(
    where: CONDIMENT_WITH_ID,
    data: CONDIMENT_UPDATE,
  ): Promise<Condiment> {
    const existing = await this.findOne(where);
    if (!existing) throw new EntityNotFoundException("Condiment");

    if (data.name) {
      const duplicate = await this.prisma.condiment.findUnique({
        where: { name: String(data.name) },
      });
      if (duplicate && duplicate.id !== where.id) {
        throw new DuplicateEntryException("Condiment", "name", data.name);
      }
    }

    const prev = new DomainEvent({
      action: this.EVENT_UPDATED,
      prev: existing,
      payload: data,
    });

    const entity = await this.prisma.condiment.update({
      where: { id: where.id },
      data,
    });

    this.eventEmitter.emit(this.EVENT_UPDATED_SUCCESS, {
      event: prev,
      response: entity,
    });

    return this.format(entity)!;
  }

  public async delete(where: CONDIMENT_WITH_ID): Promise<Condiment> {
    const existing = await this.findOne(where);
    if (!existing) throw new EntityNotFoundException("Condiment");

    const prev = new DomainEvent({
      action: this.EVENT_DELETED,
      prev: existing,
    });

    const entity = await this.prisma.condiment.update({
      where: { id: where.id },
      data: { isActive: false },
    });

    this.eventEmitter.emit(this.EVENT_DELETED_SUCCESS, {
      event: prev,
      response: entity,
    });

    return this.format(entity)!;
  }
}
