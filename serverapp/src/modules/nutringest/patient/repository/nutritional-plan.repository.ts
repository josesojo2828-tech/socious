import { Injectable, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "nestjs-prisma";
import { DomainEvent } from "src/shared/event/domain-listener";
import { LoggerService } from "src/shared/logger/logger.service";
import { EntityNotFoundException } from "src/shared/error/domain-errors";
import NutritionalPlanModel from "../model/nutritional-plan.model";
import {
  PLAN_WHERE,
  PLAN_CREATE,
  PLAN_INCLUDE,
  PLAN_DEFAULT_INCLUDE,
  PLAN_UPDATE,
} from "../dto/nutritional-plan.type";
import {
  NutritionalPlan,
  PlanStatus,
} from "src/shared/types/nutringest/nutritional-plan.interface";

@Injectable()
export default class NutritionalPlanRepository extends NutritionalPlanModel {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {
    super();
  }

  private format(entity: any): NutritionalPlan | null {
    if (!entity) return null;
    return {
      id: entity.id,
      patientId: entity.patientId,
      createdBy: entity.createdBy,
      status: entity.status as PlanStatus,
      name: entity.name,
      startDate: entity.startDate,
      endDate: entity.endDate,
      kcalTarget: entity.kcalTarget,
      proteinTarget: entity.proteinTarget,
      carbsTarget: entity.carbsTarget,
      fatsTarget: entity.fatsTarget,
      recommendations: entity.recommendations,
      waterIntake: entity.waterIntake,
      waterRecommendation: entity.waterRecommendation,
      activityRecommendation: entity.activityRecommendation,
      sleepRecommendation: entity.sleepRecommendation,

      // Mapeo de relaciones anidadas
      assignedLists: entity.assignedLists,
      assignedMenus: entity.assignedMenus,
      consultation: entity.consultation,

      supplements: entity.supplements,
      isShared: entity.isShared,
      shareToken: entity.shareToken,

      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,

      patient: entity.patient,
    };
  }

  async findPlanWithFoods(planId: string) {
    return this.prisma.nutritionalPlan.findUnique({
      where: { id: planId },
      include: {
        assignedMenus: {
          where: { menu: { archivedAt: null, deletedAt: null } },
          include: {
            menu: {
              include: {
                items: {
                  include: {
                    food: true, // Traemos la info del alimento (nombre, marca)
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  // --- CREATE ---
  public async create({ data }: { data: PLAN_CREATE }) {
    const prev = new DomainEvent({
      action: this.EVENT_CREATED,
      entityName: this.MODEL_NAME,
      payload: data,
    });
    this.eventEmitter.emit(this.EVENT_CREATED, prev);

    try {
      const entity = await this.prisma.nutritionalPlan.create({
        data,
        include: PLAN_DEFAULT_INCLUDE,
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
      this.logger.logError(`Error creando plan`, error);
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
    where: PLAN_WHERE;
    include?: PLAN_INCLUDE;
    orderBy?: any;
    skip: number;
    take: number;
  }) {
    const entities = await this.prisma.nutritionalPlan.findMany({
      where,
      include: include || PLAN_DEFAULT_INCLUDE,
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
    where: PLAN_WHERE;
    include?: PLAN_INCLUDE;
  }) {
    const entity = await this.prisma.nutritionalPlan.findFirst({
      where,
      include: PLAN_DEFAULT_INCLUDE,
    });
    return this.format(entity);
  }

  // --- UPDATE ---
  public async update({
    where,
    data,
  }: {
    where: { id: string };
    data: PLAN_UPDATE;
  }) {
    const prev = new DomainEvent({
      action: this.EVENT_UPDATED,
      entityName: this.MODEL_NAME,
      payload: { where, data },
    });
    this.eventEmitter.emit(this.EVENT_UPDATED, prev);

    try {
      const entity = await this.prisma.nutritionalPlan.update({
        where,
        data,
        include: PLAN_DEFAULT_INCLUDE,
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
        throw new EntityNotFoundException(`Plan con ID ${where.id}`);
      throw error;
    }
  }

  // --- DELETE ---
  public async delete({ where }: { where: { id: string } }) {
    const prev = new DomainEvent({
      action: this.EVENT_DELETED,
      entityName: this.MODEL_NAME,
      payload: where,
    });
    this.eventEmitter.emit(this.EVENT_DELETED, prev);

    try {
      const entity = await this.prisma.nutritionalPlan.delete({
        where,
        include: PLAN_DEFAULT_INCLUDE,
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
      if (error.code === "P2025")
        throw new EntityNotFoundException(`Plan con ID ${where.id}`);
      throw error;
    }
  }

  // --- COUNT ---
  public async count({ where }: { where: PLAN_WHERE }) {
    return this.prisma.nutritionalPlan.count({ where });
  }
}
