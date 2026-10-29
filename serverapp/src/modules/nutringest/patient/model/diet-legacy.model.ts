import { Injectable } from "@nestjs/common";
import { Form, FormInputType, FormSection } from "src/shared/types/form/form";
import { DietPlan } from "src/shared/types/schema.types";
import { Column } from "src/shared/types/table/table.type";
import { DIET_LEGACY_FIELDS } from "./form-field-diet-legacy";

interface LegacyFormOptions {
  object?: DietPlan;
  patientId?: string;
}

export default abstract class DietLegacyModel {
  public readonly MODEL_NAME = "DietPlan";

  // Eventos básicos
  public readonly EVENT_CREATED = "DIET_CREATED";
  public readonly EVENT_CREATED_SUCCESS = "DIET_CREATED_SUCCESS";
  public readonly EVENT_CREATED_FAILED = "DIET_CREATED_FAILED";

  getColumns(): Column[] {
    return [
      { field: "name", label: "Nombre" },
      { field: "startDate", label: "Inicio", formatter: "date" },
      { field: "status", label: "Estado", formatter: "status" },
      { field: "totalKcal", label: "Kcal" },
      { field: "createdBy.username", label: "Creado por" },
    ];
  }

  getFormCreate({ patientId }: LegacyFormOptions): Form {
    const dataSection: FormSection = {
      title: "Nueva Dieta (Legacy)",
      className: "grid grid-cols-1 gap-4",
      elements: [
        {
          controlType: "input",
          type: "hidden",
          name: "patientId",
          label: "",
          value: patientId,
        } as FormInputType,
        ...DIET_LEGACY_FIELDS(),
      ],
    };

    return {
      title: "Crear Dieta Estricta",
      method: "POST",
      action: `/api/create`,
      submitLabel: "Crear",
      inputs: [dataSection],
    };
  }
}
