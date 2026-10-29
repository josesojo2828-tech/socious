import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import ExchangeListRepository from "../repository/food-exchange.repository";
import { I18nService } from "src/shared/lang/i18n.service";
import { LoggerService } from "src/shared/logger/logger.service";
import {
  ICreateExchangeListDto,
  EXCHANGE_LIST_CREATE,
  EXCHANGE_LIST_UPDATE,
} from "../dto/food-exchange.type";
import { User } from "src/shared/types/schema.types";
import { FilterParamsDto } from "src/shared/types/server.type";
import { Actions } from "src/shared/types/dashboard.type";
import { Form, FormSection } from "src/shared/types/form/form";
import { EntityNotFoundException } from "src/shared/error/domain-errors";
import PermitReporitory from "src/modules/permit/repository/permit.repository";
import { normalizeSearchText } from "src/shared/helpers/search-text.util";

@Injectable()
export class ExchangeListService {
  constructor(
    private readonly repository: ExchangeListRepository,
    private readonly i18n: I18nService,
    private readonly logger: LoggerService,
    private readonly permitRepository: PermitReporitory,
  ) { }

  public async create({
    userSession,
    data,
  }: {
    data: ICreateExchangeListDto;
    userSession: User;
  }) {
    // Aquí podrías validar si el usuario tiene permiso de crear listas globales o privadas
    // Como el modelo FoodExchangeList no tiene 'userId' (es global), asumimos que todos ven todo
    // o que solo admins crean.

    const dataCreate: EXCHANGE_LIST_CREATE = {
      name: data.name,
      category: data.category,
      sub: data.sub,
      unity: data.unity,
      calories: data.calories ? Number(data.calories) : 0,
      searchText: normalizeSearchText(data.name, data.category, data.sub),
    };

    return await this.repository.create({ data: dataCreate });
  }

  public async update({
    userSession,
    data,
    id,
  }: {
    data: Partial<ICreateExchangeListDto>;
    userSession: User;
    id: string;
  }) {
    const dataUpdate: EXCHANGE_LIST_UPDATE = {};
    if (data.name) dataUpdate.name = data.name;
    if (data.category) dataUpdate.category = data.category;
    if (data.sub) dataUpdate.sub = data.sub;
    if (data.unity) dataUpdate.unity = data.unity;
    if (data.calories) dataUpdate.calories = Number(data.calories);

    // The folded search text spans name + category + sub, so an update that
    // carries only one of them has to be recomputed over the stored row —
    // otherwise the parts that were not resent get dropped from the search.
    const touchesText =
      Boolean(data.name) || Boolean(data.category) || Boolean(data.sub);
    if (touchesText) {
      const current = await this.repository.findOne({ where: { id } });
      if (current) {
        dataUpdate.searchText = normalizeSearchText(
          data.name || current.name,
          data.category || current.category,
          data.sub || current.sub,
        );
      }
    }

    return await this.repository.update({ where: { id }, data: dataUpdate });
  }

  public async delete({ id }: { id: string }) {
    return await this.repository.delete({ where: { id } });
  }

  // --- UI & DATA ---

  public async pagination({
    query,
    userSession,
  }: {
    query: FilterParamsDto;
    userSession: User;
  }) {
    const columns = this.repository.getColumns();
    const form = this.repository.getFormCreate();

    const { q, category, sub } = query;
    const limit = query.limit ? Number(query.limit) : 10;
    const page = query.page ? Number(query.page) : 1;

    // FoodExchangeList no tiene 'createdAt', usamos 'name' por defecto si viene el default de FilterParamsDto
    const sortByInput = query.sortBy || "name";
    const sortBy = ["name", "category", "sub", "unity", "calories"].includes(sortByInput)
      ? sortByInput
      : "name";
    const sortOrder = query.sortOrder || "asc";

    const where: any = {};

    // Free-text search runs against the folded `searchText` column, which holds
    // name + category + sub without accents. The raw category/sub columns stay
    // as their own exact filters because they are fed from the same data by the
    // UI selects, not typed by hand.
    if (q) {
      where.searchText = {
        contains: normalizeSearchText(q),
        mode: "insensitive",
      };
    }

    if (category) {
      where.category = { contains: category, mode: "insensitive" };
    }

    if (sub) {
      where.sub = { contains: sub, mode: "insensitive" };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [list, total, categories] = await Promise.all([
      this.repository.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { [sortBy]: sortOrder },
      }),
      this.repository.count({ where }),
      this.repository.findDistinctCategories(),
    ]);

    const totalPages = Math.ceil(total / Number(limit));

    const actions = await this.getActions(userSession.permits?.list || [], {
      formCreate: form,
    });
    const filters = this.repository.getFilters({ query });

    return {
      pageTitle: "exchange.actions.food_list_title",
      form,
      actions,
      filters,
      list,
      // Categorías reales de la tabla, para alimentar el selector de filtros.
      categories,
      total,
      totalRecords: total,
      totalPages,
      currentPage: Number(page),
      limit: Number(limit),
      hasPrev: page > 1,
      hasNext: page < totalPages,
      columns,
      sortParams: { sortBy, sortOrder },
      currentQuery: query,
    };
  }

  public async unique({ id }: { id: string }) {
    const entity = await this.repository.findOne({ where: { id } });
    if (!entity) throw new EntityNotFoundException("Lista de Intercambio");

    const formUpdate = this.repository.getFormUpdate({ object: entity as any });

    return {
      pageTitle: entity.name,
      object: entity,
      form: formUpdate,
    };
  }

  async getActions(permitList: string[], form: { formCreate?: Form }) {
    const actions: Actions = {
      create: null,
      update: null,
      list: null,
      unique: null,
      delete: null,
    };

    if (permitList.includes(this.permitRepository.EXCHANGE_LIST_LIST)) {
      actions.list = {
        label: "Volver",
        icon: "list",
        link: "/dashboard/exchange-food",
        action: "redirect",
      };
    }

    if (permitList.includes(this.permitRepository.EXCHANGE_LIST_UNIQUE)) {
      actions.unique = {
        label: "common.actions.unique",
        icon: "list",
        link: "/dashboard/exchange-food/:id",
        action: "redirect",
      };
    }

    if (permitList.includes(this.permitRepository.EXCHANGE_LIST_CREATED)) {
      actions.create = {
        form: form.formCreate,
        key: "exchange-create-modal",
        label: "common.actions.create",
        icon: "plus",
        link: "/exchange-lists/create",
        action: "modal",
      };
    }

    if (permitList.includes(this.permitRepository.EXCHANGE_LIST_UPDATE)) {
      actions.update = {
        key: "exchange-update-modal",
        label: "common.actions.edit",
        icon: "edit",
        link: "/exchange-lists/update",
        action: "modal",
      };
    }

    if (permitList.includes(this.permitRepository.EXCHANGE_LIST_DELETE)) {
      actions.delete = {
        label: "common.actions.delete",
        icon: "trash",
        link: "/exchange-lists/:id/delete",
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
