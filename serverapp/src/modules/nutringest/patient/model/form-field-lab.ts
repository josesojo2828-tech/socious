import { FormInputType } from "src/shared/types/form/form";
import { LabResult } from "src/shared/types/nutringest/lab-result.interface";

export const LAB_RESULT_FIELDS = (lab?: LabResult): FormInputType[] => {
  return [
    {
      controlType: "input",
      type: "text",
      name: "name",
      label: "clinical.lab.name", // "Nombre del Examen"
      placeholder: "Ej: Perfil Lipídico, Hemograma...",
      required: true,
      value: lab?.name,
      className: "w-full",
    },
    {
      controlType: "input",
      type: "date",
      name: "date",
      label: "clinical.lab.date", // "Fecha de Toma"
      required: true,
      value: lab?.date
        ? new Date(lab.date).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      className: "w-full md:w-1/2",
    },
    // Campo para subir archivo o URL (dependiendo de cómo manejes files)
    {
      controlType: "input",
      type: "url",
      name: "fileUrl",
      label: "clinical.lab.file_url", // "Enlace al PDF (Opcional)"
      placeholder: "https://...",
      required: false,
      value: lab?.fileUrl || "",
      className: "w-full",
    },
    // Campo JSON para datos estructurados (opcional, avanzado)
    {
      controlType: "textarea",
      name: "dataJson", // Se procesaría en el backend a 'data'
      label: "clinical.lab.data_json",
      placeholder: '{"colesterol": 200, "hdl": 45}',
      rows: 3,
      required: false,
      value: lab?.data ? JSON.stringify(lab.data, null, 2) : "",
      className: "w-full text-xs font-mono",
    },
  ];
};
