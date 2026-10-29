import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "nestjs-prisma";
import { DomainEvent } from "src/shared/event/domain-listener";
import { LoggerService } from "src/shared/logger/logger.service";
import { EntityNotFoundException } from "src/shared/error/domain-errors";
import GoalModel from "../model/goal.model";
import { GOAL_CREATE, GOAL_UPDATE, GOAL_WHERE } from "../dto/goal.type";
import { Goal, GoalType } from "src/shared/types/nutringest/goal.interface";

@Injectable()
export default class GoalRepository extends GoalModel {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {
    super();
  }

  private format(entity: any): Goal | null {
    if (!entity) return null;
    return {
      id: entity.id,
      patientId: entity.patientId,
      createdBy: entity.createdBy,
      title: entity.title,
      type: entity.type as GoalType,
      startValue: entity.startValue ? Number(entity.startValue) : null,
      targetValue: entity.targetValue ? Number(entity.targetValue) : null,
      currentValue: entity.currentValue ? Number(entity.currentValue) : null,
      deadline: entity.deadline,
      isAchieved: entity.isAchieved,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      // Relación opcional
      patient: entity.patient
        ? {
            id: entity.patient.id,
            firstName: entity.patient.firstName,
            lastName: entity.patient.lastName,
          }
        : undefined,
    };
  }

  // --- CREATE ---
  public async create({ data }: { data: GOAL_CREATE }) {
    const prev = new DomainEvent({
      action: this.EVENT_CREATED,
      entityName: this.MODEL_NAME,
      payload: data,
    });
    this.eventEmitter.emit(this.EVENT_CREATED, prev);

    try {
      const entity = await this.prisma.goal.create({ data });
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
    where: GOAL_WHERE;
    skip: number;
    take: number;
    orderBy?: any;
  }) {
    const entities = await this.prisma.goal.findMany({
      where,
      skip,
      take,
      orderBy,
    });
    return entities.map((e) => this.format(e));
  }

  // --- READ (FindOne) ---
  public async findOne({ where }: { where: GOAL_WHERE }) {
    const entity = await this.prisma.goal.findFirst({ where });
    return this.format(entity);
  }

  // --- UPDATE ---
  public async update({
    where,
    data,
  }: {
    where: { id: string };
    data: GOAL_UPDATE;
  }) {
    const prev = new DomainEvent({
      action: this.EVENT_UPDATED,
      entityName: this.MODEL_NAME,
      payload: { where, data },
    });
    this.eventEmitter.emit(this.EVENT_UPDATED, prev);

    try {
      const entity = await this.prisma.goal.update({ where, data });
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
        throw new EntityNotFoundException(`Meta con ID ${where.id}`);
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
      const entity = await this.prisma.goal.delete({ where });
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
        throw new EntityNotFoundException(`Meta con ID ${where.id}`);
      throw error;
    }
  }

  // --- COUNT ---
  public async count({ where }: { where: GOAL_WHERE }) {
    return this.prisma.goal.count({ where });
  }
}
