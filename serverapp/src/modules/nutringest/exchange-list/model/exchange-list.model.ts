import { Injectable } from "@nestjs/common";
import { Form, FormInputType, FormSection } from "src/shared/types/form/form";
import { ExchangeList } from "src/shared/types/schema.types";
import { Column } from "src/shared/types/table/table.type";
import { FilterConfig, FilterField } from "src/shared/types/filter/filter.type";
import { EXCHANGE_LIST_BASE_FIELDS } from "./form-field-exchange-list";

interface ExchangeListFormOptions {
  moreInputs?: FormInputType[];
  userId?: string;
  object?: ExchangeList;
}

@Injectable()
export abstract class ExchangeListModel {
  public readonly MODEL_NAME = "ExchangeList";

  // EVENTOS DE DOMINIO
  public readonly EVENT_CREATED = "EXCHANGE_LIST_CREATED";
  public readonly EVENT_CREATED_SUCCESS = "EXCHANGE_LIST_CREATED_SUCCESS";
  public readonly EVENT_CREATED_FAILED = "EXCHANGE_LIST_CREATED_FAILED";

  public readonly EVENT_UPDATED = "EXCHANGE_LIST_UPDATED";
  public readonly EVENT_UPDATED_SUCCESS = "EXCHANGE_LIST_UPDATED_SUCCESS";
  public readonly EVENT_UPDATED_FAILED = "EXCHANGE_LIST_UPDATED_FAILED";

  public readonly EVENT_DELETED = "EXCHANGE_LIST_DELETED";
  public readonly EVENT_DELETED_SUCCESS = "EXCHANGE_LIST_DELETED_SUCCESS";
  public readonly EVENT_DELETED_FAILED = "EXCHANGE_LIST_DELETED_FAILED";

  /**
   * Definición de columnas para la tabla
   */
  getColumns(): Column[] {
    return [
      { field: "name", label: "exchange.form.name" },
      { field: "description", label: "exchange.form.description" },
      { field: "baseKcal", label: "kcal" },
      { field: "createdBy.username", label: "Creado por" },
    ];
  }

  /**
   * Configuración de Filtros
   */
  getFilters({ query }: { query?: any }): FilterConfig {
    const fields: FilterField[] = [
      {
        type: "search",
        name: "q",
        placeholder: "common.filters.search",
        value: query?.q || "",
        width: "flex-grow",
      },
    ];

    return { action: "/dashboard/exchange-list", fields };
  }

  /**
   * Formulario de Creación
   */
  getFormCreate({ moreInputs }: ExchangeListFormOptions): Form {
    const dataSection: FormSection = {
      title: "exchange.sections.basic_info",
      gridCols: 1,
      className: "grid grid-cols-1 gap-4",
      elements: [...EXCHANGE_LIST_BASE_FIELDS()],
    };

    const form: Form = {
      title: "exchange.actions.create_title",
      method: "POST",
      action: `/api/exchange-list/create/api`,
      submitLabel: "common.actions.create",
      inputs: [dataSection],
    };

    if (moreInputs && moreInputs.length > 0) form.inputs.push(...moreInputs);
    return form;
  }

  /**
   * Formulario de Edición
   */
  getFormUpdate({ object, moreInputs }: ExchangeListFormOptions): Form {
    if (!object)
      throw new Error("ExchangeList object required for update form");

    const dataSection: FormSection = {
      title: "exchange.sections.basic_info",
      gridCols: 1,
      className: "grid grid-cols-1 gap-4",
      elements: [...EXCHANGE_LIST_BASE_FIELDS(object)],
    };

    const form: Form = {
      title: "exchange.actions.update_title",
      method: "POST",
      action: `/api/exchange-list/${object.id}/update/api`,
      submitLabel: "common.actions.update",
      inputs: [dataSection],
    };

    if (moreInputs && moreInputs.length > 0) form.inputs.push(...moreInputs);
    return form;
  }
}
