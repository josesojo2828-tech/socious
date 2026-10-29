import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "nestjs-prisma"; // Necesario para consultas auxiliares (Categorías)

// Repositories & Services
import FoodRepository from "../repository/food.repository";
import { I18nService } from "src/shared/lang/i18n.service";
import { LoggerService } from "src/shared/logger/logger.service";

// DTOs & Types
import {
  FOOD_ITEM_CREATE,
  FOOD_ITEM_UPDATE,
  FOOD_ITEM_WHERE,
  ICreateFoodDto,
} from "../dto/food.type";
import { User } from "src/shared/types/schema.types";
import { FilterParamsDto } from "src/shared/types/server.type";
import { Actions } from "src/shared/types/dashboard.type";
import {
  Form,
  FormInput,
  FormSection,
  FormSelect,
} from "src/shared/types/form/form";
import { DomainEvent } from "src/shared/event/domain-listener";

// Errors
import {
  EntityNotFoundException,
  BusinessLogicException,
} from "src/shared/error/domain-errors";
import PermitReporitory from "src/modules/permit/repository/permit.repository";

@Injectable()
export class FoodService {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly foodRepository: FoodRepository,
    private readonly permitRepository: PermitReporitory,
    private readonly prisma: PrismaService, // Para cargar categorías
    private readonly i18n: I18nService,
    private readonly logger: LoggerService,
  ) { }

  /**
   * ---------------------------------------------------
   * LÓGICA DE NEGOCIO (CRUD)
   * ---------------------------------------------------
   */

  public async create({
    userSession,
    data,
  }: {
    data: ICreateFoodDto;
    userSession: User;
  }) {
    const prev = new DomainEvent({
      action: this.foodRepository.EVENT_CREATED,
      entityName: this.foodRepository.MODEL_NAME,
      payload: data,
    });
    this.eventEmitter.emit(this.foodRepository.EVENT_CREATED, prev);
    this.logger.logInfo(
      `Creando alimento: ${data.name} (Usuario: ${userSession.username})`,
    );

    try {
      // 1. Preparar DTO para Prisma
      // Por defecto, asignamos al usuario actual como creador (Alimento Privado)
      // Si el usuario es SUPERADMIN, podrías permitirle crear alimentos globales (createdById: null)
      // Aquí asumimos flujo normal de nutricionista.

      const dataCreate: FOOD_ITEM_CREATE = {
        name: data.name,
        createdBy: { connect: { id: userSession.id } }, // Propiedad del usuario
        // category: { connect: { id: data.categoryId } },
        brand: data.brand,

        baseQuantity: Number(data.baseQuantity) || 100,

        calories: Number(data.calories),
        proteins: Number(data.proteins),
        carbohydrates: Number(data.carbohydrates),
        fats: Number(data.fats),

        // Opcionales
        sodium: data.sodium ? Number(data.sodium) : 0,
        fiberTotal: data.fiberTotal ? Number(data.fiberTotal) : 0,
        sugar: data.sugar ? Number(data.sugar) : 0,
      };

      const entity = await this.foodRepository.create({ data: dataCreate });

      const success = new DomainEvent({
        action: this.foodRepository.EVENT_CREATED_SUCCESS,
        entityName: this.foodRepository.MODEL_NAME,
        payload: entity,
      });
      this.eventEmitter.emit(
        this.foodRepository.EVENT_CREATED_SUCCESS,
        success,
      );

      return entity;
    } catch (error) {
      const failed = new DomainEvent({
        action: this.foodRepository.EVENT_CREATED_FAILED,
        entityName: this.foodRepository.MODEL_NAME,
        payload: data,
        metadata: { error },
      });
      this.eventEmitter.emit(this.foodRepository.EVENT_CREATED_FAILED, failed);

      // Relanzamos para que el ExceptionFilter lo maneje
      throw error;
    }
  }

  public async update({
    userSession,
    data,
    id,
  }: {
    data: Partial<ICreateFoodDto>;
    userSession: User;
    id: string;
  }) {
    const prev = new DomainEvent({
      action: this.foodRepository.EVENT_UPDATED,
      entityName: this.foodRepository.MODEL_NAME,
      payload: { id, data },
    });
    this.eventEmitter.emit(this.foodRepository.EVENT_UPDATED, prev);

    try {
      // 1. Verificar Propiedad y Existencia
      const existing = await this.foodRepository.findOne({ where: { id } });

      if (!existing) {
        throw new EntityNotFoundException("Alimento");
      }

      // REGLA DE NEGOCIO:
      // No puedes editar alimentos del sistema (Globales) si no eres el creador o Superadmin.
      // Si createdById es null (Global) y yo soy un usuario normal, Error.
      if (
        existing.createdById === null &&
        !userSession.permits.list.includes("SUPERADMIN")
      ) {
        throw new BusinessLogicException(
          "No puedes editar un alimento de la base de datos global. Crea una copia o uno nuevo.",
        );
      }

      // Si es privado, debe ser mío
      if (existing.createdById && existing.createdById !== userSession.id) {
        throw new BusinessLogicException(
          "No tienes permisos para editar este alimento.",
        );
      }

      // 2. Mapeo de actualización
      const dataUpdate: FOOD_ITEM_UPDATE = {};
      if (data.name) dataUpdate.name = data.name;
      // if (data.categoryId) dataUpdate.category = { connect: { id: data.categoryId } };
      if (data.brand !== undefined) dataUpdate.brand = data.brand;

      // Macros
      if (data.calories !== undefined)
        dataUpdate.calories = Number(data.calories);
      if (data.proteins !== undefined)
        dataUpdate.proteins = Number(data.proteins);
      if (data.carbohydrates !== undefined)
        dataUpdate.carbohydrates = Number(data.carbohydrates);
      if (data.fats !== undefined) dataUpdate.fats = Number(data.fats);

      // Ejecución
      const entity = await this.foodRepository.update({
        where: { id },
        data: dataUpdate,
      });

      const success = new DomainEvent({
        action: this.foodRepository.EVENT_UPDATED_SUCCESS,
        entityName: this.foodRepository.MODEL_NAME,
        payload: entity,
      });
      this.eventEmitter.emit(
        this.foodRepository.EVENT_UPDATED_SUCCESS,
        success,
      );

      return entity;
    } catch (error) {
      const failed = new DomainEvent({
        action: this.foodRepository.EVENT_UPDATED_FAILED,
        entityName: this.foodRepository.MODEL_NAME,
        payload: { id, data },
        metadata: { error },
      });
      this.eventEmitter.emit(this.foodRepository.EVENT_UPDATED_FAILED, failed);
      throw error;
    }
  }

  public async delete({ userSession, id }: { id: string; userSession: User }) {
    const prev = new DomainEvent({
      action: this.foodRepository.EVENT_DELETED,
      entityName: this.foodRepository.MODEL_NAME,
      payload: id,
    });
    this.eventEmitter.emit(this.foodRepository.EVENT_DELETED, prev);

    try {
      const existing = await this.foodRepository.findOne({ where: { id } });

      if (!existing) throw new EntityNotFoundException("Alimento");

      // REGLA: No borrar alimentos globales
      if (existing.createdById === null) {
        throw new BusinessLogicException(
          "No puedes eliminar alimentos del sistema.",
        );
      }

      // REGLA: Solo borrar mis alimentos
      if (existing.createdById !== userSession.id) {
        throw new BusinessLogicException(
          "No tienes permisos para eliminar este alimento.",
        );
      }

      const entity = await this.foodRepository.delete({ where: { id } });

      const success = new DomainEvent({
        action: this.foodRepository.EVENT_DELETED_SUCCESS,
        entityName: this.foodRepository.MODEL_NAME,
        payload: id,
      });
      this.eventEmitter.emit(
        this.foodRepository.EVENT_DELETED_SUCCESS,
        success,
      );

      return entity;
    } catch (error) {
      const failed = new DomainEvent({
        action: this.foodRepository.EVENT_DELETED_FAILED,
        entityName: this.foodRepository.MODEL_NAME,
        payload: id,
        metadata: { error },
      });
      this.eventEmitter.emit(this.foodRepository.EVENT_DELETED_FAILED, failed);
      throw error;
    }
  }

  /**
   * ---------------------------------------------------
   * VISTAS Y DATOS (UI)
   * ---------------------------------------------------
   */

  public async pagination({
    query,
    userSession,
  }: {
    query: FilterParamsDto;
    userSession: User;
  }) {
    const columns = this.foodRepository.getColumns();
    const categoryOptions = await this.getCategoryOptions();
    const form = this.foodRepository.getFormCreate({ categoryOptions });
    const paginate = await this.getPaginate(query, userSession.id);
    const actions = await this.getActions(
      userSession.permits?.list || [],
      { formCreate: form },
      "food",
    );
    const filters = this.foodRepository.getFilters({ query, categoryOptions });

    return {
      pageTitle: "common.titles.food_database", // Título en la pestaña

      // Variables para los Partials
      actions, // -> _actionsScreen
      filters, // -> _table-filters
      columns, // -> _table (thead)

      // Datos de paginación -> _pagination y _table (tbody)
      list: paginate.list,
      total: paginate.total,
      totalRecords: paginate.totalRecords,
      totalPages: paginate.totalPages,
      currentPage: paginate.currentPage,
      limit: paginate.limit,
      hasPrev: paginate.hasPrev,
      hasNext: paginate.hasNext,

      // Datos extra para lógica de ordenamiento
      sortParams: {
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      },
      currentQuery: query,
    };
  }

  public async unique({ id, userSession }: { id: string; userSession: User }) {
    const entity = await this.foodRepository.findOne({ where: { id } });

    if (!entity) throw new EntityNotFoundException("Alimento");

    const categoryOptions = await this.getCategoryOptions();

    // Solo permitimos editar si es el dueño
    // Si es del sistema, no pasamos formUpdate (la vista debería ocultar botón editar)
    const isOwner = entity.createdById === userSession.id;
    const formUpdate = isOwner
      ? this.foodRepository.getFormUpdate({ object: entity, categoryOptions })
      : undefined;

    const actions = await this.getActions(
      userSession.permits?.list || [],
      { formUpdate },
      "food",
    );

    return {
      pageTitle: entity.name,
      actions,
      object: entity,
      form: formUpdate,
      isReadOnly: !isOwner, // Flag para el frontend
    };
  }

  // --- MÉTODOS AUXILIARES ---

  async getCategoryOptions() {
    const categories = await this.prisma.exchangeList.findMany({
      where: { deletedAt: null, archivedAt: null },
      orderBy: { name: "asc" },
    });
    return categories.map((c) => ({ label: c.name, value: c.id }));
  }

  private async getPaginate(query: FilterParamsDto, userId: string) {
    let { q, sortBy = "name", sortOrder = "asc" } = query;

    // FoodItem no tiene campo createdAt ni updatedAt. 
    // Si sortBy es 'createdAt' (por defecto en FilterParamsDto) o no es una columna válida, usamos 'name'.
    const validSortFields = [
      "id", "createdById", "code", "name", "brand", "baseQuantity",
      "calories", "proteins", "carbohydrates", "fats", "humidity",
      "fiberTotal", "fiberInsoluble", "sugar", "calcium", "iron",
      "magnesium", "zinc", "copper", "sodium", "phosphorus",
      "potassium", "vitaminA", "thiamin", "riboflavin", "niacin",
      "vitaminB6", "ascorbicAcid", "isActive"
    ];

    if (!sortBy || !validSortFields.includes(sortBy)) {
      sortBy = "name";
    }

    const limit = query.limit ? Number(query.limit) : 20;
    const page = query.page ? Number(query.page) : 1;

    // WHERE COMPLEJO: (Global OR Mío) AND Filtros
    const where: FOOD_ITEM_WHERE = {
      AND: [
        // Condición de Visibilidad: Global (null) O Creado por mí
        {
          OR: [{ createdById: null }, { createdById: userId }],
        },
        // Alimentos activos solamente
        { isActive: true },
      ],
    };

    // Búsqueda por texto
    if (q) {
      (where.AND as any[]).push({
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { brand: { contains: q, mode: "insensitive" } },
        ],
      });
    }

    // Filtro Categoría
    // if (categoryId) {
    //     (where.AND as any[]).push({ categoryId });
    // }

    const currentPage = page > 0 ? page : 1;
    const skip = (currentPage - 1) * limit;

    const [list, total] = await Promise.all([
      this.foodRepository.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { [sortBy]: sortOrder },
      }),
      this.foodRepository.count({ where }),
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
    const actions: Actions = {
      create: null,
      update: null,
      list: null,
      unique: null,
      delete: null,
    };

    // Acciones base
    actions.list = {
      label: "common.actions.list",
      icon: "list",
      link: "/dashboard/foods",
      action: "redirect",
    };
    actions.unique = {
      label: "common.actions.unique",
      icon: "eye",
      link: "/dashboard/foods/:id",
    };

    // Crear (Modal)
    if (form.formCreate) {
      actions.create = {
        form: form.formCreate,
        key: "food-create-modal",
        label: "common.actions.add_food",
        icon: "plus",
        link: "/foods/create",
        action: "modal",
      };
    }

    // Editar (Solo si tenemos el formUpdate, que depende del ownership en 'unique')
    if (form.formUpdate) {
      actions.update = {
        form: form.formUpdate,
        key: "food-update-modal",
        label: "common.actions.edit",
        icon: "edit",
        link: "/foods/update",
        action: "modal",
      };

      // Si puede editar, asumimos que puede borrar (es su alimento)
      actions.delete = {
        label: "common.actions.delete",
        icon: "trash",
        link: "/foods/:id/delete",
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
