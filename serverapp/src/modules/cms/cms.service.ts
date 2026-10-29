import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

// Repositories & Services
import PermitRepository from "src/modules/permit/repository/permit.repository";
import CmsRepository from "./repository/cms.repository";
import { I18nService } from "src/shared/lang/i18n.service";
import { LoggerService } from "src/shared/logger/logger.service";

// DTOs & Types
import {
  CMS_CREATE,
  CMS_UPDATE,
  CMS_WHERE,
  CmsCreateDto,
  CmsUpdateDto,
} from "./dto/cms.type";
import { User } from "src/shared/types/schema.types";
import { FilterParamsDto } from "src/shared/types/server.type";
import { Actions } from "src/shared/types/dashboard.type";
import { Form, FormSection } from "src/shared/types/form/form";
import { DomainEvent } from "src/shared/event/domain-listener";

// Errors
import { EntityNotFoundException } from "src/shared/error/domain-errors";

@Injectable()
export class CmsService {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly permitRepository: PermitRepository,
    private readonly i18n: I18nService,
    private readonly cmsRepository: CmsRepository,
    private readonly logger: LoggerService,
  ) {}

  public async pagination({
    query,
    pwhere,
    userSession,
  }: {
    query: FilterParamsDto;
    pwhere?: CMS_WHERE[];
    userSession: User;
  }) {
    const columns = this.cmsRepository.getColumns();
    const form = this.cmsRepository.getFormCreate({});

    const paginate = await this.getPaginate(query, pwhere);
    const actions = await this.getActions(
      userSession?.permits?.list || [],
      { formCreate: form },
      "cms",
    );

    const filters = this.cmsRepository.getFilters(query);

    return {
      pageTitle: "common.cms.index",
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
    const entity = await this.cmsRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new EntityNotFoundException("Contenido Corporativo");
    }

    const actions = await this.getActions(
      userSession?.permits?.list || [],
      { formCreate: undefined },
      "cms",
    );

    return {
      pageTitle: entity.title,
      actions,
      object: entity,
    };
  }

  public async findOneByKey(key: string) {
    const entity = await this.cmsRepository.findOne({
      where: { key },
    });
    if (!entity || entity.deletedAt) {
      throw new EntityNotFoundException(`Contenido Corporativo con clave ${key}`);
    }
    return entity;
  }

  public async create({
    userSession,
    data,
  }: {
    data: CmsCreateDto;
    userSession: User;
  }) {
    const prev = new DomainEvent({
      action: this.cmsRepository.EVENT_CREATED,
      entityName: this.cmsRepository.MODEL_NAME,
      payload: data,
    });
    this.eventEmitter.emit(this.cmsRepository.EVENT_CREATED, prev);

    try {
      const dataCreate: CMS_CREATE = {
        key: data.key,
        title: data.title,
        content: data.content,
        description: data.description,
      };

      const entity = await this.cmsRepository.create({
        data: dataCreate,
      });

      const success = new DomainEvent({
        action: this.cmsRepository.EVENT_CREATED_SUSSCESS,
        entityName: this.cmsRepository.MODEL_NAME,
        payload: data,
      });
      this.eventEmitter.emit(
        this.cmsRepository.EVENT_CREATED_SUSSCESS,
        success,
      );

      return entity;
    } catch (error) {
      const failed = new DomainEvent({
        action: this.cmsRepository.EVENT_CREATED_FAILED,
        entityName: this.cmsRepository.MODEL_NAME,
        payload: data,
        metadata: { error },
      });
      this.eventEmitter.emit(
        this.cmsRepository.EVENT_CREATED_FAILED,
        failed,
      );
      this.logger.logError("Error creando contenido corporativo", error);
      throw error;
    }
  }

  public async update({
    userSession,
    data,
    id,
  }: {
    data: CmsUpdateDto;
    userSession: User;
    id: string;
  }) {
    const prev = new DomainEvent({
      action: this.cmsRepository.EVENT_UPDATED,
      entityName: this.cmsRepository.MODEL_NAME,
      payload: data,
    });
    this.eventEmitter.emit(this.cmsRepository.EVENT_UPDATED, prev);

    try {
      const dataUpdate: CMS_UPDATE = {};
      if (data.title) dataUpdate.title = data.title;
      if (data.content) dataUpdate.content = data.content;
      if (data.description !== undefined) dataUpdate.description = data.description;

      const entity = await this.cmsRepository.update({
        data: dataUpdate,
        where: { id },
      });

      const success = new DomainEvent({
        action: this.cmsRepository.EVENT_UPDATED_SUCCESS,
        entityName: this.cmsRepository.MODEL_NAME,
        payload: data,
      });
      this.eventEmitter.emit(
        this.cmsRepository.EVENT_UPDATED_SUCCESS,
        success,
      );

      return entity;
    } catch (error) {
      const failed = new DomainEvent({
        action: this.cmsRepository.EVENT_UPDATED_FAILED,
        entityName: this.cmsRepository.MODEL_NAME,
        payload: data,
        metadata: { error },
      });
      this.eventEmitter.emit(
        this.cmsRepository.EVENT_UPDATED_FAILED,
        failed,
      );
      this.logger.logError("Error actualizando contenido corporativo", error);
      throw error;
    }
  }

  public async delete({ userSession, id }: { id: string; userSession: User }) {
    const prev = new DomainEvent({
      action: this.cmsRepository.EVENT_DELETED,
      entityName: this.cmsRepository.MODEL_NAME,
      payload: id,
    });
    this.eventEmitter.emit(this.cmsRepository.EVENT_DELETED, prev);

    try {
      const entity = await this.cmsRepository.delete({
        where: { id },
      });

      const success = new DomainEvent({
        action: this.cmsRepository.EVENT_DELETED_SUCCESS,
        entityName: this.cmsRepository.MODEL_NAME,
        payload: id,
      });
      this.eventEmitter.emit(
        this.cmsRepository.EVENT_DELETED_SUCCESS,
        success,
      );

      return entity;
    } catch (error) {
      const failed = new DomainEvent({
        action: this.cmsRepository.EVENT_DELETED_FAILED,
        entityName: this.cmsRepository.MODEL_NAME,
        payload: id,
        metadata: { error },
      });
      this.eventEmitter.emit(
        this.cmsRepository.EVENT_DELETED_FAILED,
        failed,
      );
      this.logger.logError("Error eliminando contenido corporativo", error);
      throw error;
    }
  }

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

    const where: any[] = [];
    if (additionalWhere) additionalWhere.forEach((wh) => where.push(wh));
    where.push({ deletedAt: null });

    if (q) {
      where.push({
        OR: [
          { key: { contains: q, mode: "insensitive" } },
          { title: { contains: q, mode: "insensitive" } },
          { content: { contains: q, mode: "insensitive" } },
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
      this.cmsRepository.findMany({
        where: whereClause,
        skip: Number(skip),
        take: Number(limit),
        orderBy: { [sortBy]: sortOrder },
      }),
      this.cmsRepository.count({ where: whereClause }),
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
      password: null,
    };

    if (permitList.includes(this.permitRepository.CMS_LIST))
      actions.list = {
        label: "common.actions.list",
        icon: "list",
        link: "/dashboard/cms",
        action: "redirect",
      };
    if (permitList.includes(this.permitRepository.CMS_UNIQUE))
      actions.unique = {
        label: "common.actions.unique",
        icon: "list",
        link: "/dashboard/cms/:id",
      };
    if (permitList.includes(this.permitRepository.CMS_CREATED))
      actions.create = {
        form: form.formCreate,
        key: "cms-create-key-modal",
        label: "common.actions.create",
        icon: "plus",
        link: "/cms/form/create",
        action: "modal",
      };
    if (permitList.includes(this.permitRepository.CMS_UPDATE))
      actions.update = {
        form: form.formUpdate,
        key: "cms-update-key-modal",
        label: "common.actions.update",
        icon: "edit",
        link: "/cms/form/update",
        action: "modal",
      };
    if (permitList.includes(this.permitRepository.CMS_DELETE))
      actions.delete = {
        label: "common.actions.delete",
        icon: "trash",
        link: "/cms/:id/delete",
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
