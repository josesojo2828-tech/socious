import { Injectable } from "@nestjs/common";
import { Form, FormInputType, FormSection } from "src/shared/types/form/form";
import { Menu } from "src/shared/types/schema.types";
import { Column } from "src/shared/types/table/table.type";
import { FilterConfig, FilterField } from "src/shared/types/filter/filter.type";
import { MENU_BASE_FIELDS } from "./form-field-menu";

interface MenuFormOptions {
  moreInputs?: FormInputType[];
  userId?: string;
  object?: Menu;
}

@Injectable()
export abstract class MenuModel {
  public readonly MODEL_NAME = "Menu";

  // EVENTOS DE DOMINIO
  public readonly EVENT_CREATED = "MENU_CREATED";
  public readonly EVENT_CREATED_SUCCESS = "MENU_CREATED_SUCCESS";
  public readonly EVENT_CREATED_FAILED = "MENU_CREATED_FAILED";

  public readonly EVENT_UPDATED = "MENU_UPDATED";
  public readonly EVENT_UPDATED_SUCCESS = "MENU_UPDATED_SUCCESS";
  public readonly EVENT_UPDATED_FAILED = "MENU_UPDATED_FAILED";

  public readonly EVENT_DELETED = "MENU_DELETED";
  public readonly EVENT_DELETED_SUCCESS = "MENU_DELETED_SUCCESS";
  public readonly EVENT_DELETED_FAILED = "MENU_DELETED_FAILED";

  /**
   * Definición de columnas para la tabla
   */
  getColumns(): Column[] {
    return [
      { field: "imageUrl", label: "common.form.image", formatter: "image" },
      { field: "name", label: "common.form.name" },
      { field: "tags", label: "common.form.tags" },
      { field: "description", label: "common.form.description", formatter: "truncate" },
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

    return { action: "/dashboard/menu", fields };
  }

  /**
   * Formulario de Creación
   */
  getFormCreate({ moreInputs }: MenuFormOptions): Form {
    const dataSection: FormSection = {
      title: "common.sections.basic_info",
      className: "grid grid-cols-1 md:grid-cols-2 gap-4",
      elements: [...MENU_BASE_FIELDS()],
    };

    const form: Form = {
      title: "menu.actions.create_title",
      method: "POST",
      action: `/api/menu/create`,
      submitLabel: "common.actions.create",
      inputs: [dataSection],
    };

    if (moreInputs && moreInputs.length > 0) form.inputs.push(...moreInputs);
    return form;
  }

  /**
   * Formulario de Edición
   */
  getFormUpdate({ object, moreInputs }: MenuFormOptions): Form {
    if (!object) throw new Error("Menu object required for update form");

    const dataSection: FormSection = {
      title: "common.sections.basic_info",
      className: "grid grid-cols-1 md:grid-cols-2 gap-4",
      elements: [...MENU_BASE_FIELDS(object)],
    };

    const form: Form = {
      title: "menu.actions.update_title",
      method: "POST",
      action: `/api/menu/${object.id}/update`,
      submitLabel: "common.actions.update",
      inputs: [dataSection],
    };

    if (moreInputs && moreInputs.length > 0) form.inputs.push(...moreInputs);
    return form;
  }
}
