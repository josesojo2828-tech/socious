import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "nestjs-prisma";
import { DomainEvent } from "src/shared/event/domain-listener";
import DietLegacyModel from "../model/diet-legacy.model";
import {
  DIET_LEGACY_DEFAULT_INCLUDE,
  DIET_LEGACY_INCLUDE,
  DIET_LEGACY_WHERE,
} from "../dto/diet-plan.type";
import type {
  LegacyDietPlan,
  DietStatus,
} from "src/shared/types/nutringest/diet-legacy.interface";
import { EntityNotFoundException } from "src/shared/error/domain-errors";

@Injectable()
export default class DietLegacyRepository extends DietLegacyModel {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super();
  }

  private format(entity: any): LegacyDietPlan | null {
    if (!entity) return null;
    return {
      id: entity.id,
      patientId: entity.patientId,
      createdBy: entity.createdBy,
      name: entity.name,
      startDate: entity.startDate,
      endDate: entity.endDate,
      status: entity.status as DietStatus,
      totalKcal: entity.totalKcal ? Number(entity.totalKcal) : null,
      macroSplit: entity.macroSplit,
      days: entity.days || [],
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  // --- CREATE ---
  public async create({ data }: { data: any }) {
    const prev = new DomainEvent({
      action: this.EVENT_CREATED,
      entityName: this.MODEL_NAME,
      payload: data,
    });
    this.eventEmitter.emit(this.EVENT_CREATED, prev);

    try {
      const entity = await this.prisma.dietPlan.create({
        data,
        include: DIET_LEGACY_DEFAULT_INCLUDE,
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
      throw error;
    }
  }

  // --- READ (FindMany) ---
  public async findMany({
    where,
    include,
    orderBy,
    skip,
    take,
  }: {
    where: DIET_LEGACY_WHERE;
    include?: DIET_LEGACY_INCLUDE;
    orderBy?: any;
    skip: number;
    take: number;
  }) {
    const entities = await this.prisma.dietPlan.findMany({
      where,
      include: include || DIET_LEGACY_DEFAULT_INCLUDE,
      orderBy,
      skip,
      take,
    });
    return entities.map((e) => this.format(e));
  }

  // --- READ (FindOne) ---
  public async findOne({
    where,
    include,
  }: {
    where: DIET_LEGACY_WHERE;
    include?: DIET_LEGACY_INCLUDE;
  }) {
    const entity = await this.prisma.dietPlan.findFirst({
      where,
      include: include || DIET_LEGACY_DEFAULT_INCLUDE,
    });
    return this.format(entity);
  }

  // --- UPDATE ---
  public async update({ where, data }: { where: { id: string }; data: any }) {
    try {
      const entity = await this.prisma.dietPlan.update({
        where,
        data,
        include: DIET_LEGACY_DEFAULT_INCLUDE,
      });
      return this.format(entity);
    } catch (error) {
      if (error.code === "P2025")
        throw new EntityNotFoundException(`Dieta con ID ${where.id}`);
      throw error;
    }
  }

  // --- DELETE ---
  public async delete({ where }: { where: { id: string } }) {
    try {
      const entity = await this.prisma.dietPlan.delete({
        where,
        include: DIET_LEGACY_DEFAULT_INCLUDE,
      });
      return this.format(entity);
    } catch (error) {
      if (error.code === "P2025")
        throw new EntityNotFoundException(`Dieta con ID ${where.id}`);
      throw error;
    }
  }

  // --- COUNT ---
  public async count({ where }: { where: DIET_LEGACY_WHERE }) {
    return this.prisma.dietPlan.count({ where });
  }
}
