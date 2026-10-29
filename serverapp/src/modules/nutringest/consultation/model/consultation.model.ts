import { Injectable } from "@nestjs/common";
import { Form, FormInputType, FormSection } from "src/shared/types/form/form";
import { Column } from "src/shared/types/table/table.type";
import { FilterConfig, FilterField } from "src/shared/types/filter/filter.type";
import { Consultation } from "src/shared/types/schema.types";

interface ConsultationFormOptions {
  moreInputs?: FormInputType[];
  patientOptions?: { label: string; value: string }[]; // Para el select de pacientes
  object?: Consultation;
  start?: string;
  end?: string;
}

@Injectable()
export default abstract class ConsultationModel {
  public readonly MODEL_NAME = "Consultation";

  // EVENTOS DE DOMINIO
  public readonly EVENT_CREATED = "CONSULTATION_CREATED";
  public readonly EVENT_CREATED_SUCCESS = "CONSULTATION_CREATED_SUCCESS";
  public readonly EVENT_CREATED_FAILED = "CONSULTATION_CREATED_FAILED";

  public readonly EVENT_UPDATED = "CONSULTATION_UPDATED";
  public readonly EVENT_UPDATED_SUCCESS = "CONSULTATION_UPDATED_SUCCESS";
  public readonly EVENT_UPDATED_FAILED = "CONSULTATION_UPDATED_FAILED";

  public readonly EVENT_DELETED = "CONSULTATION_DELETED"; // Cancelar
  public readonly EVENT_DELETED_SUCCESS = "CONSULTATION_DELETED_SUCCESS";
  public readonly EVENT_DELETED_FAILED = "CONSULTATION_DELETED_FAILED";

  /**
   * COLUMNAS PARA LA TABLA
   */
  getColumns(): Column[] {
    return [
      { field: "scheduledAt", label: "form.labels.date", formatter: "date" },
      {
        field: "patient.firstName",
        label: "dashboard.modals.create_consultation.patient_label",
      },
      {
        field: "type",
        label: "dashboard.modals.create_consultation.type_label",
        formatter: "badge",
      },
      { field: "status", label: "form.labels.status", formatter: "status" },
      {
        field: "reason",
        label: "dashboard.modals.create_consultation.reason_label",
      },
      { field: "createdBy.username", label: "Creado por" },
    ];
  }

  /**
   * FILTROS DE BÚSQUEDA
   */
  getFilters({ query }: { query?: any }): FilterConfig {
    return {
      action: "/dashboard/consultations",
      fields: [
        {
          type: "search",
          name: "q",
          placeholder:
            "dashboard.modals.create_consultation.patient_placeholder",
          value: query?.q || "",
          width: "flex-grow",
        },
        {
          type: "date",
          name: "date",
          label: "form.labels.date",
          value: query?.date || "",
          width: "w-48",
        },
        {
          type: "select",
          name: "status",
          label: "form.labels.status",
          placeholder: "dashboard.modals.assign_exchange.no_results",
          options: [
            {
              label: "dashboard.modals.create_consultation.status.scheduled",
              value: "SCHEDULED",
            },
            {
              label: "dashboard.modals.create_consultation.status.completed",
              value: "COMPLETED",
            },
            {
              label: "dashboard.modals.create_consultation.status.canceled",
              value: "CANCELED",
            },
            {
              label: "dashboard.modals.create_consultation.status.no_show",
              value: "NO_SHOW",
            },
          ],
          value: query?.status || "",
          width: "w-40",
        },
      ],
    };
  }

