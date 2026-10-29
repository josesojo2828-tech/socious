import { Injectable } from "@nestjs/common";
import { Form, FormInputType, FormSection } from "src/shared/types/form/form";
import { Column } from "src/shared/types/table/table.type";
import { GOAL_FIELDS } from "./form-field-goal";
import { Goal } from "src/shared/types/nutringest/goal.interface";

interface GoalFormOptions {
  moreInputs?: FormInputType[];
  object?: Goal;
  patientId?: string;
  lastAnthro?: any;
}

export default abstract class GoalModel {
  public readonly MODEL_NAME = "Goal";

  public readonly EVENT_CREATED = "GOAL_CREATED";
  public readonly EVENT_CREATED_SUCCESS = "GOAL_CREATED_SUCCESS";
  public readonly EVENT_CREATED_FAILED = "GOAL_CREATED_FAILED";
  public readonly EVENT_UPDATED = "GOAL_UPDATED";
  public readonly EVENT_UPDATED_SUCCESS = "GOAL_UPDATED_SUCCESS";
  public readonly EVENT_UPDATED_FAILED = "GOAL_UPDATED_FAILED";

  public readonly EVENT_DELETED = "GOAL_DELETED";
  public readonly EVENT_DELETED_SUCCESS = "GOAL_DELETED_SUCCESS";
  public readonly EVENT_DELETED_FAILED = "GOAL_DELETED_FAILED";

  getColumns(): Column[] {
    return [
      { field: "title", label: "Meta" },
      { field: "type", label: "Tipo" },
      { field: "targetValue", label: "Objetivo" },
      { field: "currentValue", label: "Progreso" },
      { field: "deadline", label: "Fecha Límite", formatter: "date" },
      { field: "isAchieved", label: "Estado", formatter: "boolean" },
      { field: "createdBy.username", label: "Creado por" },
    ];
  }

  getFormCreate({ moreInputs, patientId, lastAnthro }: GoalFormOptions): Form {
    const dataSection: FormSection = {
      title: "Nueva Meta",
      className: "grid grid-cols-1 gap-4",
      elements: [
        {
          controlType: "input",
          type: "hidden",
          name: "patientId",
          label: "",
          value: patientId,
        } as FormInputType,
        ...GOAL_FIELDS(undefined, lastAnthro),
      ],
    };

    return {
      title: "form.title.create_goal",
      method: "POST",
      action: `/api/goals/create/api`,
      submitLabel: "form.labels.create_goal_submit",
      inputs: [dataSection],
    };
  }

  getFormUpdate({ object }: GoalFormOptions): Form {
    if (!object) throw new Error("Object required");

    const dataSection: FormSection = {
      title: "form.title.update_goal",
      className: "grid grid-cols-1 gap-4",
      elements: GOAL_FIELDS(object),
    };

    return {
      title: "form.title.update_goal",
      method: "POST",
      action: `/api/goals/${object.id}/update/api`,
      submitLabel: "form.labels.update_goal_submit",
      inputs: [dataSection],
    };
  }
}
