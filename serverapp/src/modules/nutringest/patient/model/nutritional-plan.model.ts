import { Injectable } from "@nestjs/common";
import { Form, FormInputType, FormElement } from "src/shared/types/form/form";
import { Column } from "src/shared/types/table/table.type";
import { FilterConfig } from "src/shared/types/filter/filter.type";
import { NUTRITIONAL_PLAN_BASE_FIELDS } from "./form-field-plan";
import {
  NutritionalPlan,
  PlanStatus,
} from "src/shared/types/nutringest/nutritional-plan.interface";

interface PlanFormOptions {
  moreInputs?: FormInputType[];
  object?: NutritionalPlan;
  patientId?: string;
}

export default abstract class NutritionalPlanModel {
  public readonly MODEL_NAME = "NutritionalPlan";

  public readonly EVENT_CREATED = "PLAN_CREATED";
  public readonly EVENT_CREATED_SUCCESS = "PLAN_CREATED_SUCCESS";
  public readonly EVENT_CREATED_FAILED = "PLAN_CREATED_FAILED";
  public readonly EVENT_UPDATED = "PLAN_UPDATED";
  public readonly EVENT_UPDATED_SUCCESS = "PLAN_UPDATED_SUCCESS";
  public readonly EVENT_UPDATED_FAILED = "PLAN_UPDATED_FAILED";

  public readonly EVENT_DELETED = "PLAN_DELETED";
  public readonly EVENT_DELETED_SUCCESS = "PLAN_DELETED_SUCCESS";
  public readonly EVENT_DELETED_FAILED = "PLAN_DELETED_FAILED";

  getColumns(): Column[] {
    return [
      { field: "name", label: "Nombre del Plan" },
      { field: "startDate", label: "Inicio", formatter: "date" },
      { field: "status", label: "Estado", formatter: "status" },
      { field: "kcalTarget", label: "Kcal Meta" },
      { field: "createdBy.username", label: "Creado por" },
    ];
  }

  getFilters({ query }: { query?: any }): FilterConfig {
    return {
      action: "",
      fields: [
        {
          type: "search",
          name: "q",
          placeholder: "Buscar plan...",
          value: query?.q || "",
          width: "flex-grow",
        },
        {
          type: "select",
          name: "status",
          label: "Estado",
          placeholder: "Todos",
          value: query?.status || "",
          options: [
            { label: "Activo", value: PlanStatus.ACTIVE },
            { label: "Borrador", value: PlanStatus.DRAFT },
            { label: "Archivado", value: PlanStatus.ARCHIVED },
          ],
        },
      ],
    };
  }

  getFormCreate({ moreInputs, patientId }: PlanFormOptions): Form {
    // Campo oculto
    const hiddenPatientId: FormInputType = {
      controlType: "input",
      type: "hidden",
      name: "patientId",
      label: "",
      value: patientId,
    } as FormInputType;

    // No envolvemos en DataSection porque ya trae secciones
    const inputs: FormElement[] = [
      hiddenPatientId,
      ...NUTRITIONAL_PLAN_BASE_FIELDS(),
    ];

    const form: Form = {
      title: "Crear Nuevo Plan",
      method: "POST",
      action: `/api/plans/create`,
      submitLabel: "Crear e Ir al Editor",
      inputs: inputs,
    };

    if (moreInputs) form.inputs.push(...moreInputs);
    return form;
  }

  getFormUpdate({ object }: PlanFormOptions): Form {
    if (!object) throw new Error("Object required");

    // Al actualizar, pasamos el objeto para pre-llenar
    // y usamos las secciones directamente
    const inputs: FormElement[] = [...NUTRITIONAL_PLAN_BASE_FIELDS(object)];

    return {
      title: `Editar Plan: ${object.name}`,
      method: "POST",
      action: `/api/plans/${object.id}/update`,
      submitLabel: "Guardar Cambios",
      inputs: inputs,
    };
  }
}
