import { Injectable } from "@nestjs/common";
import { Form, FormSection } from "src/shared/types/form/form";
import { Column } from "src/shared/types/table/table.type";
import { FilterConfig, FilterField } from "src/shared/types/filter/filter.type";
import { EXCHANGE_LIST_BASE_FIELDS } from "./form-field-food-exchange";
import { FoodExchangeList } from "src/shared/types/schema.types";

@Injectable()
export default abstract class ExchangeListModel {
  public readonly MODEL_NAME = "FoodExchangeList";

  public readonly EVENT_CREATED = "EXCHANGE_LIST_CREATED";
  public readonly EVENT_CREATED_SUCCESS = "EXCHANGE_LIST_CREATED_SUCCESS";
  public readonly EVENT_CREATED_FAILED = "EXCHANGE_LIST_CREATED_FAILED";

  public readonly EVENT_UPDATED = "EXCHANGE_LIST_UPDATED";
  public readonly EVENT_UPDATED_SUCCESS = "EXCHANGE_LIST_UPDATED_SUCCESS";
  public readonly EVENT_UPDATED_FAILED = "EXCHANGE_LIST_UPDATED_FAILED";

  public readonly EVENT_DELETED = "EXCHANGE_LIST_DELETED";
  public readonly EVENT_DELETED_SUCCESS = "EXCHANGE_LIST_DELETED_SUCCESS";
  public readonly EVENT_DELETED_FAILED = "EXCHANGE_LIST_DELETED_FAILED";

  getColumns(): Column[] {
    return [
      { field: "name", label: "common.form.name" },
      { field: "category", label: "common.form.category" },
      { field: "sub", label: "common.form.sub_category" },
      { field: "unity", label: "Unidad" },
    ];
  }

  getFilters({ query }: { query?: any }): FilterConfig {
    const fields: FilterField[] = [
      {
        type: "search",
        name: "q",
        placeholder: "Buscar lista...",
        value: query?.q || "",
        width: "flex-grow",
      },
      {
        type: "select",
        name: "category",
        label: "Categoría",
        placeholder: "Todas las categorías",
        value: query?.category || "",
        options: [
          { label: "Todas", value: "" },
          { label: "Leche y Sustitutos", value: "LECHE Y SUSTITUTOS" },
          { label: "Hortalizas y Vegetales", value: "HORTALIZAS Y VEGETALES" },
          { label: "Frutas", value: "FRUTAS" },
          { label: "Almidones, Cereales y Panes", value: "ALMIDONES, CEREALES Y PANES" },
          { label: "Carnes o Sustitutos", value: "CARNES O SUSTITUTOS" },
          { label: "Grasas", value: "GRASAS" },
        ],
      },
    ];
    return { action: "/dashboard/exchange-food", fields };
  }

  getFormCreate(): Form {
    const dataSection: FormSection = {
      title: "common.sections.general_info",
      className: "grid grid-cols-1 md:grid-cols-3 gap-4",
      elements: [...EXCHANGE_LIST_BASE_FIELDS()],
    };

    return {
      title: "Crear Lista de Intercambio",
      method: "POST",
      action: `/api/exchange-food/create`,
      submitLabel: "common.actions.create",
      inputs: [dataSection],
    };
  }

  getFormUpdate({ object }: { object: FoodExchangeList }): Form {
    const dataSection: FormSection = {
      title: "common.sections.general_info",
      className: "grid grid-cols-1 md:grid-cols-3 gap-4",
      elements: [...EXCHANGE_LIST_BASE_FIELDS(object)],
    };

    return {
      title: "Editar Lista de Intercambio",
      method: "POST",
      action: `/api/exchange-food/${object.id}/update`,
      submitLabel: "common.actions.update",
      inputs: [dataSection],
    };
  }
}
