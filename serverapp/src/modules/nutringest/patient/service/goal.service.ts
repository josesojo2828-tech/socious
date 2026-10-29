import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import GoalRepository from "../repository/goal.repository";
import { PrismaService } from "nestjs-prisma";
import { User } from "src/shared/types/schema.types";
import { DomainEvent } from "src/shared/event/domain-listener";
import { GOAL_CREATE, GOAL_UPDATE, GOAL_WHERE } from "../dto/goal.type";
import { FilterParamsDto } from "src/shared/types/server.type";
import { I18nService } from "src/shared/lang/i18n.service";
import { Form } from "src/shared/types/form/form";
import { patientsWhereNutritionistAccess } from "../helpers/can-access-patient";

@Injectable()
export class GoalService {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly goalRepository: GoalRepository,
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {}

  // --- VALIDACIÓN DE ACCESO ---
  private async validatePatientAccess(patientId: string, userSession: User) {
    const nutritionistId = userSession.nutritionistProfile?.id;
    if (!nutritionistId)
      throw new ForbiddenException("No eres un nutricionista activo.");

    const patient = await this.prisma.patient.findFirst({
      where: {
        OR: [
          { id: patientId },
          { userId: patientId }
        ],
        ...patientsWhereNutritionistAccess(nutritionistId),
      },
    });

    if (!patient)
      throw new ForbiddenException("No tienes permiso para ver este paciente.");

    return patient;
  }

  // --- NUEVO: MÉTRICAS PARA EL DASHBOARD ---
  public async getMetrics({
    patientId,
    userSession,
  }: {
    patientId: string;
    userSession: User;
  }) {
    const patient = await this.validatePatientAccess(patientId, userSession);
    const resolvedPatientId = patient.id;

    // Consultas optimizadas en paralelo
    const [totalGoals, achievedGoals] = await Promise.all([
      this.prisma.goal.count({ where: { patientId: resolvedPatientId } }),
      this.prisma.goal.count({ where: { patientId: resolvedPatientId, isAchieved: true } }),
    ]);

    const activeGoals = totalGoals - achievedGoals;
    const successRate =
      totalGoals > 0 ? Math.round((achievedGoals / totalGoals) * 100) : 0;

    return {
      totalGoals,
      achievedGoals,
      activeGoals,
      successRate,
    };
  }

  // --- CRUD ---

  public async create({ userSession, data }: { data: any; userSession: User }) {
    const patient = await this.validatePatientAccess(data.patientId, userSession);
    const resolvedPatientId = patient.id;

    const dataCreate: GOAL_CREATE = {
      title: data.title,
      type: data.type,
      description: data.description,
      startValue: data.startValue ? Number(data.startValue) : undefined,
      targetValue: data.targetValue ? Number(data.targetValue) : undefined,
      // Si hay valores, el actual inicia en el startValue
      currentValue: data.startValue ? Number(data.startValue) : undefined,
      deadline: data.deadline ? new Date(data.deadline) : undefined,
      patient: { connect: { id: resolvedPatientId } },
      createdBy: { connect: { id: userSession.id } },
    };

    const prev = new DomainEvent({
      action: this.goalRepository.EVENT_CREATED,
      entityName: this.goalRepository.MODEL_NAME,
      payload: data,
    });
    this.eventEmitter.emit(this.goalRepository.EVENT_CREATED, prev);

    try {
      const entity = await this.goalRepository.create({ data: dataCreate });

      const success = new DomainEvent({
        action: this.goalRepository.EVENT_CREATED_SUCCESS,
        entityName: this.goalRepository.MODEL_NAME,
        payload: entity,
      });
      this.eventEmitter.emit(
        this.goalRepository.EVENT_CREATED_SUCCESS,
        success,
      );

      return entity;
    } catch (error) {
      throw error;
    }
  }

  public async update({
    userSession,
    data,
    id,
  }: {
    data: Partial<GOAL_UPDATE>;
    userSession: User;
    id: string;
  }) {
    // Verificar que la meta exista y pertenezca a un paciente del nutricionista
    const existing = await this.prisma.goal.findFirst({
      where: {
        id,
        patient: patientsWhereNutritionistAccess(
          userSession.nutritionistProfile?.id,
          { write: true },
        ),
      },
    });

    if (!existing)
      throw new NotFoundException("Meta no encontrada o sin acceso.");

    const updateData: any = { ...data };

    // Lógica de Negocio: Auto-completar si alcanza el target
    if (
      updateData.currentValue !== undefined &&
      existing.targetValue !== null &&
      existing.startValue !== null
    ) {
      const target = Number(existing.targetValue);
      const start = Number(existing.startValue);
      const current = Number(updateData.currentValue);

      // Si es pérdida de peso (Target < Start) y Current <= Target -> Logrado
      if (start > target && current <= target) updateData.isAchieved = true;
      // Si es ganancia (Target > Start) y Current >= Target -> Logrado
      if (start < target && current >= target) updateData.isAchieved = true;
    }

    const entity = await this.goalRepository.update({
      where: { id },
      data: updateData,
    });
    return entity;
  }

  public async delete({ userSession, id }: { id: string; userSession: User }) {
    // Verificación de seguridad
    const existing = await this.prisma.goal.findFirst({
      where: {
        id,
        patient: patientsWhereNutritionistAccess(
          userSession.nutritionistProfile?.id,
          { write: true },
        ),
      },
    });
    if (!existing) throw new NotFoundException();

    return await this.goalRepository.delete({ where: { id } });
  }

  // --- VISTAS ---

  public async getCreateForm({
    patientId,
    lang,
    userSession,
  }: {
    patientId: string;
    lang: string;
    userSession?: User;
  }) {
    let resolvedPatientId = patientId;
    if (userSession) {
      const patient = await this.validatePatientAccess(patientId, userSession);
      resolvedPatientId = patient.id;
    }

    const lastAnthro = await this.prisma.anthropometry.findFirst({
      where: { patientId: resolvedPatientId },
      orderBy: { date: "desc" },
      select: { weight: true },
    });

    const form = this.goalRepository.getFormCreate({
      patientId: resolvedPatientId,
      lastAnthro,
    });

    return this.translateForm(form, lang);
  }

  public async pagination({
    query,
    userSession,
  }: {
    query: FilterParamsDto;
    userSession: User;
  }) {
    if (!query.patientId) return { list: [], total: 0, page: 1, limit: 10 };

    const patient = await this.validatePatientAccess(query.patientId, userSession);
    const resolvedPatientId = patient.id;

    const where: GOAL_WHERE = { patientId: resolvedPatientId };

    const list = await this.goalRepository.findMany({
      where,
      skip: 0,
      take: 50, // Traemos suficientes para la vista de tarjetas
      // Orden inteligente: Primero las no logradas (urgentes), luego por fecha límite más cercana
      orderBy: [{ isAchieved: "asc" }, { deadline: "asc" }],
    });

    const form = await this.getCreateForm({
      patientId: resolvedPatientId,
      lang: "es",
      userSession,
    });

    return { list, form };
  }

  public translateForm(form: Form, lang: string): Form {
    form.title = this.i18n.translate(form.title, lang);
    form.submitLabel = this.i18n.translate(form.submitLabel || "Guardar", lang);
    return form;
  }
}
