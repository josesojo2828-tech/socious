import { Injectable } from "@nestjs/common";
import { Form, FormInputType, FormElement } from "src/shared/types/form/form";
import { Column } from "src/shared/types/table/table.type";
import { FilterConfig } from "src/shared/types/filter/filter.type";
import { ANTHRO_BASE_FIELDS } from "./form-field-anthropometry";
import { Anthropometry } from "src/shared/types/nutringest/anthropometry.interface";

interface AnthroFormOptions {
  moreInputs?: FormInputType[];
  object?: Anthropometry;
  patientId?: string;
  entity?: Anthropometry;
  gender?: string;
}

export default abstract class AnthropometryModel {
  public readonly MODEL_NAME = "Anthropometry";

  // EVENTOS
  public readonly EVENT_CREATED = "ANTHRO_CREATED";
  public readonly EVENT_CREATED_SUCCESS = "ANTHRO_CREATED_SUCCESS";
  public readonly EVENT_CREATED_FAILED = "ANTHRO_CREATED_FAILED";
  public readonly EVENT_UPDATED = "ANTHRO_UPDATED";
  public readonly EVENT_UPDATED_SUCCESS = "ANTHRO_UPDATED_SUCCESS";
  public readonly EVENT_UPDATED_FAILED = "ANTHRO_UPDATED_FAILED";
  public readonly EVENT_DELETED = "ANTHRO_DELETED";
  public readonly EVENT_DELETED_SUCCESS = "ANTHRO_DELETED_SUCCESS";
  public readonly EVENT_DELETED_FAILED = "ANTHRO_DELETED_FAILED";

  getColumns(): Column[] {
    return [
      { field: "date", label: "Fecha", formatter: "date" },
      { field: "weight", label: "Peso (kg)" },
      { field: "bmi", label: "IMC" },
      { field: "fatPercentage", label: "% Grasa" },
      { field: "muscleMass", label: "Masa Musc." },
      { field: "createdBy.username", label: "Creado por" },
    ];
  }

  getFilters({ query }: { query?: any }): FilterConfig {
    return {
      action: "",
      fields: [],
    };
  }

  getFormCreate({ moreInputs, patientId, entity, gender }: AnthroFormOptions): Form {
    // 1. Campo oculto para el ID del paciente
    const hiddenPatientId: FormInputType = {
      controlType: "input",
      type: "hidden",
      name: "patientId",
      label: "",
      value: patientId,
    } as FormInputType;

    // 1.1 Campo oculto para el Género del paciente
    const hiddenGender: FormInputType = {
      controlType: "input",
      type: "hidden",
      name: "patientGender",
      label: "",
      value: gender || "MALE",
    } as FormInputType;

    // 2. Obtenemos las secciones base (Ya son FormSection[])
    const baseSections = ANTHRO_BASE_FIELDS(entity);

    // 3. Construimos el array de inputs plano
    const inputs: FormElement[] = [hiddenPatientId, hiddenGender, ...baseSections];

    const form: Form = {
      title: "Nueva Antropometría",
      method: "POST",
      action: `/api/anthropometry/create/api`,
      submitLabel: "Guardar Registro",
      inputs: inputs,
    };

    if (moreInputs) form.inputs.push(...moreInputs);
    return form;
  }
}
