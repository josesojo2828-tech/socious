import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

// Repositories & Services
import PermitReporitory from "src/modules/permit/repository/permit.repository";
import PaymentMethodRepository from "src/modules/payment-method/repository/payment-method.repository"; // Corregido import
import { UserPaymentMethodService } from "src/modules/user/services/user-payment-method.service";
import { I18nService } from "src/shared/lang/i18n.service";
import { LoggerService } from "src/shared/logger/logger.service";

// DTOs & Types
import {
  PAYMENT_METHOD_CREATE,
  PAYMENT_METHOD_UPDATE,
  PAYMENT_METHOD_WHERE,
  PaymentMethodCreate,
  PaymentMethodUpdate,
} from "src/modules/payment-method/dto/payment-method.type";
import { USER_PAYMENT_METHOD_WHERE } from "src/modules/user/dto/user-payment-method.types";
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
import { EntityNotFoundException } from "src/shared/error/domain-errors";

@Injectable()
export class PaymentMethodService {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly permitRepository: PermitReporitory,
    private readonly i18n: I18nService,
    private readonly paymentMethodRepository: PaymentMethodRepository, // Corregido nombre
    private readonly userPaymentMethodService: UserPaymentMethodService, // Corregido nombre variable
    private readonly logger: LoggerService,
  ) { }

  public async pagination({
    query,
    pwhere,
    userSession,
  }: {
    query: FilterParamsDto;
    pwhere?: PAYMENT_METHOD_WHERE[];
    userSession: User;
  }) {
    const columns = this.paymentMethodRepository.getColumns();
    const form = this.paymentMethodRepository.getFormCreate({});

    const paginate = await this.getPaginate(query, pwhere);
    const actions = await this.getActions(
      userSession?.permits?.list,
      { formCreate: form },
      "payment-method",
    );

    const filters = this.paymentMethodRepository.getFilters({});

    return {
      pageTitle: "common.payment-methods.index",
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

  public async unique({ id, userSession }: { id: string; userSession: User }) {
    const entity = await this.paymentMethodRepository.findOne({
      where: { id },
    });

    // Validación crítica
    if (!entity) {
      throw new EntityNotFoundException("Método de Pago");
    }

    const actions = await this.getActions(
      userSession.permits.list,
      { formCreate: undefined },
      "payment-method",
    );

    // Tabla interna: Usuarios usando este método
    const where: USER_PAYMENT_METHOD_WHERE[] = [];
    where.push({ paymentMethodId: id });
    where.push({ active: true });
    where.push({ user: { deletedAt: null } });

    const internaltable = await this.userPaymentMethodService.getPaginate(
      { limit: 10, page: 1 },
      where,
    );

    return {
      pageTitle: entity.name,
      actions,
      object: entity,
      subs: { ...internaltable, title: "common.payment_method.active_now" },
    };
  }

  public async create({
    userSession,
    data,
  }: {
    data: PaymentMethodCreate;
    userSession: User;
  }) {
    const prev = new DomainEvent({
      action: this.paymentMethodRepository.EVENT_CREATED,
      entityName: this.paymentMethodRepository.MODEL_NAME,
      payload: data,
    });
    this.eventEmitter.emit(this.paymentMethodRepository.EVENT_CREATED, prev);
    this.logger.logInfo(`Creando método de pago: ${data.name}`);

    try {
      const dataCreate: PAYMENT_METHOD_CREATE = {
        name: data.name,
        description: data.description,
        code: data.code,
        imagePath: data.imagePath,
        colorStart: data.colorStart?.replace('#', ''),
        colorEnd: data.colorEnd?.replace('#', ''),
        colorText: data.colorText?.replace('#', ''),
        active: data.active ?? true,
      };

      const entity = await this.paymentMethodRepository.create({
        data: dataCreate,
      });

      const success = new DomainEvent({
        action: this.paymentMethodRepository.EVENT_CREATED_SUSSCESS,
        entityName: this.paymentMethodRepository.MODEL_NAME,
        payload: data,
      });
      this.eventEmitter.emit(
        this.paymentMethodRepository.EVENT_CREATED_SUSSCESS,
        success,
      );

      return entity;
    } catch (error) {
      const failed = new DomainEvent({
        action: this.paymentMethodRepository.EVENT_CREATED_FAILED,
        entityName: this.paymentMethodRepository.MODEL_NAME,
        payload: data,
        metadata: { error: error },
      });
      this.eventEmitter.emit(
        this.paymentMethodRepository.EVENT_CREATED_FAILED,
        failed,
      );
      this.logger.logError("Error creando método de pago", error);

      throw error;
    }
  }

  public async update({
    userSession,
    data,
    id,
  }: {
    data: PaymentMethodUpdate;
    userSession: User;
    id: string;
  }) {
    const prev = new DomainEvent({
      action: this.paymentMethodRepository.EVENT_UPDATED,
      entityName: this.paymentMethodRepository.MODEL_NAME,
      payload: data,
    });
    this.eventEmitter.emit(this.paymentMethodRepository.EVENT_UPDATED, prev);
    this.logger.logInfo(`Actualizando método de pago: ${id}`);

    try {
      const dataUpdate: PAYMENT_METHOD_UPDATE = {};
      if (data.name) dataUpdate.name = data.name;
      if (data.description) dataUpdate.description = data.description;
      if (data.code) dataUpdate.code = data.code;
      if (data.imagePath) dataUpdate.imagePath = data.imagePath;
      if (data.colorStart) dataUpdate.colorStart = data.colorStart?.replace('#', '');
      if (data.colorEnd) dataUpdate.colorEnd = data.colorEnd?.replace('#', '');
      if (data.colorText) dataUpdate.colorText = data.colorText?.replace('#', '');
      if (data.active !== undefined) dataUpdate.active = data.active;

      const entity = await this.paymentMethodRepository.update({
        data: dataUpdate,
        where: { id },
      });

      const success = new DomainEvent({
        action: this.paymentMethodRepository.EVENT_UPDATED_SUCCESS,
        entityName: this.paymentMethodRepository.MODEL_NAME,
        payload: data,
      });
      this.eventEmitter.emit(
        this.paymentMethodRepository.EVENT_UPDATED_SUCCESS,
        success,
      );

      return entity;
    } catch (error) {
      const failed = new DomainEvent({
        action: this.paymentMethodRepository.EVENT_UPDATED_FAILED,
        entityName: this.paymentMethodRepository.MODEL_NAME,
        payload: data,
        metadata: { error: error },
      });
      this.eventEmitter.emit(
        this.paymentMethodRepository.EVENT_UPDATED_FAILED,
        failed,
      );
      this.logger.logError("Error actualizando método de pago", error);

      throw error;
    }
  }

  public async delete({ userSession, id }: { id: string; userSession: User }) {
    const prev = new DomainEvent({
      action: this.paymentMethodRepository.EVENT_DELETED,
      entityName: this.paymentMethodRepository.MODEL_NAME,
      payload: id,
    });
    this.eventEmitter.emit(this.paymentMethodRepository.EVENT_DELETED, prev);
    this.logger.logInfo(`Eliminando método de pago: ${id}`);

    try {
      const entity = await this.paymentMethodRepository.delete({
        where: { id },
      });

      const success = new DomainEvent({
        action: this.paymentMethodRepository.EVENT_DELETED_SUCCESS,
        entityName: this.paymentMethodRepository.MODEL_NAME,
        payload: id,
      });
      this.eventEmitter.emit(
        this.paymentMethodRepository.EVENT_DELETED_SUCCESS,
        success,
      );

      return entity;
    } catch (error) {
      const failed = new DomainEvent({
        action: this.paymentMethodRepository.EVENT_DELETED_FAILED,
        entityName: this.paymentMethodRepository.MODEL_NAME,
        payload: id,
        metadata: { error: error },
      });
      this.eventEmitter.emit(
        this.paymentMethodRepository.EVENT_DELETED_FAILED,
        failed,
      );
      this.logger.logError("Error eliminando método de pago", error);

      throw error;
    }
  }

  // --- MÉTODOS AUXILIARES ---

  private async getPaginate(query: FilterParamsDto, additionalWhere?: any[]) {
    const {
      q,
      createdAt_gte,
      createdAt_lte,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = query;

    const limit = query.limit ? Number(query.limit) : 10;
    const page = query.page ? Number(query.page) : 1;

    const where: any[] = []; // Corregido tipo a any[] para flexibilidad en la construcción

    if (additionalWhere) additionalWhere.forEach((wh) => where.push(wh));
    where.push({ deletedAt: null });

    if (q) {
      where.push({
        OR: [
          {
            userMethods: {
              some: {
                user: {
                  OR: [
                    { firstName: { contains: q, mode: "insensitive" } },
                    { lastName: { contains: q, mode: "insensitive" } },
                    { username: { contains: q, mode: "insensitive" } },
                    { email: { contains: q, mode: "insensitive" } },
                  ],
                },
              },
            },
          },
          { name: { contains: q, mode: "insensitive" } },
          { code: { contains: q, mode: "insensitive" } },
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
      this.paymentMethodRepository.findMany({
        where: whereClause,
        skip: Number(skip),
        take: Number(limit),
        orderBy: { [sortBy]: sortOrder },
        include: {
          userMethods: {
            select: {
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                  username: true,
                  avatarUrl: true,
                },
              },
            },
          },
          _count: true,
        },
      }),
      this.paymentMethodRepository.count({ where: whereClause }),
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

    if (permitList.includes(this.permitRepository.PAYMENT_METHOD_LIST))
      actions.list = {
        label: "common.actions.list",
        icon: "list",
        link: "/dashboard/payment-methods",
        action: "redirect",
      };
    if (permitList.includes(this.permitRepository.PAYMENT_METHOD_UNIQUE))
      actions.unique = {
        label: "common.actions.unique",
        icon: "list",
        link: "/dashboard/payment-methods/:id",
      };
    if (permitList.includes(this.permitRepository.PAYMENT_METHOD_CREATED))
      actions.create = {
        form: form.formCreate,
        key: "payment-method-create-key-modal",
        label: "common.actions.create",
        icon: "plus",
        link: "/payment-methods/form/create",
        action: "modal",
      };
    if (permitList.includes(this.permitRepository.PAYMENT_METHOD_UPDATE))
      actions.update = {
        form: form.formUpdate,
        key: "payment-method-update-key-modal",
        label: "common.actions.update",
        icon: "edit",
        link: "/payment-methods/form/update",
        action: "modal",
      };
    if (permitList.includes(this.permitRepository.PAYMENT_METHOD_DELETE))
      actions.delete = {
        label: "common.actions.delete",
        icon: "trash",
        link: "/payment-methods/:id/delete",
        action: "modal",
      };

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
