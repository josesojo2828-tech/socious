import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

// Repositories & Services
import PermitReporitory from "../../permit/repository/permit.repository";
import NotificationReporitory from "../repository/notification.repository";
import { SubscriptionService } from "../../user/services/subscription.service";
import { I18nService } from "src/shared/lang/i18n.service";
import { LoggerService } from "src/shared/logger/logger.service";

// DTOs & Types
import {
  NOTIFICATION_CREATE,
  NOTIFICATION_WHERE,
  NotificationCreate,
} from "../dto/notification.type";
import { User } from "src/shared/types/schema.types";
import { FilterParamsDto } from "src/shared/types/server.type";
import { Actions } from "src/shared/types/dashboard.type";
import {
  Form,
  FormInput,
  FormSection,
  FormSelect,
} from "src/shared/types/form/form";
import { SUBSCRIPTION_WHERE } from "../../user/dto/subscription.type";
import { DomainEvent } from "src/shared/event/domain-listener";

// Errors
import { EntityNotFoundException } from "src/shared/error/domain-errors";

@Injectable()
export class NotificationService {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly permitRepository: PermitReporitory,
    private readonly i18n: I18nService,
    private readonly notificationRepository: NotificationReporitory,
    private readonly subscriptionUserService: SubscriptionService,
    private readonly logger: LoggerService,
  ) { }

  public async pagination({
    query,
    pwhere,
    userSession,
  }: {
    query: FilterParamsDto;
    pwhere?: NOTIFICATION_WHERE[];
    userSession: User;
  }) {
    const columns = this.notificationRepository.getColumns();

    const permitList = userSession?.permits?.list || [];

    const paginate = await this.getPaginate(query);
    const actions = await this.getActions(permitList, {}, "susbcription-plan");
    const filters = this.notificationRepository.getFilters({});

    return {
      pageTitle: "common.subscription.plan",
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

  public async unique({ id, userSession }: { id: string; userSession: User }) {
    const entity = await this.notificationRepository.findOne({ where: { id } });

    // Validación correcta: Lanzamos excepción si no existe
    if (!entity) {
      throw new EntityNotFoundException(`Plan de suscripción`);
    }

    const actions = await this.getActions(
      userSession.permits.list,
      { formCreate: undefined },
      "subscription-plan",
    );

    // Cargar suscriptores activos
    const where: SUBSCRIPTION_WHERE[] = [];
    where.push({ planId: id });
    where.push({ status: "ACTIVE" });

    const internaltable = await this.subscriptionUserService.getPaginate(
      { limit: 10, page: 1 },
      where,
    );

    const form = {
      add: {
        url: "/subscription/form/add",
        label: "common.subscription.add_content",
        ico: "plus",
        color: "sky-600",
      },
    };

    return {
      pageTitle: entity.title,
      actions,
      object: entity,
      subs: { ...internaltable, title: "common.subscription.active_now" },
      form,
    };
  }

  // public async create({ userSession, data }: { data: NotificationCreate, userSession: User }) {
  //   const prev = new DomainEvent({ action: this.notificationRepository.EVENT_CREATED, entityName: this.notificationRepository.MODEL_NAME, payload: data });
  //   this.eventEmitter.emit(this.notificationRepository.EVENT_CREATED, prev);

  //   try {
  //     const dataCreate: NOTIFICATION_CREATE = {
  //       message: data.message,
  //       title: data.title,
  //       user: { connect: { id: userSession.id } },
  //       entityId: data.entityId,
  //       entityType: data.entityType,
  //       type: data.type,
  //     };

  //     const entity = await this.notificationRepository.create({ data: dataCreate });

  //     const success = new DomainEvent({ action: this.notificationRepository.EVENT_CREATED_SUSSCESS, entityName: this.notificationRepository.MODEL_NAME, payload: data });
  //     this.eventEmitter.emit(this.notificationRepository.EVENT_CREATED_SUSSCESS, success);

  //     return entity;

  //   } catch (error) {
  //     // 1. Emitir evento de fallo (Log de auditoría)
  //     const failed = new DomainEvent({ action: this.notificationRepository.EVENT_CREATED_FAILED, entityName: this.notificationRepository.MODEL_NAME, payload: data, metadata: { error: error } });
  //     this.eventEmitter.emit(this.notificationRepository.EVENT_CREATED_FAILED, failed);
  //     this.logger.logError('Error creando plan', error);

  //     // 2. IMPORTANTE: Relanzar el error para que suba al Controller -> ExceptionFilter
  //     throw error;
  //   }
  // }

  public async read({ userSession, id }: { id: string; userSession: User }) {
    const entity = await this.notificationRepository.findOne({ where: { id } });
    if (!entity) {
      throw new EntityNotFoundException(`Notificación`);
    }

    await this.notificationRepository.update({
      where: { id },
      data: { read: true },
    });
    return entity;
  }

  public async delete({ userSession, id }: { id: string; userSession: User }) {
    const prev = new DomainEvent({
      action: this.notificationRepository.EVENT_DELETED,
      entityName: this.notificationRepository.MODEL_NAME,
      payload: id,
    });
    this.eventEmitter.emit(this.notificationRepository.EVENT_DELETED, prev);
    this.logger.logInfo(`Eliminando plan: ${id}`);

    try {
      const entity = await this.notificationRepository.delete({
        where: { id },
      });

      const success = new DomainEvent({
        action: this.notificationRepository.EVENT_DELETED_SUCCESS,
        entityName: this.notificationRepository.MODEL_NAME,
        payload: id,
      });
      this.eventEmitter.emit(
        this.notificationRepository.EVENT_DELETED_SUCCESS,
        success,
      );

      return entity;
    } catch (error) {
      const failed = new DomainEvent({
        action: this.notificationRepository.EVENT_DELETED_FAILED,
        entityName: this.notificationRepository.MODEL_NAME,
        payload: id,
        metadata: { error: error },
      });
      this.eventEmitter.emit(
        this.notificationRepository.EVENT_DELETED_FAILED,
        failed,
      );
      this.logger.logError("Error eliminando plan", error);

      throw error; // <--- Relanzar
    }
  }

  // --- MÉTODOS AUXILIARES ---
  private async getPaginate(query: FilterParamsDto, pwhere?: any[]) {
    try {
      const {
        q,
        currency,
        selected,
        createdAt_gte,
        createdAt_lte,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = query;

      const limit = query.limit ? Number(query.limit) : 10;
      const page = query.page ? Number(query.page) : 1;
      const where: any[] = [];

      if (pwhere) pwhere.forEach((wh) => where.push(wh));
      where.push({ deletedAt: null });

      if (q) {
        where.push({
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        });
      }

      if (currency) where.push({ currency: currency });
      if (selected !== undefined) where.push({ selected: selected });

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
        this.notificationRepository.findMany({
          where: whereClause,
          skip: Number(skip),
          take: Number(limit),
          orderBy: { [sortBy]: sortOrder },
        }),
        this.notificationRepository.count({ where: whereClause }),
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
    } catch (error) {
      this.logger.logError(
        "Error en paginación de notificaciones",
        error instanceof Error ? error.stack ?? error.message : String(error),
      );
      return {
        list: [],
        total: 0,
        totalRecords: 0,
        totalPages: 0,
        currentPage: 1,
        limit: 10,
        hasPrev: false,
        hasNext: false,
      };
    }
  }

  async getActions(
    permitList: string[],
    form: { formCreate?: Form; formUpdate?: Form; formPassword?: Form },
    object: string,
  ) {
    const actions: Actions = {
      create: null,
      update: null,
      list: null,
      unique: null,
      delete: null,
      password: null,
    };

    if (permitList.includes(this.permitRepository.NOTIFICATION_LIST))
      actions.list = {
        label: "common.actions.list",
        icon: "list",
        link: "/dashboard/subscription",
        action: "redirect",
      };
    if (permitList.includes(this.permitRepository.NOTIFICATION_UNIQUE))
      actions.unique = {
        label: "common.actions.unique",
        icon: "list",
        link: "/dashboard/subscription/:id",
      };
    if (permitList.includes(this.permitRepository.NOTIFICATION_CREATED))
      actions.create = {
        form: form.formCreate,
        key: "subscription-plan-create-key-modal",
        label: "common.actions.create",
        icon: "plus",
        link: "/subscription/form/create",
        action: "modal",
      };
    if (permitList.includes(this.permitRepository.NOTIFICATION_UPDATE))
      actions.update = {
        form: form.formUpdate,
        key: "subscription-plan-update-key-modal",
        label: "common.actions.update",
        icon: "edit",
        link: "/subscription/form/update",
        action: "modal",
      };
    if (permitList.includes(this.permitRepository.NOTIFICATION_DELETE))
      actions.delete = {
        label: "common.actions.delete",
        icon: "trash",
        link: "/subscription/:id/delete",
        action: "modal",
      };

    return actions;
  }

  public translateForm(form: Form, lang: string): Form {
    if (form.title) {
      form.title = this.i18n.translate(form.title, lang) || form.title;
    }

    const defaultSubmit = "common.actions.save";
    form.submitLabel =
      this.i18n.translate(form.submitLabel || defaultSubmit, lang) ||
      form.submitLabel;

    if (form.inputs && Array.isArray(form.inputs)) {
      form.inputs.forEach((section: FormSection) => {
        if (section.title) {
          section.title =
            this.i18n.translate(section.title, lang) || section.title;
        }
        if (section.elements && Array.isArray(section.elements)) {
          section.elements.forEach((control: any) => {
            if (control.label) {
              control.label =
                this.i18n.translate(control.label, lang) || control.label;
            }
            if (control.placeholder) {
              control.placeholder =
                this.i18n.translate(control.placeholder, lang) ||
                control.placeholder;
            }
            if (control.options?.length > 0) {
              control.options.forEach((option) => {
                if (option.label) {
                  option.label =
                    this.i18n.translate(option.label, lang) || option.label;
                }
              });
            }
          });
        }
      });
    }

    return form;
  }
}
