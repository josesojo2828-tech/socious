import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "nestjs-prisma";
import { PatientNutritionistRole, PatientReferralStatus, ReferralType } from "@prisma/client";
import { DomainEvent } from "src/shared/event/domain-listener";
import { LoggerService } from "src/shared/logger/logger.service";
import { EntityNotFoundException } from "src/shared/error/domain-errors";
import PatientReferralModel from "../model/patient-referral.model";
import {
  REFERRAL_WHERE,
  REFERRAL_CREATE,
  REFERRAL_UPDATE,
  REFERRAL_INCLUDE,
  REFERRAL_ORDER,
  REFERRAL_WITH_ID,
  REFERRAL_DEFAULT_INCLUDE,
  PatientReferralView,
  TEAM_MEMBER_INCLUDE,
  PatientTeamMember,
} from "../dto/patient-referral.dto";

@Injectable()
export default class PatientReferralRepository extends PatientReferralModel {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {
    super();
  }

  /**
   * MAPPER: Prisma Entity -> Domain Interface
   */
  private format(entity: any): PatientReferralView | null {
    if (!entity) return null;
    return {
      id: entity.id,
      patientId: entity.patientId,
      fromNutritionistId: entity.fromNutritionistId,
      toNutritionistId: entity.toNutritionistId,
      status: entity.status,
      type: entity.type,
      message: entity.message,
      responseMessage: entity.responseMessage,
      respondedById: entity.respondedById,
      createdAt: entity.createdAt,
      respondedAt: entity.respondedAt,

      // Relaciones (verificamos si existen por el include)
      patient: entity.patient
        ? {
            id: entity.patient.id,
            firstName: entity.patient.firstName,
            lastName: entity.patient.lastName,
            email: entity.patient.email,
          }
        : undefined,
      fromNutritionist: entity.fromNutritionist,
      toNutritionist: entity.toNutritionist,
      respondedBy: entity.respondedBy,
    };
  }

