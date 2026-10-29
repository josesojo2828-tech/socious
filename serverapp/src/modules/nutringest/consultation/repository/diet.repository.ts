import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "nestjs-prisma"; // Ajusta según tu estructura
import { DomainEvent } from "src/shared/event/domain-listener";
import { LoggerService } from "src/shared/logger/logger.service";
import { EntityNotFoundException } from "src/shared/error/domain-errors";
import ConsultationModel from "../model/consultation.model";
import {
  CONSULTATION_WHERE,
  CONSULTATION_CREATE,
  CONSULTATION_UPDATE,
  CONSULTATION_WITH_ID,
  CONSULTATION_INCLUDE,
  CONSULTATION_ORDER,
  CONSULTATION_DEFAULT_INCLUDE,
  ICreateConsultationDto,
} from "../dto/consultation.type";
import { Consultation, User } from "src/shared/types/schema.types"; // Tu tipo User

@Injectable()
export default class ConsultationRepository extends ConsultationModel {
  constructor(
    public readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {
    super();
  }

  /**
   * MAPPER: Prisma Entity -> Domain Interface
   */
  private format(entity: any): Consultation | null {
    if (!entity) return null;
    return {
      id: entity.id,
      patientId: entity.patientId,
      nutritionistId: entity.nutritionistId,
      createdBy: entity.createdBy,
      scheduledAt: entity.scheduledAt,
      status: entity.status,
      type: entity.type,
      reason: entity.reason,
      notes: entity.notes,
      createdAt: entity.createdAt,

      // Relaciones (verificamos si existen por el include)
      patient: entity.patient
        ? {
            id: entity.patient.id,
            firstName: entity.patient.firstName,
            lastName: entity.patient.lastName,
            avatarUrl: entity.patient.user?.avatarUrl, // Asumiendo que Patient tiene relation a User
          }
        : undefined,

      anthropometryId: entity.anthropometryId,
      planId: entity.planId,
    };
  }

  public async findMany({
    where,
    include,
    orderBy,
    skip,
    take,
  }: {
    where: CONSULTATION_WHERE;
    include?: CONSULTATION_INCLUDE;
    orderBy?: CONSULTATION_ORDER;
    skip: number;
    take: number;
  }) {
    const entities = await this.prisma.consultation.findMany({
      where,
      include: include || CONSULTATION_DEFAULT_INCLUDE,
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
    where: CONSULTATION_WHERE;
    include?: CONSULTATION_INCLUDE;
  }) {
    const entity = await this.prisma.consultation.findFirst({
      where,
      include: include || CONSULTATION_DEFAULT_INCLUDE,
    });
    return this.format(entity);
  }

  /**
   * CREAR CONSULTA
   * Vincula automáticamente al Nutricionista de la sesión
   */
  public async create({
    data,
    userSession,
    organizationId,
  }: {
    data: ICreateConsultationDto;
    userSession: User;
    organizationId?: string | null;
  }) {
    // Evento Previo
    const prev = new DomainEvent({
      action: this.EVENT_CREATED,
      entityName: this.MODEL_NAME,
      payload: { ...data, userId: userSession.id },
    });
    this.eventEmitter.emit(this.EVENT_CREATED, prev);

    this.logger.logInfo(`Agendando consulta para paciente: ${data.patientId}`);
    try {
      const nutritionistProfile = await this.prisma.nutritionist.findUnique({
        where: { userId: userSession.id },
      });

      if (!nutritionistProfile) {
        throw new Error("El usuario no tiene perfil de nutricionista activo.");
      }

      const customDate = new Date(data.scheduledAt);
      customDate.setDate(customDate.getDate() + 1);

      const dataCreate: CONSULTATION_CREATE = {
        nutritionist: { connect: { id: nutritionistProfile.id } },
        scheduledAt: customDate,
        type: data.type,
        reason: data.reason,
        status: "SCHEDULED",
        ...(organizationId ? { organization: { connect: { id: organizationId } } } : {}),
      };

      if (data.patientId) {
        let patient = await this.prisma.patient.findUnique({
          where: { id: data.patientId },
        });

        if (!patient) {
          patient = await this.prisma.patient.findFirst({
            where: { userId: data.patientId },
          });
        }

        if (!patient) {
          throw new EntityNotFoundException("Paciente");
        }

        dataCreate.patient = { connect: { id: patient.id } };
      }

      const entity = await this.prisma.consultation.create({
        data: dataCreate,
        include: CONSULTATION_DEFAULT_INCLUDE,
      });

      // Evento Éxito
      const success = new DomainEvent({
        action: this.EVENT_CREATED_SUCCESS,
        entityName: this.MODEL_NAME,
        payload: entity,
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
      this.logger.logError(`Error agendando consulta`, error);
      throw error;
    }
  }

  public async update({
    where,
    data,
  }: {
    where: CONSULTATION_WITH_ID;
    data: CONSULTATION_UPDATE;
  }) {
    const prev = new DomainEvent({
      action: this.EVENT_UPDATED,
      entityName: this.MODEL_NAME,
      payload: { where, data },
    });
    this.eventEmitter.emit(this.EVENT_UPDATED, prev);

    try {
      if (data.scheduledAt) {
        const d = new Date(data.scheduledAt as any);
        if (!isNaN(d.getTime())) {
          data.scheduledAt = d;
        } else {
          delete data.scheduledAt;
        }
      }

      const entity = await this.prisma.consultation.update({
        where,
        data,
        include: CONSULTATION_DEFAULT_INCLUDE,
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
        throw new EntityNotFoundException(`Consulta con ID ${where.id}`);
      throw error;
    }
  }

  public async delete({ where }: { where: CONSULTATION_WITH_ID }) {
    // En consultas médicas, no se suele borrar, se cambia estado a CANCELED.
    // Pero implementamos delete físico si es necesario por error administrativo.
    const prev = new DomainEvent({
      action: this.EVENT_DELETED,
      entityName: this.MODEL_NAME,
      payload: where,
    });
    this.eventEmitter.emit(this.EVENT_DELETED, prev);

    try {
      const entity = await this.prisma.consultation.delete({
        where,
        include: CONSULTATION_DEFAULT_INCLUDE,
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
        throw new EntityNotFoundException(`Consulta con ID ${where.id}`);
      throw error;
    }
  }

  public async count({ where }: { where: CONSULTATION_WHERE }) {
    return this.prisma.consultation.count({ where });
  }
}
