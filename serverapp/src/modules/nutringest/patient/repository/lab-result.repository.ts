import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "nestjs-prisma";
import { DomainEvent } from "src/shared/event/domain-listener";
import { LoggerService } from "src/shared/logger/logger.service";
import { EntityNotFoundException } from "src/shared/error/domain-errors";
import LabResultModel from "../model/lab-result.model";
import { LAB_WHERE, LAB_CREATE, LAB_INCLUDE } from "../dto/lab-result.dto";
import { LabResult } from "src/shared/types/nutringest/lab-result.interface";

@Injectable()
export default class LabResultRepository extends LabResultModel {
  // Definimos el include por defecto para reutilizar
  private readonly DEFAULT_INCLUDE = {
    patient: { select: { firstName: true, lastName: true } },
    createdBy: {
      select: { id: true, firstName: true, lastName: true, username: true, email: true },
    },
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {
    super();
  }

  private format(entity: any): LabResult | null {
    if (!entity) return null;
    return {
      id: entity.id,
      patientId: entity.patientId,
      createdBy: entity.createdBy,
      name: entity.name,
      date: entity.date,
      fileUrl: entity.fileUrl,
      data: entity.data, // JSON
      patient: entity.patient
        ? {
            id: entity.patient.id,
            firstName: entity.patient.firstName,
            lastName: entity.patient.lastName,
          }
        : undefined,
      createdAt: entity.createdAt,
    };
  }

  // --- CREATE ---
  public async create({ data }: { data: LAB_CREATE }) {
    const prev = new DomainEvent({
      action: this.EVENT_CREATED,
      entityName: this.MODEL_NAME,
      payload: data,
    });
    this.eventEmitter.emit(this.EVENT_CREATED, prev);

    try {
      const entity = await this.prisma.labResult.create({
        data,
        include: this.DEFAULT_INCLUDE,
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
      this.logger.logError(`Error creando lab result`, error);
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
    where: LAB_WHERE;
    include?: LAB_INCLUDE;
    orderBy?: any;
    skip: number;
    take: number;
  }) {
    const entities = await this.prisma.labResult.findMany({
      where,
      include: include || this.DEFAULT_INCLUDE,
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
    where: LAB_WHERE;
    include?: LAB_INCLUDE;
  }) {
    const entity = await this.prisma.labResult.findFirst({
      where,
      include: include || this.DEFAULT_INCLUDE,
    });
    return this.format(entity);
  }

  // --- UPDATE ---
  public async update({ where, data }: { where: { id: string }; data: any }) {
    const prev = new DomainEvent({
      action: this.EVENT_UPDATED,
      entityName: this.MODEL_NAME,
      payload: { where, data },
    });
    this.eventEmitter.emit(this.EVENT_UPDATED, prev);

    try {
      const entity = await this.prisma.labResult.update({
        where,
        data,
        include: this.DEFAULT_INCLUDE,
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
        throw new EntityNotFoundException(`LabResult con ID ${where.id}`);
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
      const entity = await this.prisma.labResult.delete({
        where,
        include: this.DEFAULT_INCLUDE,
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
        throw new EntityNotFoundException(`LabResult con ID ${where.id}`);
      throw error;
    }
  }

  // --- COUNT ---
  public async count({ where }: { where: LAB_WHERE }) {
    return this.prisma.labResult.count({ where });
  }
}
