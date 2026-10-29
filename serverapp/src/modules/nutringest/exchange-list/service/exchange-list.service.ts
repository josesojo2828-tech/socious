import {
  ConflictException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

// Repositories & Services
import { I18nService } from "src/shared/lang/i18n.service";
import { LoggerService } from "src/shared/logger/logger.service";

// DTOs & Types
import {
  EXCHANGE_LIST_CREATE,
  EXCHANGE_LIST_UPDATE,
  EXCHANGE_LIST_WHERE,
  CreateExchangeListDto,
  AddExchangeItemDto,
} from "../dto/exchange-list.type";
import { User, Nutritionist } from "src/shared/types/schema.types";
import { FilterParamsDto } from "src/shared/types/server.type";
import { Actions } from "src/shared/types/dashboard.type";
import { Form, FormSection } from "src/shared/types/form/form";
import { DomainEvent } from "src/shared/event/domain-listener";

// Errors
import { EntityNotFoundException } from "src/shared/error/domain-errors";
import PermitReporitory from "src/modules/permit/repository/permit.repository";
import DietRepository from "../../consultation/repository/diet.repository";
import { ExchangeListRepository } from "../repository/exchange-list.repository";
import { PrismaService } from "nestjs-prisma";
import { WorkspaceContextService } from "../../../../shared/services/workspace-context.service";

export interface ExchangeMacros {
  protein: number;
  fat: number;
  carbs: number;
  kcal: number;
}

// Mapa de valores nutricionales estándar por subcategoría UCV 2018
export const EXCHANGE_MACROS_MAP: Record<string, ExchangeMacros> = {

    'HORTALIZAS Y VEGETALES': { protein: 2, fat: 0, carbs: 5, kcal: 25 },
    // Ajo: aliño de 5-10 g, el PDF no lo cuenta como intercambio (kcal 0).
    'ALIÑOS': { protein: 0, fat: 0, carbs: 0, kcal: 0 },
    'FRUTAS': { protein: 0, fat: 0, carbs: 15, kcal: 60 },
    'CEREALES': { protein: 2.5, fat: 0, carbs: 15, kcal: 80 },
    'PANES': { protein: 2.5, fat: 0, carbs: 15, kcal: 80 },
    'TUBERCULOS': { protein: 2.5, fat: 0, carbs: 15, kcal: 80 },
    'LEGUMINOSAS': { protein: 2.5, fat: 0, carbs: 15, kcal: 80 },
    'GALLETAS': { protein: 2.5, fat: 0, carbs: 15, kcal: 80 },
    'CARNES MAGRAS': { protein: 7, fat: 3, carbs: 0, kcal: 55 },
    'CARNES SEMIGORDAS': { protein: 7, fat: 5, carbs: 0, kcal: 75 },
    'CARNES GORDAS': { protein: 7, fat: 8, carbs: 0, kcal: 100 },
    'CARNES': { protein: 7, fat: 5, carbs: 0, kcal: 75 },
    'CARNES O SUSTITUTOS': { protein: 7, fat: 5, carbs: 0, kcal: 75 },
    'LECHE Y SUSTITUTOS': { protein: 8, fat: 2.4, carbs: 12, kcal: 102 },
    'GRASAS MONOINSATURADAS': { protein: 0, fat: 5, carbs: 0, kcal: 45 },
    'GRASAS POLIINSATURADAS': { protein: 0, fat: 5, carbs: 0, kcal: 45 },
    'GRASAS SATURADAS': { protein: 0, fat: 5, carbs: 0, kcal: 45 },
    // PDF LISTA Nº 1 sub names (order matters: MUY BAJA before BAJA)
    'MUY BAJA EN GRASA': { protein: 8, fat: 1.2, carbs: 12, kcal: 90 },
    'BAJA EN GRASA': { protein: 8, fat: 2.4, carbs: 12, kcal: 102 },
    'SEMIDESCREMADA': { protein: 8, fat: 4.8, carbs: 12, kcal: 123 },
    'ENTERA': { protein: 8, fat: 8, carbs: 12, kcal: 150 },
    'DESLACTOSADOS': { protein: 8, fat: 4.8, carbs: 12, kcal: 123 },
    'GRASAS': { protein: 0, fat: 5, carbs: 0, kcal: 45 },
};

/**
 * Resuelve los macronutrientes de un alimento de intercambio por subcategoría
 * y, en su defecto, por categoría. Extraído a nivel de módulo para que los
 * tests puedan usar exactamente la misma lógica que el servicio.
 */
export function resolveExchangeMacros(
  category?: string | null,
  sub?: string | null,
): ExchangeMacros {
  const defaultMacros: ExchangeMacros = { protein: 0, fat: 0, carbs: 0, kcal: 0 };
  if (!category && !sub) return defaultMacros;

  if (sub) {
    const subUpper = sub.toUpperCase();
    for (const [key, value] of Object.entries(EXCHANGE_MACROS_MAP)) {
      if (subUpper.includes(key) || key.includes(subUpper)) return value;
    }
  }
  if (category) {
    const catUpper = category.toUpperCase();
    for (const [key, value] of Object.entries(EXCHANGE_MACROS_MAP)) {
      if (catUpper.includes(key) || key.includes(catUpper)) return value;
    }
  }
  return defaultMacros;
}

@Injectable()
export class ExchangeListService {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly exchangeListRepository: ExchangeListRepository,
    private readonly prisma: PrismaService, // <--- Inyección necesaria para gestionar items directamente
    private readonly permitRepository: PermitReporitory,
    private readonly i18n: I18nService,
    private readonly logger: LoggerService,
    private readonly dietRepository: DietRepository,
    private readonly workspaceContext: WorkspaceContextService,
  ) { }

  /**
   * Asegura que el usuario tenga un perfil de nutricionista activo.
   * Si no está cargado en la sesión, lo busca por userId o lo auto-aprovisiona.
   */
  public async ensureNutritionistProfile(userSession: User): Promise<Nutritionist | null> {
    if (userSession?.nutritionistProfile?.id) {
      return userSession.nutritionistProfile;
    }

    if (!userSession?.id) {
      return null;
    }

    try {
      let profile = await this.prisma.nutritionist.findUnique({
        where: { userId: userSession.id },
      });

      if (!profile) {
        profile = await this.prisma.nutritionist.create({
          data: {
            userId: userSession.id,
          },
        });
      }

      if (profile) {
        userSession.nutritionistProfile = profile;
      }
      return profile;
    } catch (error) {
      this.logger.logInfo(`Error al resolver perfil de nutricionista para user ${userSession.id}: ${error}`);
      try {
        const fallback = await this.prisma.nutritionist.findUnique({
          where: { userId: userSession.id },
        });
        if (fallback) {
          userSession.nutritionistProfile = fallback;
          return fallback;
        }
      } catch {}
      return null;
    }
  }

  /**
   * ---------------------------------------------------
   * NUEVOS MÉTODOS PARA API REACT (Detalle e Items)
   * ---------------------------------------------------
   */

  // 1. Obtener Lista con Items y Alimentos (Deep Fetch)
  public async findOneWithItems({
    id,
    userSession,
  }: {
    id: string;
    userSession: User;
  }) {
    const isAdmin = userSession.permits?.list?.includes("USER_LIST") || userSession.permits?.list?.includes("PERMIT_DASHBOARD");
    const nutProfile = await this.ensureNutritionistProfile(userSession);

    const list = await this.prisma.exchangeList.findFirst({
      where: {
        id,
        deletedAt: null,
        archivedAt: null,
        ...(isAdmin ? {} : { nutritionistId: nutProfile?.id }),
      },
      include: {
        _count: true,
        items: {
          include: {
            foodExchangeList: true,
          },
        },
      },
    });

    if (!list) {
      throw new NotFoundException(
        "Lista de intercambio no encontrada o no tienes permisos.",
      );
    }
    return list;
  }

  public async addItem({
    listId,
    data,
    userSession,
  }: {
    listId: string;
    data: AddExchangeItemDto;
    userSession: User;
  }) {
    const isAdmin = userSession.permits?.list?.includes("USER_LIST") || userSession.permits?.list?.includes("PERMIT_DASHBOARD");
    const nutProfile = await this.ensureNutritionistProfile(userSession);

    // PASO 1: Verificar que la lista existe y pertenece al usuario (Seguridad)
    const list = await this.prisma.exchangeList.findFirst({
      where: {
        id: listId,
        ...(isAdmin ? {} : { nutritionistId: nutProfile?.id }),
        deletedAt: null,
        archivedAt: null,
      },
    });

    if (!list) {
      throw new ForbiddenException('No tienes permiso para editar esta lista o no existe.');
    }

    // PASO 2: Verificar que el Alimento existe (Evita el error P2025)
    const foodExists = await this.prisma.foodExchangeList.findUnique({
      where: { id: data.foodId },
    });

    if (!foodExists) {
      throw new NotFoundException(
        `El alimento con ID ${data.foodId} no existe en la base de datos.`,
      );
    }

    // PASO 3: Crear la relación
    await this.prisma.exchangeListItem.create({
      data: {
        exchangeListId: listId,
        foodExchangeListId: foodExists.id,
        amount: Number(data.amount),
        servingLabel: data.servingLabel,
        groupLabel: data.groupLabel ?? null,
        cookingState: data.cookingState ?? null,
      },
    });

    // PASO 4: Recalcular totales y devolver lista actualizada
    return await this.recalculateListTotals(listId);
  }

  // 3. Remover Item de la Lista
  public async removeItem({
    itemId,
    userSession,
  }: {
    itemId: string;
    userSession: User;
  }) {
    const isAdmin = userSession.permits?.list?.includes("USER_LIST") || userSession.permits?.list?.includes("PERMIT_DASHBOARD");
    const nutProfile = await this.ensureNutritionistProfile(userSession);

    // A. Verificar propiedad a través de la lista padre
    const item = await this.prisma.exchangeListItem.findUnique({
      where: { id: itemId },
      include: { exchangeList: true },
    });

    if (!item || (!isAdmin && item.exchangeList.nutritionistId !== nutProfile?.id)) {
      throw new ForbiddenException('No se puede eliminar este item o no tienes permisos.');
    }

    if (item.exchangeList.archivedAt || item.exchangeList.deletedAt) {
      throw new ForbiddenException(
        'No puedes modificar una lista de intercambio archivada o eliminada.',
      );
    }

    // B. Eliminar
    await this.prisma.exchangeListItem.delete({
      where: { id: itemId },
    });

    // C. Recalcular totales y devolver lista actualizada
    return await this.recalculateListTotals(item.exchangeListId);
  }

  // 4. Actualizar Item de la Lista
  public async updateItem({
    itemId,
    amount,
    servingLabel,
    groupLabel,
    cookingState,
    userSession,
  }: {
    itemId: string;
    amount: number;
    servingLabel?: string;
    groupLabel?: string;
    cookingState?: string;
    userSession: User;
  }) {
    const isAdmin = userSession.permits?.list?.includes("USER_LIST") || userSession.permits?.list?.includes("PERMIT_DASHBOARD");
    const nutProfile = await this.ensureNutritionistProfile(userSession);

    // A. Verificar propiedad a través de la lista padre
    const item = await this.prisma.exchangeListItem.findUnique({
      where: { id: itemId },
      include: { exchangeList: true },
    });

    if (!item || (!isAdmin && item.exchangeList.nutritionistId !== nutProfile?.id)) {
      throw new ForbiddenException('No se puede actualizar este item o no tienes permisos.');
    }

    if (item.exchangeList.archivedAt || item.exchangeList.deletedAt) {
      throw new ForbiddenException(
        'No puedes modificar una lista de intercambio archivada o eliminada.',
      );
    }

    // B. Actualizar
    await this.prisma.exchangeListItem.update({
      where: { id: itemId },
      data: {
        amount: Number(amount),
        ...(servingLabel !== undefined ? { servingLabel } : {}),
        ...(groupLabel !== undefined ? { groupLabel } : {}),
        ...(cookingState !== undefined ? { cookingState } : {}),
      },
    });

    // C. Recalcular totales y devolver lista actualizada
    return await this.recalculateListTotals(item.exchangeListId);
  }


  private getExchangeMacros(category?: string | null, sub?: string | null) {
    return resolveExchangeMacros(category, sub);
  }

  /**
   * MÉTODO PRIVADO CRÍTICO: Recalcula todos los macros de la ExchangeList
   * Suma basándose en la categorización de los alimentos (UCV 2018).
   */
  private async recalculateListTotals(listId: string) {
    // 1. Obtener todos los items con sus datos de alimento
    const items = await this.prisma.exchangeListItem.findMany({
      where: { exchangeListId: listId },
      include: { foodExchangeList: true },
    });

    // 2. Sumar macros basándose en el mapeo UCV 2018
    let totalKcal = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    for (const item of items) {
      const amount = Number(item.amount) || 0;
      const macros = this.getExchangeMacros(item.foodExchangeList?.category, item.foodExchangeList?.sub);
      
      totalKcal += macros.kcal * amount;
      totalProtein += macros.protein * amount;
      totalCarbs += macros.carbs * amount;
      totalFat += macros.fat * amount;
    }

    // 3. Actualizar la cabecera de la lista y devolver con items incluidos
    return await this.prisma.exchangeList.update({
      where: { id: listId },
      data: {
        baseKcal: Math.round(totalKcal),
        baseProtein: totalProtein,
        baseCarbs: totalCarbs,
        baseFat: totalFat
      },
      include: {
        _count: true,
        items: {
          include: {
            foodExchangeList: true,
          },
        },
      },
    });
  }

  /**
   * ---------------------------------------------------
   * LÓGICA DE NEGOCIO Y CRUD ORIGINAL (Form Generator)
   * ---------------------------------------------------
   */
  public async create({
    userSession,
    data,
  }: {
    data: CreateExchangeListDto;
    userSession: User;
  }) {
    const prev = new DomainEvent({
      action: this.exchangeListRepository.EVENT_CREATED,
      entityName: this.exchangeListRepository.MODEL_NAME,
      payload: { ...data, nutritionistId: userSession.id },
    });

    this.eventEmitter.emit(this.exchangeListRepository.EVENT_CREATED, prev);
    this.logger.logInfo(
      `Creando lista para nutricionista: ${userSession.username}`,
    );

    try {
      // Get organizationId from workspace context
      const orgId = this.workspaceContext.getWorkspaceId();
      const nutProfile = await this.ensureNutritionistProfile(userSession);
      if (!nutProfile?.id) {
        throw new ForbiddenException("No se pudo obtener o crear el perfil de nutricionista.");
      }

      const dataCreate: EXCHANGE_LIST_CREATE = {
        name: data.name,
        description: data.description,

        baseKcal: data.baseKcal !== undefined ? Number(data.baseKcal) : 0,
        baseCarbs: data.baseCarbs !== undefined ? Number(data.baseCarbs) : 0,
        baseProtein: data.baseProtein !== undefined ? Number(data.baseProtein) : 0,
        baseFat: data.baseFat !== undefined ? Number(data.baseFat) : 0,

        nutritionist: { connect: { id: nutProfile.id } },
        createdBy: { connect: { id: userSession.id } },

        ...(orgId && orgId !== 'personal' ? { organization: { connect: { id: orgId } } } : {}),
      };

      const entity = await this.exchangeListRepository.create({
        data: dataCreate,
      });

      const success = new DomainEvent({
        action: this.exchangeListRepository.EVENT_CREATED_SUCCESS,
        entityName: this.exchangeListRepository.MODEL_NAME,
        payload: entity,
      });
      this.eventEmitter.emit(
        this.exchangeListRepository.EVENT_CREATED_SUCCESS,
        success,
      );

      return entity;
    } catch (error) {
      const failed = new DomainEvent({
        action: this.exchangeListRepository.EVENT_CREATED_FAILED,
        entityName: this.exchangeListRepository.MODEL_NAME,
        payload: data,
        metadata: { error },
      });
      this.eventEmitter.emit(
        this.exchangeListRepository.EVENT_CREATED_FAILED,
        failed,
      );

      throw error;
    }
  }

  public async update({
    userSession,
    data,
    id,
  }: {
    data: Partial<CreateExchangeListDto>;
    userSession: User;
    id: string;
  }) {
    const prev = new DomainEvent({
      action: this.exchangeListRepository.EVENT_UPDATED,
      entityName: this.exchangeListRepository.MODEL_NAME,
      payload: { id, data },
    });
    this.eventEmitter.emit(this.exchangeListRepository.EVENT_UPDATED, prev);

    try {
      const isAdmin = userSession.permits?.list?.includes("USER_LIST") || userSession.permits?.list?.includes("PERMIT_DASHBOARD");
      const nutProfile = await this.ensureNutritionistProfile(userSession);
      const existing = await this.exchangeListRepository.findOne({
        where: {
          id,
          deletedAt: null,
          archivedAt: null,
          ...(isAdmin ? {} : { nutritionistId: nutProfile?.id }),
        },
      });

      if (!existing) {
        throw new EntityNotFoundException("Lista de Intercambio");
      }

      const dataUpdate: EXCHANGE_LIST_UPDATE = {};
      if (data.name) dataUpdate.name = data.name;
      if (data.description) dataUpdate.description = data.description;
      // Aseguramos conversión a número
      if (data.baseKcal !== undefined)
        dataUpdate.baseKcal = Number(data.baseKcal);
      if (data.baseCarbs !== undefined)
        dataUpdate.baseCarbs = Number(data.baseCarbs);
      if (data.baseProtein !== undefined)
        dataUpdate.baseProtein = Number(data.baseProtein);
      if (data.baseFat !== undefined) dataUpdate.baseFat = Number(data.baseFat);

      const entity = await this.exchangeListRepository.update({
        where: { id },
        data: dataUpdate,
      });

      const success = new DomainEvent({
        action: this.exchangeListRepository.EVENT_UPDATED_SUCCESS,
        entityName: this.exchangeListRepository.MODEL_NAME,
        payload: entity,
      });
      this.eventEmitter.emit(
        this.exchangeListRepository.EVENT_UPDATED_SUCCESS,
        success,
      );

      return entity;
    } catch (error) {
      const failed = new DomainEvent({
        action: this.exchangeListRepository.EVENT_UPDATED_FAILED,
        entityName: this.exchangeListRepository.MODEL_NAME,
        payload: { id, data },
        metadata: { error },
      });
      this.eventEmitter.emit(
        this.exchangeListRepository.EVENT_UPDATED_FAILED,
        failed,
      );
      throw error;
    }
  }

  public async delete({ userSession, id }: { id: string; userSession: User }) {
    const prev = new DomainEvent({
      action: this.exchangeListRepository.EVENT_DELETED,
      entityName: this.exchangeListRepository.MODEL_NAME,
      payload: id,
    });
    this.eventEmitter.emit(this.exchangeListRepository.EVENT_DELETED, prev);

    try {
      const isAdmin = userSession.permits?.list?.includes("USER_LIST") || userSession.permits?.list?.includes("PERMIT_DASHBOARD");
      const nutProfile = await this.ensureNutritionistProfile(userSession);
      const existing = await this.exchangeListRepository.findOne({
        where: {
          id,
          deletedAt: null,
          ...(isAdmin ? {} : { nutritionistId: nutProfile?.id }),
        },
      });
      if (!existing) {
        throw new EntityNotFoundException("Lista de Intercambio");
      }

      const entity = await this.exchangeListRepository.delete({
        where: { id },
      });

      const success = new DomainEvent({
        action: this.exchangeListRepository.EVENT_DELETED_SUCCESS,
        entityName: this.exchangeListRepository.MODEL_NAME,
        payload: id,
      });
      this.eventEmitter.emit(
        this.exchangeListRepository.EVENT_DELETED_SUCCESS,
        success,
      );

      return entity;
    } catch (error) {
      const failed = new DomainEvent({
        action: this.exchangeListRepository.EVENT_DELETED_FAILED,
        entityName: this.exchangeListRepository.MODEL_NAME,
        payload: id,
        metadata: { error },
      });
      this.eventEmitter.emit(
        this.exchangeListRepository.EVENT_DELETED_FAILED,
        failed,
      );
      throw error;
    }
  }

  /**
   * Archiva una lista de intercambio. No borra ni desasigna: solo la saca de la
   * lista activa, bloquea su edición y su ficha, y la oculta del plan del paciente.
   */
  public async archive({ userSession, id }: { id: string; userSession: User }) {
    const existing = await this.findOwnedForLifecycle({ id, userSession });
    if (!existing) throw new EntityNotFoundException("Lista de Intercambio");
    if (existing.archivedAt) {
      throw new ConflictException("La lista de intercambio ya está archivada.");
    }

    return await this.exchangeListRepository.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
  }

  /**
   * Devuelve una lista de intercambio archivada a la lista activa.
   */
  public async unarchive({ userSession, id }: { id: string; userSession: User }) {
    const existing = await this.findOwnedForLifecycle({ id, userSession });
    if (!existing) throw new EntityNotFoundException("Lista de Intercambio");
    if (!existing.archivedAt) {
      throw new ConflictException("La lista de intercambio no está archivada.");
    }

    return await this.exchangeListRepository.update({
      where: { id },
      data: { archivedAt: null },
    });
  }

  private async findOwnedForLifecycle({
    id,
    userSession,
  }: {
    id: string;
    userSession: User;
  }) {
    const isAdmin = userSession.permits?.list?.includes("USER_LIST") || userSession.permits?.list?.includes("PERMIT_DASHBOARD");
    const nutProfile = await this.ensureNutritionistProfile(userSession);

    return await this.exchangeListRepository.findOne({
      where: {
        id,
        deletedAt: null,
        ...(isAdmin ? {} : { nutritionistId: nutProfile?.id }),
      },
    });
  }

  public async pagination({
    query,
    userSession,
  }: {
    query: FilterParamsDto;
    userSession: User;
  }) {
    const columns = this.exchangeListRepository.getColumns();
    const form = this.exchangeListRepository.getFormCreate({});

    const isAdmin = userSession.permits?.list?.includes("USER_LIST") || userSession.permits?.list?.includes("PERMIT_DASHBOARD");
    const nutProfile = await this.ensureNutritionistProfile(userSession);
    const paginate = await this.getPaginate(
      query,
      isAdmin ? undefined : (nutProfile?.id || undefined),
    );
    const actions = await this.getActions(
      userSession.permits?.list || [],
      { formCreate: form },
      "exchange-list",
    );
    const filters = this.exchangeListRepository.getFilters({ query });

    return {
      pageTitle: "exchange.actions.list_title",
      form,
      actions,
      filters,
      ...paginate,
      columns,
      sortParams: {
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      },
      currentQuery: query,
    };
  }

  private async getPaginate(query: FilterParamsDto, nutritionistId?: string) {
    const {
      q,
      createdAt_gte,
      createdAt_lte,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = query;

    const limit = query.limit ? Number(query.limit) : 10;
    const page = query.page ? Number(query.page) : 1;

    // Get organizationId from workspace context
    const orgId = this.workspaceContext.getWorkspaceId();

    const where: EXCHANGE_LIST_WHERE[] = [];

    // Filter by organizationId on the exchange list itself
    if (orgId && orgId !== 'personal') {
      where.push({ organizationId: orgId });
    } else {
      // Personal workspace: only return exchange lists with null organizationId
      where.push({ organizationId: null });
    }

    if (nutritionistId) {
      where.push({ nutritionistId: nutritionistId });
    }
    where.push({ deletedAt: null });

    // Archived records are only listed when the view asks for them explicitly.
    where.push(
      query?.includeArchived === true
        ? { archivedAt: { not: null } }
        : { archivedAt: null },
    );

    if (q) {
      where.push({
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      });
    }

    if (createdAt_gte || createdAt_lte) {
      const dateFilter: any = {};
      if (createdAt_gte) dateFilter.gte = new Date(createdAt_gte);
      if (createdAt_lte) dateFilter.lte = new Date(createdAt_lte);
      where.push({ createdAt: dateFilter });
    }

    const currentPage = page > 0 ? page : 1;
    const skip = (currentPage - 1) * limit;

    const whereClause = { AND: where };

    const [list, total] = await Promise.all([
      this.exchangeListRepository.findMany({
        where: whereClause,
        skip,
        take: Number(limit),
        orderBy: { [sortBy]: sortOrder },
      }),
      this.exchangeListRepository.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(total / limit);
    const hasPrev = currentPage > 1;
    const hasNext = currentPage < totalPages;

    return {
      list,
      total,
      totalRecords: total,
      totalPages,
      currentPage,
      limit,
      hasPrev,
      hasNext,
    };
  }

  async getActions(
    permitList: string[],
    form: { formCreate?: Form; formUpdate?: Form },
    object: string,
  ) {
    // ... (Tu lógica de actions original, ajustando links si es necesario)
    const actions: Actions = {
      create: null,
      update: null,
      list: null,
      unique: null,
      delete: null,
      password: null,
    };

    actions.list = {
      label: "common.actions.list",
      icon: "list",
      link: "/dashboard/exchange-list",
      action: "redirect",
    };
    actions.unique = {
      label: "common.actions.unique",
      icon: "eye",
      link: "/dashboard/exchange-list/:id",
    };

    if (form.formCreate) {
      actions.create = {
        form: form.formCreate,
        key: "exchange-create-modal",
        label: "Crear Lista",
        icon: "plus",
        link: "/exchange-list/create",
        action: "modal",
      };
    }
    return actions;
  }

  public translateForm(form: Form, lang: string): Form {
    form.title = this.i18n.translate(form.title, lang);
    form.submitLabel = this.i18n.translate(
      form.submitLabel || "common.actions.save",
      lang,
    );
    form.inputs.forEach((section: FormSection) => {
      section.title = this.i18n.translate(section.title, lang);
      section.elements.forEach((control: any) => {
        control.label = this.i18n.translate(control.label, lang);
        if (control.placeholder)
          control.placeholder = this.i18n.translate(control.placeholder, lang);
        if (control.options?.length > 0) {
          control.options.forEach((option) => {
            option.label = this.i18n.translate(option.label, lang);
          });
        }
      });
    });
    return form;
  }
}