  public async findMany({
    where,
    include,
    orderBy,
    skip,
    take,
  }: {
    where: REFERRAL_WHERE;
    include?: REFERRAL_INCLUDE;
    orderBy?: REFERRAL_ORDER;
    skip: number;
    take: number;
  }) {
    const entities = await this.prisma.patientReferral.findMany({
      where,
      include: include || REFERRAL_DEFAULT_INCLUDE,
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
    where: REFERRAL_WHERE;
    include?: REFERRAL_INCLUDE;
  }) {
    const entity = await this.prisma.patientReferral.findFirst({
      where,
      include: include || REFERRAL_DEFAULT_INCLUDE,
    });
    return this.format(entity);
  }

  /**
   * CREAR REFERIDO (PENDING)
   */
  public async create({ data }: { data: REFERRAL_CREATE }) {
    const prev = new DomainEvent({
      action: this.EVENT_CREATED,
      entityName: this.MODEL_NAME,
      payload: data,
    });
    this.eventEmitter.emit(this.EVENT_CREATED, prev);

    try {
      const entity = await this.prisma.patientReferral.create({
        data,
        include: REFERRAL_DEFAULT_INCLUDE,
      });

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
      this.logger.logError(`Error creando referido`, error);
      throw error;
    }
  }

  /**
   * ACTUALIZAR ESTADO (Rechazo / Cancelación, single-write)
   */
  public async update({
    where,
    data,
  }: {
    where: REFERRAL_WITH_ID;
    data: REFERRAL_UPDATE;
  }) {
    const prev = new DomainEvent({
      action: this.EVENT_UPDATED,
      entityName: this.MODEL_NAME,
      payload: { where, data },
    });
    this.eventEmitter.emit(this.EVENT_UPDATED, prev);

    try {
      const entity = await this.prisma.patientReferral.update({
        where,
        data,
        include: REFERRAL_DEFAULT_INCLUDE,
      });

      const success = new DomainEvent({
        action: this.EVENT_UPDATED_SUCCESS,
        entityName: this.MODEL_NAME,
        payload: entity,
      });
      this.eventEmitter.emit(this.EVENT_UPDATED_SUCCESS, success);

      return this.format(entity);
    } catch (error) {
      const failed = new DomainEvent({
        action: this.EVENT_UPDATED_FAILED,
        entityName: this.MODEL_NAME,
        payload: { where, data },
        metadata: { error },
      });
      this.eventEmitter.emit(this.EVENT_UPDATED_FAILED, failed);

      if (error.code === "P2025")
        throw new EntityNotFoundException(`Referido con ID ${where.id}`);
      throw error;
    }
  }

  /**
   * ACEPTAR REFERIDO (TRANSACCIONAL)
   * Atómico: marca el referido ACCEPTED y actualiza el pivote PatientNutritionist
   * (clave única @@unique([patientId, nutritionistId])).
   * Según el `type` del referido:
   *  - COLLABORATOR: el destinatario se une como SUPPORT; el PRIMARY no se toca.
   *  - TRANSFER: el remitente (source PRIMARY) pasa a SUPPORT y el destinatario
   *    se convierte en PRIMARY (ambos activos).
   */
  public async accept({
    id,
    actorId,
    responseMessage,
    type,
  }: {
    id: string;
    actorId: string;
    responseMessage?: string;
    type: ReferralType;
  }) {
    const prev = new DomainEvent({
      action: this.EVENT_ACCEPTED,
      entityName: this.MODEL_NAME,
      payload: { id, actorId },
    });
    this.eventEmitter.emit(this.EVENT_ACCEPTED, prev);

    try {
      const entity = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.patientReferral.update({
          where: { id },
          data: {
            status: PatientReferralStatus.ACCEPTED,
            responseMessage,
            respondedById: actorId,
            respondedAt: new Date(),
          },
          include: REFERRAL_DEFAULT_INCLUDE,
        });

        if (type === ReferralType.COLLABORATOR) {
          // El PRIMARY original queda intacto; el destinatario se une como SUPPORT.
          await tx.patientNutritionist.upsert({
            where: {
              patientId_nutritionistId: {
                patientId: updated.patientId,
                nutritionistId: updated.toNutritionistId,
              },
            },
            create: {
              patientId: updated.patientId,
              nutritionistId: updated.toNutritionistId,
              role: PatientNutritionistRole.SUPPORT,
              isActive: true,
              assignedById: updated.fromNutritionistId,
            },
            update: {
              isActive: true,
              assignedById: updated.fromNutritionistId,
            },
          });
        } else {
          // TRANSFER: el remitente deja de ser PRIMARY (pasa a SUPPORT) y el
          // destinatario asume PRIMARY. Ambos permanecen activos.
          const sourceMembership =
            await tx.patientNutritionist.findFirst({
              where: {
                patientId: updated.patientId,
                nutritionistId: updated.fromNutritionistId,
              },
            });
          if (sourceMembership) {
            await tx.patientNutritionist.update({
              where: {
                patientId_nutritionistId: {
                  patientId: updated.patientId,
                  nutritionistId: updated.fromNutritionistId,
                },
              },
              data: {
                role: PatientNutritionistRole.SUPPORT,
                isActive: true,
              },
            });
          }

          await tx.patientNutritionist.upsert({
            where: {
              patientId_nutritionistId: {
                patientId: updated.patientId,
                nutritionistId: updated.toNutritionistId,
              },
            },
            create: {
              patientId: updated.patientId,
              nutritionistId: updated.toNutritionistId,
              role: PatientNutritionistRole.PRIMARY,
              isActive: true,
              assignedById: updated.fromNutritionistId,
            },
            update: {
              role: PatientNutritionistRole.PRIMARY,
              isActive: true,
              assignedById: updated.fromNutritionistId,
            },
          });
        }

        return updated;
      });

      const success = new DomainEvent({
        action: this.EVENT_ACCEPTED_SUCCESS,
        entityName: this.MODEL_NAME,
        payload: entity,
      });
      this.eventEmitter.emit(this.EVENT_ACCEPTED_SUCCESS, success);

      return this.format(entity);
    } catch (error) {
      const failed = new DomainEvent({
        action: this.EVENT_ACCEPTED_FAILED,
        entityName: this.MODEL_NAME,
        payload: { id, actorId },
        metadata: { error },
      });
      this.eventEmitter.emit(this.EVENT_ACCEPTED_FAILED, failed);

      if (error.code === "P2025")
        throw new EntityNotFoundException(`Referido con ID ${id}`);
      throw error;
    }
  }

  /**
   * MAPPER: Prisma PatientNutritionist -> Domain Interface (TeamMember)
   */
  private formatMembership(entity: any): PatientTeamMember {
    return {
      id: entity.id,
      patientId: entity.patientId,
      nutritionistId: entity.nutritionistId,
      role: entity.role,
      isActive: entity.isActive,
      assignedById: entity.assignedById,
      assignedAt: entity.assignedAt,
      nutritionist: entity.nutritionist,
      assignedBy: entity.assignedBy,
    };
  }

  /**
   * TEAM: membresías ACTIVAS de un paciente (ordenadas por asignación).
   * Persistencia pura: NO emite eventos (el servicio orquesta las reglas).
   */
  public async findActiveTeamMembers({
    patientId,
  }: {
    patientId: string;
  }): Promise<PatientTeamMember[]> {
    const entities = await this.prisma.patientNutritionist.findMany({
      where: { patientId, isActive: true },
      include: TEAM_MEMBER_INCLUDE,
      orderBy: { assignedAt: "asc" },
    });
    return entities.map((e) => this.formatMembership(e));
  }

  /**
   * TEAM: membresía de un nutricionista en un paciente (activa o no).
   */
  public async findMembership({
    patientId,
    nutritionistId,
  }: {
    patientId: string;
    nutritionistId: string;
  }) {
    return this.prisma.patientNutritionist.findFirst({
      where: { patientId, nutritionistId },
          });
  }

  /**
   * TEAM: cantidad de PRIMARYs activos del paciente.
   */
  public async countActivePrimaries({ patientId }: { patientId: string }) {
    return this.prisma.patientNutritionist.count({
      where: {
        patientId,
        isActive: true,
        role: PatientNutritionistRole.PRIMARY,
      },
    });
  }

  /**
   * TEAM: cambiar el rol de una membresía activa (PRIMARY | SUPPORT).
   */
  public async updateMembershipRole({
    patientId,
    nutritionistId,
    role,
  }: {
    patientId: string;
    nutritionistId: string;
    role: PatientNutritionistRole;
  }): Promise<PatientTeamMember> {
    const entity = await this.prisma.patientNutritionist.update({
      where: {
        patientId_nutritionistId: { patientId, nutritionistId },
      },
      data: { role },
      include: TEAM_MEMBER_INCLUDE,
    });
    return this.formatMembership(entity);
  }

  /**
   * TEAM: desactivar una membresía (soft-delete, conserva el historial).
   */
  public async deactivateMembership({
    patientId,
    nutritionistId,
  }: {
    patientId: string;
    nutritionistId: string;
  }): Promise<PatientTeamMember> {
    const entity = await this.prisma.patientNutritionist.update({
      where: {
        patientId_nutritionistId: { patientId, nutritionistId },
      },
      data: { isActive: false },
      include: TEAM_MEMBER_INCLUDE,
    });
    return this.formatMembership(entity);
  }

  /**
   * TEAM: alta directa de un colaborador SUPPORT (nueva membresía).
   * Persistencia pura: NO emite eventos (el servicio orquesta las reglas).
   */
  public async createMembership({
    patientId,
    nutritionistId,
    assignedById,
  }: {
    patientId: string;
    nutritionistId: string;
    assignedById: string;
  }): Promise<PatientTeamMember> {
    const entity = await this.prisma.patientNutritionist.create({
      data: {
        patientId,
        nutritionistId,
        role: PatientNutritionistRole.SUPPORT,
        isActive: true,
        assignedById,
      },
      include: TEAM_MEMBER_INCLUDE,
    });
    return this.formatMembership(entity);
  }

  /**
   * TEAM: reactivar una membresía soft-deleted como SUPPORT.
   * Reusa la misma fila del pivote (historial conservado), rol SUPPORT y
   * reasignación por el actor que la reactiva.
   */
  public async reactivateMembership({
    patientId,
    nutritionistId,
    assignedById,
  }: {
    patientId: string;
    nutritionistId: string;
    assignedById: string;
  }): Promise<PatientTeamMember> {
    const entity = await this.prisma.patientNutritionist.update({
      where: {
        patientId_nutritionistId: { patientId, nutritionistId },
      },
      data: {
        role: PatientNutritionistRole.SUPPORT,
        isActive: true,
        assignedById,
        assignedAt: new Date(),
      },
      include: TEAM_MEMBER_INCLUDE,
    });
    return this.formatMembership(entity);
  }

  public async count({ where }: { where: REFERRAL_WHERE }) {
    return this.prisma.patientReferral.count({ where });
  }
}