import { Injectable } from "@nestjs/common";
import { Form, FormInputType, FormSection } from "src/shared/types/form/form";
import { FoodItem } from "src/shared/types/schema.types";
import { Column } from "src/shared/types/table/table.type";
import { FilterConfig, FilterField } from "src/shared/types/filter/filter.type";
import { FOOD_BASE_FIELDS } from "./form-field-food"; // Asumiendo que existe

interface FoodFormOptions {
  moreInputs?: FormInputType[];
  categoryOptions?: { label: string; value: string }[];
  object?: FoodItem;
}

export default abstract class FoodModel {
  public readonly MODEL_NAME = "FoodItem";

  // EVENTOS
  public readonly EVENT_CREATED = "FOOD_CREATED";
  public readonly EVENT_CREATED_SUCCESS = "FOOD_CREATED_SUCCESS";
  public readonly EVENT_CREATED_FAILED = "FOOD_CREATED_FAILED";

  public readonly EVENT_UPDATED = "FOOD_UPDATED";
  public readonly EVENT_UPDATED_SUCCESS = "FOOD_UPDATED_SUCCESS";
  public readonly EVENT_UPDATED_FAILED = "FOOD_UPDATED_FAILED";

  public readonly EVENT_DELETED = "FOOD_DELETED";
  public readonly EVENT_DELETED_SUCCESS = "FOOD_DELETED_SUCCESS";
  public readonly EVENT_DELETED_FAILED = "FOOD_DELETED_FAILED";

  /**
   * COLUMNAS PARA _table.hbs
   * El 'field' debe existir en el objeto que retorna el repositorio.
   * Si usas un helper para renderizar objetos anidados (ej: category.name), úsalo aquí.
   */
  getColumns(): Column[] {
    return [
      { field: "name", label: "common.form.food_name" },
      { field: "calories", label: "Kcal" },
      { field: "proteins", label: "Prot" },
      { field: "carbohydrates", label: "Carbs" },
      { field: "fats", label: "Grasas" },
      { field: "currentPrice", label: "Precio" },
      { field: "createdBy.username", label: "Creado por" },
    ];
  }

  /**
   * FILTROS PARA _table-filters.hbs
   */
  getFilters({
    categoryOptions,
    query,
  }: {
    categoryOptions?: any[];
    query?: any;
  }): FilterConfig {
    const fields: FilterField[] = [
      // Input de búsqueda (Caso 1 de tu plantilla)
      {
        type: "search",
        name: "q",
        placeholder: "Buscar alimento...",
        value: query?.q || "",
        width: "flex-grow",
      },
    ];

    // Select de Categorías (Caso 2 de tu plantilla)
    if (categoryOptions && categoryOptions.length > 0) {
      fields.push({
        type: "select",
        name: "categoryId",
        label: "Categoría",
        placeholder: "Todas",
        options: categoryOptions, // { label: 'Frutas', value: 'uuid' }
        value: query?.categoryId || "",
        width: "w-full md:w-48",
      });
    }

    return { action: "/dashboard/foods", fields };
  }

  /**
   * FORMULARIO PARA _actionScreen.hbs (Modal)
   */
  getFormCreate({ moreInputs, categoryOptions }: FoodFormOptions): Form {
    const dataSection: FormSection = {
      title: "common.sections.food_details",
      className: "grid grid-cols-1 md:grid-cols-2 gap-4",
      elements: [
        ...FOOD_BASE_FIELDS(undefined, {
          categoryOptions: categoryOptions || [],
        }),
      ],
    };

    const form: Form = {
      title: "common.food.create_title",
      method: "POST",
      action: `/api/foods/create`,
      submitLabel: "common.actions.create",
      inputs: [dataSection],
    };

    if (moreInputs) form.inputs.push(...moreInputs);
    return form;
  }

  getFormUpdate({
    object,
    moreInputs,
    categoryOptions,
  }: FoodFormOptions): Form {
    // ... (Igual que antes)
    if (!object) throw new Error("Object required");
    const dataSection: FormSection = {
      title: "common.sections.food_details",
      className: "grid grid-cols-1 md:grid-cols-2 gap-4",
      elements: [
        ...FOOD_BASE_FIELDS(object, { categoryOptions: categoryOptions || [] }),
      ],
    };
    return {
      title: "common.food.update_title",
      method: "POST",
      action: `/api/foods/${object.id}/update`,
      submitLabel: "common.actions.update",
      inputs: [dataSection],
    };
  }
}
