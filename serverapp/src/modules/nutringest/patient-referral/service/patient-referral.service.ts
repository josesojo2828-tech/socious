import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "nestjs-prisma";
import {
  PatientNutritionistRole,
  PatientReferralStatus,
  ReferralType,
} from "@prisma/client";
import { User } from "src/shared/types/schema.types";
import { DomainEvent } from "src/shared/event/domain-listener";
import { LoggerService } from "src/shared/logger/logger.service";
import { EntityNotFoundException } from "src/shared/error/domain-errors";
import { UserService } from "src/modules/user/services/user.service";
import {
  PatientWithNutritionists,
  canAccessPatient,
  hasPatientListAllPermit,
} from "../../patient/helpers/can-access-patient";
import PatientReferralRepository from "../repository/patient-referral.repository";
import {
  REFERRAL_WHERE,
  REFERRAL_CREATE,
  CreateReferralDto,
  RespondReferralDto,
  AddCollaboratorDto,
  InviteCollaboratorDto,
} from "../dto/patient-referral.dto";
import { WorkspaceContextService } from "src/shared/services/workspace-context.service";

@Injectable()
export class PatientReferralService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly referralRepository: PatientReferralRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
    private readonly userService: UserService,
    private readonly workspaceContext: WorkspaceContextService,
  ) {}

  /**
   * Resuelve el perfil de nutricionista de la sesión.
   * Sin perfil no puede participar del workflow de referidos.
   */
  private ensureNutritionist(userSession: User): string {
    const nutritionistId = userSession.nutritionistProfile?.id;
    if (!nutritionistId) {
      throw new ForbiddenException(
        "Necesitás un perfil de nutricionista para realizar esta acción.",
      );
    }
    return nutritionistId;
  }

  /**
   * Carga el paciente con sus membresías del pivote PatientNutritionist.
   * Lanza EntityNotFound si no existe.
   */
  private async loadPatientOrThrow(
    patientId: string,
  ): Promise<PatientWithNutritionists> {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      include: { nutritionists: true },
    });
    if (!patient) {
      throw new EntityNotFoundException("Paciente");
    }
    return patient;
  }

  /**
   * REQUEST: crear un referido PENDING
   * Guards:
   *  (a) el requirente debe ser miembro ACTIVO del paciente (rol PRIMARY),
   *  (b) el destinatario NO debe ser miembro activo del paciente,
   *  (c) el destinatario debe ser distinto del requirente.
   * `type` (TRANSFER | COLLABORATOR) define la semántica de la aceptación.
   */
  public async request({
    dto,
    userSession,
    type,
  }: {
    dto: CreateReferralDto;
    userSession: User;
    type?: ReferralType;
  }) {
    const fromNutritionistId = this.ensureNutritionist(userSession);
    const referralType = type ?? dto.type ?? ReferralType.TRANSFER;

    const prev = new DomainEvent({
      action: this.referralRepository.EVENT_CREATED,
      entityName: this.referralRepository.MODEL_NAME,
      payload: { ...dto, type: referralType, userId: userSession.id },
    });
    this.eventEmitter.emit(this.referralRepository.EVENT_CREATED, prev);
    this.logger.logInfo(
      `Referido solicitado por nutricionista: ${fromNutritionistId} para paciente: ${dto.patientId}`,
    );

    try {
      // (a) Acceso al paciente: miembro ACTIVO (PRIMARY preferido)
      const patient = await this.prisma.patient.findUnique({
        where: { id: dto.patientId },
        include: { nutritionists: true },
      });
      if (!patient) {
        throw new EntityNotFoundException("Paciente");
      }
      if (
        !canAccessPatient(patient, fromNutritionistId, { primaryOnly: true })
      ) {
        throw new ForbiddenException(
          "No tienes acceso como PRIMARY del paciente para referirlo.",
        );
      }

      // (b) El destinatario no debe ser miembro activo del paciente
      const existingMembership =
        await this.prisma.patientNutritionist.findFirst({
          where: {
            patientId: dto.patientId,
            nutritionistId: dto.toNutritionistId,
            isActive: true,
          },
        });
      if (existingMembership) {
        throw new BadRequestException(
          "El nutricionista destinatario ya es miembro activo del paciente.",
        );
      }

      // (c) Destino != requirente
      if (dto.toNutritionistId === fromNutritionistId) {
        throw new BadRequestException(
          "No puedes referir un paciente a ti mismo.",
        );
      }

      const dataCreate: REFERRAL_CREATE = {
        message: dto.message,
        status: PatientReferralStatus.PENDING,
        type: referralType,
        patient: { connect: { id: dto.patientId } },
        fromNutritionist: { connect: { id: fromNutritionistId } },
        toNutritionist: { connect: { id: dto.toNutritionistId } },
      };

      const entity = await this.referralRepository.create({ data: dataCreate });

      const success = new DomainEvent({
        action: this.referralRepository.EVENT_CREATED_SUCCESS,
        entityName: this.referralRepository.MODEL_NAME,
        payload: entity,
      });
      this.eventEmitter.emit(
        this.referralRepository.EVENT_CREATED_SUCCESS,
        success,
      );

      return entity;
    } catch (error) {
      const failed = new DomainEvent({
        action: this.referralRepository.EVENT_CREATED_FAILED,
        entityName: this.referralRepository.MODEL_NAME,
        payload: dto,
        metadata: { error },
      });
      this.eventEmitter.emit(
        this.referralRepository.EVENT_CREATED_FAILED,
        failed,
      );
      throw error;
    }
  }

  /**
   * BÚSQUEDA DE COLABORADORES PREMIUM (por prefijo de email).
   * Guard: sesión autenticada con perfil de nutricionista.
   * Devuelve SOLO nutricionistas con una suscripción ACTIVA cuyo plan sea
   * `PREMIUM` o `Clínica`, excluyendo al actor. Prefijos < 3 caracteres no
   * disparan query.
   */
  public async searchPremiumNutritionists({
    email,
    userSession,
  }: {
    email?: string;
    userSession: User;
  }) {
    const actorId = this.ensureNutritionist(userSession);
    const prefix = email?.trim() ?? "";
    if (prefix.length < 3) return [];

    const orgId = this.workspaceContext.getWorkspaceId();
    
    // Build where clause
    const where: any = {
      email: { contains: prefix, mode: "insensitive" },
      nutritionistProfile: { isNot: null },
      subscriptions: {
        some: {
          status: "ACTIVE",
          plan: { name: { in: ["PREMIUM", "Clínica"] } },
        },
      },
      NOT: { nutritionistProfile: { is: { id: actorId } } },
    };
    
    // When in clinic workspace, only return nutritionists that are members of that clinic
    if (orgId && orgId !== 'personal') {
      where.organizationMembers = {
        some: { organizationId: orgId, status: 'ACTIVE' }
      };
    }

    const users = await this.prisma.user.findMany({
      where,
      select: {
        email: true,
        firstName: true,
        lastName: true,
        nutritionistProfile: { select: { id: true } },
      },
      take: 10,
    });

    return users.map((user) => ({
      id: user.nutritionistProfile!.id,
      email: user.email,
      fullName: `${user.firstName} ${user.lastName}`,
    }));
  }

  /**
   * INVITACIÓN POR EMAIL de un colaborador PREMIUM (referido COLLABORATOR).
   * Guard:
   *  (a) el actor debe ser PRIMARY activo del paciente,
   *  (b) el email debe resolver a un usuario con perfil de nutricionista,
   *  (c) ese nutricionista debe tener plan PREMIUM/Clínica activo.
   * Luego delega en el mismo flujo de creación que `request()` con
   * `type: COLLABORATOR` (guardas de miembro activo y self-check se reusan).
   */
  public async inviteCollaborator({
    patientId,
    dto,
    userSession,
  }: {
    patientId: string;
    dto: InviteCollaboratorDto;
    userSession: User;
  }) {
    const actorId = this.ensureNutritionist(userSession);
    const patient = await this.loadPatientOrThrow(patientId);

    if (!canAccessPatient(patient, actorId, { primaryOnly: true })) {
      throw new ForbiddenException(
        "Solo el nutricionista PRIMARY del paciente puede invitar colaboradores.",
      );
    }

    const targetUser = await this.userService.findOneByEmail(dto.email);
    if (!targetUser?.nutritionistProfile) {
      throw new EntityNotFoundException("Nutricionista");
    }

    const isPremium = targetUser.subscriptions?.some((subscription) => {
      const planName = subscription.plan?.name?.toUpperCase();
      return (
        subscription.status === "ACTIVE" &&
        (planName === "PREMIUM" || planName === "CLÍNICA")
      );
    });
    if (!isPremium) {
      throw new ForbiddenException(
        "El nutricionista invitado debe tener un plan PREMIUM para colaborar en pacientes.",
      );
    }

    return this.request({
      dto: {
        patientId,
        toNutritionistId: targetUser.nutritionistProfile.id,
        message: dto.message,
        type: ReferralType.COLLABORATOR,
      },
      userSession,
    });
  }

  /**
   * ACCEPT: aceptar un referido PENDING (transaccional)
   * Guard: solo el toNutritionist (o usuario con permit global) y status PENDING.
   */
  public async accept({
    id,
    dto,
    userSession,
  }: {
    id: string;
    dto?: RespondReferralDto;
    userSession: User;
  }) {
    const actorId = this.ensureNutritionist(userSession);

    const prev = new DomainEvent({
      action: this.referralRepository.EVENT_ACCEPTED,
      entityName: this.referralRepository.MODEL_NAME,
      payload: { id, userId: userSession.id },
    });
    this.eventEmitter.emit(this.referralRepository.EVENT_ACCEPTED, prev);

    try {
      const referral = await this.prisma.patientReferral.findUnique({
        where: { id },
      });
      if (!referral) {
        throw new EntityNotFoundException("Referido");
      }

      // Solo el destinatario (o admin con permit global)
      const canAct =
        referral.toNutritionistId === actorId ||
        hasPatientListAllPermit(userSession);
      if (!canAct) {
        throw new ForbiddenException(
          "Solo el nutricionista destinatario puede aceptar el referido.",
        );
      }

      if (referral.status !== PatientReferralStatus.PENDING) {
        throw new BadRequestException(
          "El referido ya fue respondido o cancelado.",
        );
      }

      const entity = await this.referralRepository.accept({
        id,
        actorId,
        responseMessage: dto?.responseMessage,
        type: referral.type,
      });

      const success = new DomainEvent({
        action: this.referralRepository.EVENT_ACCEPTED_SUCCESS,
        entityName: this.referralRepository.MODEL_NAME,
        payload: entity,
      });
      this.eventEmitter.emit(
        this.referralRepository.EVENT_ACCEPTED_SUCCESS,
        success,
      );

      return entity;
    } catch (error) {
      const failed = new DomainEvent({
        action: this.referralRepository.EVENT_ACCEPTED_FAILED,
        entityName: this.referralRepository.MODEL_NAME,
        payload: { id },
        metadata: { error },
      });
      this.eventEmitter.emit(
        this.referralRepository.EVENT_ACCEPTED_FAILED,
        failed,
      );
      throw error;
    }
  }

  /**
   * REJECT: rechazar un referido PENDING
   * Guard: solo el toNutritionist (o admin) y status PENDING.
   * PENDING -> REJECTED con responseMessage / respondedBy / respondedAt.
   */
  public async reject({
    id,
    dto,
    userSession,
  }: {
    id: string;
    dto?: RespondReferralDto;
    userSession: User;
  }) {
    const actorId = this.ensureNutritionist(userSession);

    const prev = new DomainEvent({
      action: this.referralRepository.EVENT_REJECTED,
      entityName: this.referralRepository.MODEL_NAME,
      payload: { id, userId: userSession.id },
    });
    this.eventEmitter.emit(this.referralRepository.EVENT_REJECTED, prev);

    try {
      const referral = await this.prisma.patientReferral.findUnique({
        where: { id },
      });
      if (!referral) {
        throw new EntityNotFoundException("Referido");
      }

      const canAct =
        referral.toNutritionistId === actorId ||
        hasPatientListAllPermit(userSession);
      if (!canAct) {
        throw new ForbiddenException(
          "Solo el nutricionista destinatario puede rechazar el referido.",
        );
      }

      if (referral.status !== PatientReferralStatus.PENDING) {
        throw new BadRequestException(
          "El referido ya fue respondido o cancelado.",
        );
      }

      const entity = await this.referralRepository.update({
        where: { id },
        data: {
          status: PatientReferralStatus.REJECTED,
          responseMessage: dto?.responseMessage,
          respondedAt: new Date(),
          respondedBy: { connect: { id: actorId } },
        },
      });

      const success = new DomainEvent({
        action: this.referralRepository.EVENT_REJECTED_SUCCESS,
        entityName: this.referralRepository.MODEL_NAME,
        payload: entity,
      });
      this.eventEmitter.emit(
        this.referralRepository.EVENT_REJECTED_SUCCESS,
        success,
      );

      return entity;
    } catch (error) {
      const failed = new DomainEvent({
        action: this.referralRepository.EVENT_REJECTED_FAILED,
        entityName: this.referralRepository.MODEL_NAME,
        payload: { id },
        metadata: { error },
      });
      this.eventEmitter.emit(
        this.referralRepository.EVENT_REJECTED_FAILED,
        failed,
      );
      throw error;
    }
  }

  /**
   * CANCEL: cancelar un referido PENDING
   * Guard: solo el fromNutritionist (o admin) y status PENDING.
   * PENDING -> CANCELED.
   */
  public async cancel({
    id,
    userSession,
  }: {
    id: string;
    userSession: User;
  }) {
    const actorId = this.ensureNutritionist(userSession);

    const prev = new DomainEvent({
      action: this.referralRepository.EVENT_CANCELED,
      entityName: this.referralRepository.MODEL_NAME,
      payload: { id, userId: userSession.id },
    });
    this.eventEmitter.emit(this.referralRepository.EVENT_CANCELED, prev);

    try {
      const referral = await this.prisma.patientReferral.findUnique({
        where: { id },
      });
      if (!referral) {
        throw new EntityNotFoundException("Referido");
      }

      const canAct =
        referral.fromNutritionistId === actorId ||
        hasPatientListAllPermit(userSession);
      if (!canAct) {
        throw new ForbiddenException(
          "Solo el nutricionista que envió el referido puede cancelarlo.",
        );
      }

      if (referral.status !== PatientReferralStatus.PENDING) {
        throw new BadRequestException(
          "El referido ya fue respondido o cancelado.",
        );
      }

      const entity = await this.referralRepository.update({
        where: { id },
        data: {
          status: PatientReferralStatus.CANCELED,
          respondedAt: new Date(),
          respondedBy: { connect: { id: actorId } },
        },
      });

      const success = new DomainEvent({
        action: this.referralRepository.EVENT_CANCELED_SUCCESS,
        entityName: this.referralRepository.MODEL_NAME,
        payload: entity,
      });
      this.eventEmitter.emit(
        this.referralRepository.EVENT_CANCELED_SUCCESS,
        success,
      );

      return entity;
    } catch (error) {
      const failed = new DomainEvent({
        action: this.referralRepository.EVENT_CANCELED_FAILED,
        entityName: this.referralRepository.MODEL_NAME,
        payload: { id },
        metadata: { error },
      });
      this.eventEmitter.emit(
        this.referralRepository.EVENT_CANCELED_FAILED,
        failed,
      );
      throw error;
    }
  }

  /**
   * LISTADO DE REFERIDOS ENTRANTES (toNutritionist)
   */
  public async listIncoming({
    nutritionistId,
    status,
  }: {
    nutritionistId?: string;
    status?: string;
  }) {
    const where: REFERRAL_WHERE = { toNutritionistId: nutritionistId };
    if (status) where.status = status as REFERRAL_WHERE["status"];
    return this.referralRepository.findMany({
      where,
      skip: 0,
      take: 100,
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * LISTADO DE REFERIDOS SALIENTES (fromNutritionist)
   */
  public async listOutgoing({
    nutritionistId,
    status,
  }: {
    nutritionistId?: string;
    status?: string;
  }) {
    const where: REFERRAL_WHERE = { fromNutritionistId: nutritionistId };
    if (status) where.status = status as REFERRAL_WHERE["status"];
    return this.referralRepository.findMany({
      where,
      skip: 0,
      take: 100,
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * DETALLE: solo participantes (from / to) o admin global.
   */
  public async findOne({
    id,
    userSession,
  }: {
    id: string;
    userSession: User;
  }) {
    const actorId = this.ensureNutritionist(userSession);
    const referral = await this.referralRepository.findOne({ where: { id } });
    if (!referral) {
      throw new EntityNotFoundException("Referido");
    }

    const isParticipant =
      referral.fromNutritionistId === actorId ||
      referral.toNutritionistId === actorId;
    if (!isParticipant && !hasPatientListAllPermit(userSession)) {
      throw new ForbiddenException(
        "Solo los nutricionistas involucrados pueden ver este referido.",
      );
    }

    return referral;
  }

  /**
   * HISTORIAL DE REFERIDOS DE UN PACIENTE (cualquier status, DESC por createdAt).
   * Guard: miembro ACTIVO del equipo de cuidado del paciente o admin con
   * PATIENT_LIST_ALL (mismo predicado que listTeam).
   */
  public async listByPatient({
    patientId,
    userSession,
  }: {
    patientId: string;
    userSession: User;
  }) {
    const patient = await this.loadPatientOrThrow(patientId);

    const actorId = userSession.nutritionistProfile?.id;
    if (
      !hasPatientListAllPermit(userSession) &&
      !canAccessPatient(patient, actorId)
    ) {
      throw new ForbiddenException(
        "No tienes acceso al historial de referidos de este paciente.",
      );
    }

    return this.referralRepository.findMany({
      where: { patientId },
      skip: 0,
      take: 100,
      orderBy: { createdAt: "desc" },
    });
  }

  // =========================================================
  // T3.6 — TEAM MANAGEMENT (paciente -> equipo de cuidado)
  // =========================================================

  /**
   * LISTAR EQUIPO: membresías ACTIVAS del paciente.
   * Guard: miembro activo (PRIMARY o SUPPORT) o admin con PATIENT_LIST_ALL.
   */
  public async listTeam({
    patientId,
    userSession,
  }: {
    patientId: string;
    userSession: User;
  }) {
    const patient = await this.loadPatientOrThrow(patientId);

    const actorId = userSession.nutritionistProfile?.id;
    if (
      !hasPatientListAllPermit(userSession) &&
      !canAccessPatient(patient, actorId)
    ) {
      throw new ForbiddenException(
        "No tienes acceso al equipo de cuidado de este paciente.",
      );
    }

    return this.referralRepository.findActiveTeamMembers({ patientId });
  }

  /**
   * CAMBIAR ROL de un miembro del equipo.
   * Guard: solo el PRIMARY activo del paciente puede cambiar roles.
   * Reglas:
   *  (a) no se puede degradar al ÚLTIMO PRIMARY (el paciente conserva >= 1),
   *  (b) promover SUPPORT -> PRIMARY está permitido (puede haber múltiples PRIMARYs).
   */
  public async changeRole({
    patientId,
    nutritionistId,
    role,
    userSession,
  }: {
    patientId: string;
    nutritionistId: string;
    role: PatientNutritionistRole;
    userSession: User;
  }) {
    const actorId = this.ensureNutritionist(userSession);
    const patient = await this.loadPatientOrThrow(patientId);

    if (!canAccessPatient(patient, actorId, { primaryOnly: true })) {
      throw new ForbiddenException(
        "Solo el nutricionista PRIMARY del paciente puede cambiar roles.",
      );
    }

    const prev = new DomainEvent({
      action: this.referralRepository.EVENT_MEMBER_ROLE_CHANGED,
      entityName: this.referralRepository.MODEL_NAME,
      payload: { patientId, nutritionistId, role, userId: userSession.id },
    });
    this.eventEmitter.emit(
      this.referralRepository.EVENT_MEMBER_ROLE_CHANGED,
      prev,
    );

    try {
      const membership = await this.referralRepository.findMembership({
        patientId,
        nutritionistId,
      });
      if (!membership || !membership.isActive) {
        throw new EntityNotFoundException("Miembro del equipo");
      }

      // (a) No degradar al último PRIMARY
      if (
        membership.role === PatientNutritionistRole.PRIMARY &&
        role === PatientNutritionistRole.SUPPORT
      ) {
        const primaries = await this.referralRepository.countActivePrimaries({
          patientId,
        });
        if (primaries <= 1) {
          throw new BadRequestException(
            "El paciente debe conservar al menos un PRIMARY; no puedes degradar al último.",
          );
        }
      }

      const entity = await this.referralRepository.updateMembershipRole({
        patientId,
        nutritionistId,
        role,
      });

      const success = new DomainEvent({
        action: this.referralRepository.EVENT_MEMBER_ROLE_CHANGED_SUCCESS,
        entityName: this.referralRepository.MODEL_NAME,
        payload: entity,
      });
      this.eventEmitter.emit(
        this.referralRepository.EVENT_MEMBER_ROLE_CHANGED_SUCCESS,
        success,
      );

      return entity;
    } catch (error) {
      const failed = new DomainEvent({
        action: this.referralRepository.EVENT_MEMBER_ROLE_CHANGED_FAILED,
        entityName: this.referralRepository.MODEL_NAME,
        payload: { patientId, nutritionistId, role },
        metadata: { error },
      });
      this.eventEmitter.emit(
        this.referralRepository.EVENT_MEMBER_ROLE_CHANGED_FAILED,
        failed,
      );
      throw error;
    }
  }

  /**
   * REMOVER miembro del equipo (soft deactivate, conserva el historial).
   * Guard: solo el PRIMARY activo; no puede remover al último PRIMARY.
   */
  public async removeMember({
    patientId,
    nutritionistId,
    userSession,
  }: {
    patientId: string;
    nutritionistId: string;
    userSession: User;
  }) {
    const actorId = this.ensureNutritionist(userSession);
    const patient = await this.loadPatientOrThrow(patientId);

    if (!canAccessPatient(patient, actorId, { primaryOnly: true })) {
      throw new ForbiddenException(
        "Solo el nutricionista PRIMARY del paciente puede remover miembros.",
      );
    }

    const prev = new DomainEvent({
      action: this.referralRepository.EVENT_MEMBER_REMOVED,
      entityName: this.referralRepository.MODEL_NAME,
      payload: { patientId, nutritionistId, userId: userSession.id },
    });
    this.eventEmitter.emit(this.referralRepository.EVENT_MEMBER_REMOVED, prev);

    try {
      const membership = await this.referralRepository.findMembership({
        patientId,
        nutritionistId,
      });
      if (!membership || !membership.isActive) {
        throw new EntityNotFoundException("Miembro del equipo");
      }

      if (membership.role === PatientNutritionistRole.PRIMARY) {
        const primaries = await this.referralRepository.countActivePrimaries({
          patientId,
        });
        if (primaries <= 1) {
          throw new BadRequestException(
            "No puedes eliminar al último PRIMARY del paciente.",
          );
        }
      }

      const entity = await this.referralRepository.deactivateMembership({
        patientId,
        nutritionistId,
      });

      const success = new DomainEvent({
        action: this.referralRepository.EVENT_MEMBER_REMOVED_SUCCESS,
        entityName: this.referralRepository.MODEL_NAME,
        payload: entity,
      });
      this.eventEmitter.emit(
        this.referralRepository.EVENT_MEMBER_REMOVED_SUCCESS,
        success,
      );

      return entity;
    } catch (error) {
      const failed = new DomainEvent({
        action: this.referralRepository.EVENT_MEMBER_REMOVED_FAILED,
        entityName: this.referralRepository.MODEL_NAME,
        payload: { patientId, nutritionistId },
        metadata: { error },
      });
      this.eventEmitter.emit(
        this.referralRepository.EVENT_MEMBER_REMOVED_FAILED,
        failed,
      );
      throw error;
    }
  }

  /**
   * SALIR del equipo (self-remove).
   * Guard: miembro activo; un SUPPORT siempre puede, el último PRIMARY no.
   */
  public async leaveTeam({
    patientId,
    userSession,
  }: {
    patientId: string;
    userSession: User;
  }) {
    const actorId = this.ensureNutritionist(userSession);
    const patient = await this.loadPatientOrThrow(patientId);

    if (!canAccessPatient(patient, actorId)) {
      throw new ForbiddenException(
        "No eres miembro activo del equipo de cuidado de este paciente.",
      );
    }

    const prev = new DomainEvent({
      action: this.referralRepository.EVENT_MEMBER_LEFT,
      entityName: this.referralRepository.MODEL_NAME,
      payload: { patientId, userId: userSession.id },
    });
    this.eventEmitter.emit(this.referralRepository.EVENT_MEMBER_LEFT, prev);

    try {
      const membership = await this.referralRepository.findMembership({
        patientId,
        nutritionistId: actorId,
      });
      if (!membership || !membership.isActive) {
        throw new EntityNotFoundException("Membresía");
      }

      if (membership.role === PatientNutritionistRole.PRIMARY) {
        const primaries = await this.referralRepository.countActivePrimaries({
          patientId,
        });
        if (primaries <= 1) {
          throw new BadRequestException(
            "Eres el último PRIMARY del paciente; no puedes dejar el equipo sin dejar otro PRIMARY.",
          );
        }
      }

      const entity = await this.referralRepository.deactivateMembership({
        patientId,
        nutritionistId: actorId,
      });

      const success = new DomainEvent({
        action: this.referralRepository.EVENT_MEMBER_LEFT_SUCCESS,
        entityName: this.referralRepository.MODEL_NAME,
        payload: entity,
      });
      this.eventEmitter.emit(
        this.referralRepository.EVENT_MEMBER_LEFT_SUCCESS,
        success,
      );

      return entity;
    } catch (error) {
      const failed = new DomainEvent({
        action: this.referralRepository.EVENT_MEMBER_LEFT_FAILED,
        entityName: this.referralRepository.MODEL_NAME,
        payload: { patientId },
        metadata: { error },
      });
      this.eventEmitter.emit(
        this.referralRepository.EVENT_MEMBER_LEFT_FAILED,
        failed,
      );
      throw error;
    }
  }

  /**
   * ALTA DIRECTA de un colaborador (SUPPORT) al equipo de cuidado.
   * NO crea un referido: es un alta directa gestionada por el PRIMARY.
   * Guard: solo el PRIMARY activo del paciente puede agregar colaboradores.
   * Upsert por clave única [patientId, nutritionistId]:
   *  (a) fila activa -> Conflict (ya es parte del equipo),
   *  (b) fila inactiva -> reactivación (rol SUPPORT, assignedAt = now),
   *  (c) sin fila -> alta nueva SUPPORT.
   */
  public async addMember({
    patientId,
    dto,
    userSession,
  }: {
    patientId: string;
    dto: AddCollaboratorDto;
    userSession: User;
  }) {
    const actorId = this.ensureNutritionist(userSession);
    const patient = await this.loadPatientOrThrow(patientId);

    if (!canAccessPatient(patient, actorId, { primaryOnly: true })) {
      throw new ForbiddenException(
        "Solo el nutricionista PRIMARY del paciente puede agregar colaboradores.",
      );
    }

    const prev = new DomainEvent({
      action: this.referralRepository.EVENT_MEMBER_ADDED,
      entityName: this.referralRepository.MODEL_NAME,
      payload: {
        patientId,
        nutritionistId: dto.nutritionistId,
        userId: userSession.id,
      },
    });
    this.eventEmitter.emit(this.referralRepository.EVENT_MEMBER_ADDED, prev);

    try {
      // El colaborador debe existir como nutricionista registrado
      const target = await this.prisma.nutritionist.findUnique({
        where: { id: dto.nutritionistId },
      });
      if (!target) {
        throw new EntityNotFoundException("Nutricionista");
      }

      const existing = await this.referralRepository.findMembership({
        patientId,
        nutritionistId: dto.nutritionistId,
      });
      if (existing?.isActive) {
        throw new ConflictException(
          "El nutricionista ya es parte del equipo de cuidado.",
        );
      }

      const entity = existing
        ? await this.referralRepository.reactivateMembership({
            patientId,
            nutritionistId: dto.nutritionistId,
            assignedById: actorId,
          })
        : await this.referralRepository.createMembership({
            patientId,
            nutritionistId: dto.nutritionistId,
            assignedById: actorId,
          });

      const success = new DomainEvent({
        action: this.referralRepository.EVENT_MEMBER_ADDED_SUCCESS,
        entityName: this.referralRepository.MODEL_NAME,
        payload: entity,
      });
      this.eventEmitter.emit(
        this.referralRepository.EVENT_MEMBER_ADDED_SUCCESS,
        success,
      );

      return entity;
    } catch (error) {
      const failed = new DomainEvent({
        action: this.referralRepository.EVENT_MEMBER_ADDED_FAILED,
        entityName: this.referralRepository.MODEL_NAME,
        payload: { patientId, nutritionistId: dto.nutritionistId },
        metadata: { error },
      });
      this.eventEmitter.emit(
        this.referralRepository.EVENT_MEMBER_ADDED_FAILED,
        failed,
      );
      throw error;
    }
  }
}