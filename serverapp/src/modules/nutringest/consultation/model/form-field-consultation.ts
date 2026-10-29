import { Consultation } from "@prisma/client";
import {
  FormInput,
  FormSelect,
  FormTextarea,
  FormElement,
} from "src/shared/types/form/form";
import {
  CONSULTATION_STATUS_OPTIONS,
  CONSULTATION_TYPE_OPTIONS,
  ConsultationType,
} from "src/shared/types/schema.types";

// Opciones dinámicas que vienen del controlador/servicio
interface ConsultationFormOptions {
  patientOptions: { label: string; value: string }[];
}

/**
 * Genera la estructura de campos para el formulario de Consultas.
 * Se usa tanto para Crear como para Actualizar.
 */
export const CONSULTATION_BASE_FIELDS = (
  consultation?: Consultation,
  options?: ConsultationFormOptions,
): FormElement[] => {
  // --- CAMPOS COMUNES (Create & Update) ---
  const fields: (FormInput | FormSelect | FormTextarea)[] = [
    {
      controlType: "select",
      name: "patientId",
      label: "Paciente",
      // required: true,
      // Si estamos editando, usualmente no cambiamos el paciente, así que disabled
      disabled: !!consultation,
      value: consultation?.patientId || "",
      options: options?.patientOptions || [],
      className: "col-span-1 md:col-span-2", // Ocupa todo el ancho
      placeholder: "Seleccione un paciente...",
    },
    {
      controlType: "input", // Usamos input type datetime-local
      type: "date", // O 'datetime-local' si tu frontend lo soporta
      name: "scheduledAt",
      label: "Fecha y Hora",
      required: true,
      // Formatear fecha para el input si existe
      value: consultation?.scheduledAt
        ? new Date(consultation.scheduledAt).toISOString().slice(0, 16)
        : "",
      className: "",
    },
    {
      controlType: "select",
      name: "type",
      label: "Tipo de Consulta",
      required: true,
      options: CONSULTATION_TYPE_OPTIONS,
      value: consultation?.type || ConsultationType.FOLLOW_UP,
      className: "",
    },
    {
      controlType: "textarea",
      name: "reason",
      label: "Motivo de Consulta",
      placeholder: "Ej: Revisión de exámenes, dolor abdominal...",
      required: false,
      rows: 2,
      value: consultation?.reason || "",
      className: "col-span-1 md:col-span-2",
    },
  ];

  // --- CAMPOS SOLO PARA EDICIÓN (Update) ---
  if (consultation) {
    fields.push(
      {
        controlType: "select",
        name: "status",
        label: "Estado Actual",
        required: true,
        options: CONSULTATION_STATUS_OPTIONS,
        value: consultation.status,
        className: "",
      },
      {
        controlType: "textarea",
        name: "notes",
        label: "Notas Clínicas (SOAP)",
        placeholder: "S: Subjetivo\nO: Objetivo\nA: Análisis\nP: Plan",
        required: false,
        rows: 6,
        value: consultation.notes || "",
        className: "col-span-1 md:col-span-2",
      },
    );
  }

  return fields;
};
