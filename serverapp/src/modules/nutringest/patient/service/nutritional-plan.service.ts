import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import NutritionalPlanRepository from "../repository/nutritional-plan.repository";
import { PrismaService } from "nestjs-prisma";
import { User } from "src/shared/types/schema.types";
import { FilterParamsDto } from "src/shared/types/server.type";
import {
  PLAN_CREATE,
  PLAN_UPDATE,
  PLAN_WHERE,
} from "../dto/nutritional-plan.type";
import { DomainEvent } from "src/shared/event/domain-listener";
import { I18nService } from "src/shared/lang/i18n.service";
import { Form } from "src/shared/types/form/form";
import { v4 as uuidv4 } from "uuid";
import { LoggerService } from "src/shared/logger/logger.service";
import {
  patientsWhereNutritionistAccess,
} from "../helpers/can-access-patient";
import { WorkspaceContextService } from "../../../../shared/services/workspace-context.service";
import {
  sanitizeRecommendationsForStorage,
  cleanRecommendationsToPlainText,
} from "src/shared/helpers/recommendations.util";

@Injectable()
export class NutritionalPlanService {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly planRepository: NutritionalPlanRepository,
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
    private readonly logger: LoggerService,
    private readonly workspaceContext: WorkspaceContextService,
  ) {}

  // --- CRUD ---

  public async create({ userSession, data }: { data: any; userSession: User }) {
    // Verificar paciente
    const patient = await this.prisma.patient.findFirst({
      where: {
        OR: [
          { id: data.patientId },
          { userId: data.patientId }
        ],
        ...patientsWhereNutritionistAccess(
          userSession.nutritionistProfile?.id,
          { write: true },
        ),
      },
    });
    if (!patient) throw new ForbiddenException("Acceso denegado al paciente.");

    // Get organizationId from workspace context
    const orgId = this.workspaceContext.getWorkspaceId();

    // Construir DTO con relaciones anidadas
    const dataCreate: PLAN_CREATE = {
      name: data.name,
      status: data.status,
      startDate: data.startDate ? new Date(data.startDate) : new Date(),
      kcalTarget: Number(data.kcalTarget),
      proteinTarget: Number(data.proteinTarget),
      carbsTarget: Number(data.carbsTarget),
      fatsTarget: Number(data.fatsTarget),
      recommendations: data.recommendations !== undefined ? sanitizeRecommendationsForStorage(data.recommendations) : undefined,
      waterIntake: data.waterIntake ? Number(data.waterIntake) : null,
      waterRecommendation: data.waterRecommendation !== undefined ? cleanRecommendationsToPlainText(data.waterRecommendation) : undefined,
      activityRecommendation: data.activityRecommendation !== undefined ? cleanRecommendationsToPlainText(data.activityRecommendation) : undefined,
      sleepRecommendation: data.sleepRecommendation !== undefined ? cleanRecommendationsToPlainText(data.sleepRecommendation) : undefined,
      patient: { connect: { id: patient.id } },
      createdBy: { connect: { id: userSession.id } },

      ...(orgId && orgId !== 'personal' ? { organization: { connect: { id: orgId } } } : {}),

      // Asignaciones iniciales (si vienen en el DTO)
      assignedMenus: data.assignedMenus
        ? {
            create: data.assignedMenus.map((m: any) => ({
              eatingMoment: m.eatingMoment,
              menu: { connect: { id: m.menuId } },
              notes: m.notes,
            })),
          }
        : undefined,
      assignedLists: data.assignedLists
        ? {
            create: data.assignedLists.map((l: any) => ({
              eatingMoment: l.eatingMoment,
              portions: Number(l.portions),
              exchangeList: { connect: { id: l.exchangeListId } },
            })),
          }
        : undefined,
      supplements: data.supplements
        ? {
            create: data.supplements.map((s: any) => ({
              name: s.name,
              dose: s.dose,
              frequency: s.frequency,
              brand: s.brand,
              createdBy: { connect: { id: userSession.id } },
            })),
          }
        : undefined,
    };

    const prev = new DomainEvent({
      action: this.planRepository.EVENT_CREATED,
      entityName: this.planRepository.MODEL_NAME,
      payload: data,
    });
    this.eventEmitter.emit(this.planRepository.EVENT_CREATED, prev);

    const entity = await this.planRepository.create({ data: dataCreate });

    const success = new DomainEvent({
      action: this.planRepository.EVENT_CREATED_SUCCESS,
      entityName: this.planRepository.MODEL_NAME,
      payload: entity,
    });
    this.eventEmitter.emit(this.planRepository.EVENT_CREATED_SUCCESS, success);

    return entity;
  }

  public async update({
    userSession,
    data,
    id,
  }: {
    data: any;
    userSession: User;
    id: string;
  }) {
    const plan = await this.prisma.nutritionalPlan.findFirst({
      where: {
        id,
        patient: patientsWhereNutritionistAccess(
          userSession.nutritionistProfile?.id,
          { write: true },
        ),
      },
    });
    if (!plan) throw new NotFoundException("Plan no encontrado o sin acceso.");

    const dataUpdate: PLAN_UPDATE = {
      name: data.name,
      status: data.status,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      kcalTarget: data.kcalTarget !== undefined ? Number(data.kcalTarget) : undefined,
      proteinTarget: data.proteinTarget !== undefined ? Number(data.proteinTarget) : undefined,
      carbsTarget: data.carbsTarget !== undefined ? Number(data.carbsTarget) : undefined,
      fatsTarget: data.fatsTarget !== undefined ? Number(data.fatsTarget) : undefined,
      recommendations: data.recommendations !== undefined ? sanitizeRecommendationsForStorage(data.recommendations) : undefined,
      waterIntake: data.waterIntake !== undefined ? (data.waterIntake ? Number(data.waterIntake) : null) : undefined,
      waterRecommendation: data.waterRecommendation !== undefined ? cleanRecommendationsToPlainText(data.waterRecommendation) : undefined,
      activityRecommendation: data.activityRecommendation !== undefined ? cleanRecommendationsToPlainText(data.activityRecommendation) : undefined,
      sleepRecommendation: data.sleepRecommendation !== undefined ? cleanRecommendationsToPlainText(data.sleepRecommendation) : undefined,

      assignedMenus: data.assignedMenus
        ? {
            deleteMany: {},
            create: data.assignedMenus.map((m: any) => ({
              eatingMoment: m.eatingMoment,
              menu: { connect: { id: m.menuId } },
              notes: m.notes,
            })),
          }
        : undefined,
      assignedLists: data.assignedLists
        ? {
            deleteMany: {},
            create: data.assignedLists.map((l: any) => ({
              eatingMoment: l.eatingMoment,
              portions: Number(l.portions),
              exchangeList: { connect: { id: l.exchangeListId } },
            })),
          }
        : undefined,
      supplements: data.supplements
        ? {
            deleteMany: {},
            create: data.supplements.map((s: any) => ({
              name: s.name,
              dose: s.dose,
              frequency: s.frequency,
              brand: s.brand,
            })),
          }
        : undefined,
    };

    const entity = await this.planRepository.update({
      where: { id },
      data: dataUpdate,
    });
    return entity;
  }

  // --- VISTAS ---

  public async pagination({
    query,
    userSession,
  }: {
    query: FilterParamsDto;
    userSession: User;
  }) {
    if (!query.patientId) return { list: [] };

    const patient = await this.prisma.patient.findFirst({
      where: {
        OR: [
          { id: query.patientId },
          { userId: query.patientId }
        ],
        ...patientsWhereNutritionistAccess(
          userSession.nutritionistProfile?.id,
        ),
      },
    });
    if (!patient) throw new ForbiddenException("Sin acceso al paciente.");

    // Get organizationId from workspace context
    const orgId = this.workspaceContext.getWorkspaceId();

    // Filter by organizationId on the nutritional plan itself
    const where: PLAN_WHERE = {
      patientId: patient.id,
      ...(orgId && orgId !== 'personal'
        ? { organizationId: orgId }
        : { organizationId: null }),
    };

    const list = await this.planRepository.findMany({
      where,
      skip: 0,
      take: 20,
      orderBy: { createdAt: "desc" },
    });

    const form = this.planRepository.getFormCreate({
      patientId: patient.id,
    });

    return {
      list,
      form: this.translateForm(form, "es"),
    };
  }

  public async unique({ id, userSession }: { id: string; userSession?: User }) {
    const nutritionistId = userSession?.nutritionistProfile?.id;
    const where: PLAN_WHERE = {
      id,
      ...(nutritionistId
        ? { patient: patientsWhereNutritionistAccess(nutritionistId) }
        : {}),
    };
    const entity = await this.planRepository.findOne({ where });
    if (!entity) throw new NotFoundException();

    return {
      object: entity,
    };
  }

  public async uniquePublic({
    id,
  }: {
    id: string;
  }) {
    // Solo planes compartidos EXPLÍCITAMENTE (isShared=true) son legibles
    // sin sesión: por plan id o por shareToken. Se eliminó el fallback por
    // patientId/userId que exponía datos clínicos de planes nunca compartidos.
    const entity = await this.planRepository.findOne({
      where: {
        OR: [{ id }, { shareToken: id }],
        isShared: true,
      },
    });

    // Defensa en profundidad: aunque el repositorio devolviera un plan,
    // nunca se expone uno no compartido.
    if (!entity || !entity.isShared) throw new NotFoundException();

    return {
      object: entity,
    };
  }

  public async getCreateForm({
    patientId,
    lang,
    userSession,
  }: {
    patientId: string;
    lang: string;
    userSession: User;
  }) {
    const patient = await this.prisma.patient.findFirst({
      where: {
        OR: [
          { id: patientId },
          { userId: patientId }
        ],
        ...patientsWhereNutritionistAccess(
          userSession.nutritionistProfile?.id,
        ),
      },
    });
    if (!patient) throw new NotFoundException("Paciente no encontrado o sin acceso.");

    const form = this.planRepository.getFormCreate({
      patientId: patient.id,
    });
    return this.translateForm(form, lang);
  }

  public async getUpdateForm({
    id,
    lang,
    userSession,
  }: {
    id: string;
    lang: string;
    userSession: User;
  }) {
    const nutritionistId = userSession.nutritionistProfile?.id;
    const object = await this.planRepository.findOne({
      where: {
        id,
        patient: patientsWhereNutritionistAccess(nutritionistId),
      },
    });
    if (!object) throw new NotFoundException("Plan no encontrado o sin acceso.");

    const form = this.planRepository.getFormUpdate({ object });
    return this.translateForm(form, lang);
  }

  public translateForm(form: Form, lang: string): Form {
    form.title = this.i18n.translate(form.title, lang);
    form.submitLabel = this.i18n.translate(form.submitLabel || "Guardar", lang);
    // ... lógica de traducción recursiva para secciones ...
    return form;
  }

  // ----
  async generateShoppingList(planId: string) {
    const plan = await this.planRepository.findPlanWithFoods(planId);

    if (!plan) throw new NotFoundException("Plan nutricional no encontrado");

    const shoppingMap = new Map<string, any>();

    // Iteramos sobre cada menú asignado al plan
    plan.assignedMenus.forEach((assigned) => {
      const menuItems = assigned.menu.items;

      // Iteramos sobre cada alimento dentro del menú
      menuItems.forEach((item) => {
        const foodId = item.foodId;
        const quantity = Number(item.quantity); // Asegurar número (Prisma usa Decimal)

        if (shoppingMap.has(foodId)) {
          // Si ya existe, sumamos la cantidad
          const existing = shoppingMap.get(foodId);
          existing.totalQuantity += quantity;
        } else {
          // Si es nuevo, lo agregamos al mapa
          shoppingMap.set(foodId, {
            foodId: item.food.id,
            name: item.food.name,
            brand: item.food.brand,
            totalQuantity: quantity,
            unit: item.unit || "g", // Default a gramos si es null
            checked: false, // Útil para el UI
          });
        }
      });
    });

    // Convertimos el mapa a un array y ordenamos alfabéticamente
    const entity = Array.from(shoppingMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    return { items: entity };
  }

  // ------
  // ------
  async generateShareToken(planId: string, userSession: User) {
    const nutritionistId = userSession.nutritionistProfile?.id;
    const plan = await this.prisma.nutritionalPlan.findFirst({
      where: {
        id: planId,
        patient: patientsWhereNutritionistAccess(nutritionistId, {
          write: true,
        }),
      },
    });
    if (!plan) throw new NotFoundException("Plan no encontrado o sin acceso.");

    const token = uuidv4(); // Genera un ID único seguro
    this.logger.debug(`Plan ${planId} compartido con token: ${token}`);
    return this.prisma.nutritionalPlan.update({
      where: { id: planId },
      data: {
        shareToken: token,
        isShared: true,
        // S2 (legal-compliance): el enlace expira a los 30 días; regenerar
        // produce un token nuevo y limpia una revocación previa.
        shareTokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        shareTokenRevokedAt: null,
      },
    });
  }

  /**
   * S2 (legal-compliance): revocación explícita del enlace compartido —
   * el token deja de servir de inmediato (isShared=false + token nulo).
   */
  async revokeShareToken(planId: string, userSession: User) {
    const nutritionistId = userSession.nutritionistProfile?.id;
    const plan = await this.prisma.nutritionalPlan.findFirst({
      where: {
        id: planId,
        patient: patientsWhereNutritionistAccess(nutritionistId, {
          write: true,
        }),
      },
    });
    if (!plan) throw new NotFoundException("Plan no encontrado o sin acceso.");

    return this.prisma.nutritionalPlan.update({
      where: { id: planId },
      data: {
        isShared: false,
        shareToken: null,
        shareTokenExpiresAt: null,
        shareTokenRevokedAt: new Date(),
      },
    });
  }

  public async delete({ id, userSession }: { id: string; userSession: User }) {
    const nutritionistId = userSession.nutritionistProfile?.id;
    const plan = await this.prisma.nutritionalPlan.findFirst({
      where: {
        id,
        patient: patientsWhereNutritionistAccess(nutritionistId, {
          write: true,
        }),
      },
    });
    if (!plan) throw new NotFoundException("Plan no encontrado o sin acceso.");

    return await this.planRepository.delete({ where: { id } });
  }

  // 2. Obtener Plan por Token (Público)
  async findByShareToken(token: string) {
    const plan = await this.prisma.nutritionalPlan.findUnique({
      where: { shareToken: token },
      include: {
        // Archived/deleted menus stay assigned but are never shown to the patient.
        assignedMenus: {
          where: { menu: { archivedAt: null, deletedAt: null } },
          include: {
            menu: { include: { items: { include: { food: true } } } },
          },
        },
        supplements: {
          include: {
            createdBy: {
              select: { id: true, firstName: true, lastName: true, username: true, email: true },
            },
          },
        },
      },
    });

    if (!plan || !plan.isShared) {
      throw new NotFoundException("Este enlace ha expirado o no existe.");
    }

    // S2 (legal-compliance): los enlaces caducan; sin fecha guardada se
    // acepta (compatibilidad con tokens anteriores a esta migración).
    if (
      plan.shareTokenExpiresAt &&
      plan.shareTokenExpiresAt.getTime() < Date.now()
    ) {
      throw new NotFoundException("Este enlace ha expirado o no existe.");
    }

    // Registro de accesos para auditoría del titular de los datos.
    await this.prisma.sharedLinkAccess.create({
      data: { nutritionalPlanId: plan.id },
    });

    return plan;
  }
}
