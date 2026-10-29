import { Injectable } from "@nestjs/common";
import { Form, FormInputType, FormSection } from "src/shared/types/form/form";
import { Column } from "src/shared/types/table/table.type";
import { LAB_RESULT_FIELDS } from "./form-field-lab";
import { LabResult } from "src/shared/types/nutringest/lab-result.interface";

interface LabFormOptions {
  moreInputs?: FormInputType[];
  object?: LabResult;
  patientId?: string;
}

export default abstract class LabResultModel {
  public readonly MODEL_NAME = "LabResult";

  public readonly EVENT_CREATED = "LAB_CREATED";
  public readonly EVENT_CREATED_SUCCESS = "LAB_CREATED_SUCCESS";
  public readonly EVENT_CREATED_FAILED = "LAB_CREATED_FAILED";
  public readonly EVENT_DELETED = "LAB_DELETED";
  public readonly EVENT_DELETED_SUCCESS = "LAB_DELETED_SUCCESS";
  public readonly EVENT_DELETED_FAILED = "LAB_DELETED_FAILED";

  public readonly EVENT_UPDATED = "LAB_UPDATED";
  public readonly EVENT_UPDATED_SUCCESS = "LAB_UPDATED_SUCCESS";
  public readonly EVENT_UPDATED_FAILED = "LAB_UPDATED_FAILED";

  getColumns(): Column[] {
    return [
      { field: "date", label: "Fecha", formatter: "date" },
      { field: "name", label: "Examen" },
      { field: "fileUrl", label: "Archivo", formatter: "link" }, // Asumiendo que tu tabla soporta tipos 'link'
      { field: "createdBy.username", label: "Creado por" },
    ];
  }

  getFormCreate({ moreInputs, patientId }: LabFormOptions): Form {
    const dataSection: FormSection = {
      title: "Subir Examen",
      className: "grid grid-cols-1 gap-4",
      elements: [
        {
          controlType: "input",
          type: "hidden",
          name: "patientId",
          label: "",
          value: patientId,
        } as FormInputType,
        ...LAB_RESULT_FIELDS(),
      ],
    };

    const form: Form = {
      title: "Registrar Resultados",
      method: "POST",
      action: `/api/labs/create/api`,
      submitLabel: "Guardar",
      inputs: [dataSection],
    };

    if (moreInputs) form.inputs.push(...moreInputs);
    return form;
  }
}
