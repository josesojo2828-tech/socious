import { Injectable } from "@nestjs/common";
import { Form, FormInputType, FormSection } from "src/shared/types/form/form";
import { ShoppingList } from "src/shared/types/schema.types";
import { Column } from "src/shared/types/table/table.type";
import { SHOPPING_LIST_FIELDS } from "./form-field-shopping";

interface ShoppingFormOptions {
  object?: ShoppingList;
  patientId?: string;
}

export default abstract class ShoppingListModel {
  public readonly MODEL_NAME = "ShoppingList";
  public readonly EVENT_CREATED = "SHOPPING_CREATED";
  public readonly EVENT_CREATED_SUCCESS = "SHOPPING_CREATED_SUCCESS";
  public readonly EVENT_CREATED_FAILED = "SHOPPING_CREATED_FAILED";

  getColumns(): Column[] {
    return [
      { field: "name", label: "Lista" },
      { field: "createdAt", label: "Generada", formatter: "date" },
      { field: "createdBy.username", label: "Creado por" },
    ];
  }

  getFormCreate({ patientId }: ShoppingFormOptions): Form {
    const dataSection: FormSection = {
      title: "Generar Lista",
      className: "grid grid-cols-1 gap-4",
      elements: [
        {
          controlType: "input",
          type: "hidden",
          name: "patientId",
          label: "",
          value: patientId,
        } as FormInputType,
        ...SHOPPING_LIST_FIELDS(),
      ],
    };

    return {
      title: "Nueva Lista de Compras",
      method: "POST",
      action: `/api/shopping/create`,
      submitLabel: "Guardar",
      inputs: [dataSection],
    };
  }
}