  /**
   * FORMULARIO DE CREACIÓN (Agendar Cita)
   */
  getFormCreate({
    moreInputs,
    patientOptions,
    start,
  }: ConsultationFormOptions): Form {
    const dateValue = start
      ? new Date(start).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

    const dataSection: FormSection = {
      title: "dashboard.modals.create_consultation.form_sections.data",
      className: "grid grid-cols-1 md:grid-cols-2 gap-4",
      elements: [
        {
          controlType: "select",
          name: "patientId",
          label: "dashboard.modals.create_consultation.patient_label",
          options: patientOptions || [],
          className: "col-span-2",
        },
        {
          controlType: "input",
          name: "scheduledAt",
          label: "dashboard.modals.create_consultation.date_label",
          required: true,
          type: "date",
          className: "",
          value: dateValue,
        },
        {
          controlType: "select",
          name: "type",
          label: "dashboard.modals.create_consultation.type_label",
          required: true,
          options: [
            {
              label: "dashboard.modals.create_consultation.types.first_time",
              value: "FIRST_TIME",
            },
            {
              label: "dashboard.modals.create_consultation.types.follow_up",
              value: "FOLLOW_UP",
            },
            {
              label: "dashboard.modals.create_consultation.types.emergency",
              value: "EMERGENCY",
            },
          ],
          value: "FOLLOW_UP",
          className: "",
        },
        {
          controlType: "textarea",
          name: "reason",
          label: "dashboard.modals.create_consultation.reason_label",
          placeholder:
            "dashboard.modals.create_consultation.reason_placeholder",
          required: false,
          className: "col-span-2",
          rows: 2,
        },
      ],
    };

    const form: Form = {
      title: "dashboard.modals.create_consultation.title",
      method: "POST",
      action: `/api/consultations/create/api`,
      submitLabel: "dashboard.modals.create_consultation.schedule_btn",
      inputs: [dataSection],
    };

    if (moreInputs) form.inputs.push(...moreInputs);
    return form;
  }

  /**
   * FORMULARIO DE EDICIÓN (Detalles de la Cita / Notas)
   */
  getFormUpdate({ object }: ConsultationFormOptions): Form {
    if (!object) throw new Error("Object required for update");

    const detailsSection: FormSection = {
      title: "dashboard.modals.create_consultation.form_sections.data",
      className: "grid grid-cols-1 md:grid-cols-2 gap-4",
      elements: [
        {
          controlType: "input",
          name: "scheduledAt",
          label: "dashboard.modals.create_consultation.date_label",
          required: true,
          type: "date",
          className: "",
          value: object.scheduledAt
            ? new Date(object.scheduledAt).toISOString().split("T")[0]
            : "",
        },
        {
          controlType: "select",
          name: "status",
          label: "Estado Actual",
          required: true,
          value: object.status,
          options: [
            {
              label: "dashboard.modals.create_consultation.status.scheduled",
              value: "SCHEDULED",
            },
            {
              label: "En Curso",
              value: "IN_PROGRESS",
            },
            {
              label: "dashboard.modals.create_consultation.status.completed",
              value: "COMPLETED",
            },
            {
              label: "dashboard.modals.create_consultation.status.canceled",
              value: "CANCELED",
            },
            {
              label: "dashboard.modals.create_consultation.status.no_show",
              value: "NO_SHOW",
            },
          ],
        },
        {
          controlType: "textarea",
          name: "reason",
          label: "dashboard.modals.create_consultation.reason_label",
          placeholder:
            "dashboard.modals.create_consultation.reason_placeholder",
          required: false,
          value: object.reason || "",
          rows: 2,
          className: "col-span-1 md:col-span-2",
        },
        {
          controlType: "textarea",
          name: "notes",
          label: "dashboard.calendar.ficha.notes",
          placeholder: "S: Subjetivo, O: Objetivo, A: Análisis, P: Plan",
          required: false,
          value: object.notes || "",
          rows: 6,
          className: "col-span-1 md:col-span-2",
        },
      ],
    };

    const patientName = object.patient
      ? `${object.patient.firstName || ""} ${object.patient.lastName || ""}`.trim()
      : "";

    return {
      title: patientName ? `Consulta: ${patientName}` : "Editar Consulta",
      method: "POST",
      action: `/api/consultations/${object.id}/update/api`,
      submitLabel: "Guardar Cambios",
      inputs: [detailsSection],
    };
  }
}
