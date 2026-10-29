import { FormInput, FormTextarea, FormSelect } from "../types/form/form";

export const TEXT_FIELDS: FormInput[] = [
  // Nombre/Título
  {
    controlType: "input",
    name: "name",
    label: "form.labels.name",
    type: "text",
    required: true,
    placeholder: "form.placeholders.name",
  },
  {
    controlType: "input",
    name: "title",
    label: "form.labels.title",
    type: "text",
    required: true,
    placeholder: "form.placeholders.title",
  },
  {
    controlType: "input",
    name: "slug",
    label: "form.labels.slug",
    type: "text",
    placeholder: "form.placeholders.slug",
    disabled: true,
  }, // Usualmente autogenerado

  // Contacto y Web
  {
    controlType: "input",
    name: "email",
    label: "form.labels.email",
    type: "email",
    required: true,
    placeholder: "form.placeholders.email",
  },
  {
    controlType: "input",
    name: "phone",
    label: "form.labels.phone",
    type: "tel",
    placeholder: "form.placeholders.phone",
  },
  {
    controlType: "input",
    name: "website",
    label: "form.labels.website",
    type: "url",
    placeholder: "form.placeholders.website",
  },
];

export const NUMERIC_FIELDS: FormInput[] = [
  {
    controlType: "input",
    name: "price",
    label: "form.labels.price",
    type: "number",
    min: 0,
    step: 0.01,
    required: true,
    placeholder: "form.placeholders.price",
  },
  {
    controlType: "input",
    name: "quantity",
    label: "form.labels.quantity",
    type: "number",
    min: 0,
    step: 1,
    required: true,
    placeholder: "form.placeholders.quantity",
  },
];

export const TEXTAREA_FIELDS: FormTextarea[] = [
  {
    controlType: "textarea",
    name: "description",
    label: "form.labels.description",
    rows: 4,
    placeholder: "form.placeholders.description",
  },
  {
    controlType: "textarea",
    name: "notes",
    label: "form.labels.notes",
    rows: 3,
    placeholder: "form.placeholders.notes",
  },
];

// NOTA: Para campos SELECT, las opciones deben ser dinámicas y pasarse en el constructor
export const SELECT_SKELETONS: Partial<FormSelect>[] = [
  {
    controlType: "select",
    name: "status",
    label: "form.labels.status",
    required: true,
    placeholder: "form.placeholders.status",
  },
  {
    controlType: "select",
    name: "category_id",
    label: "form.labels.category",
    required: true,
  },
];

export const DATETIME_FIELDS: FormInput[] = [
  {
    controlType: "input",
    name: "date",
    label: "form.labels.date",
    type: "date",
  },
  {
    controlType: "input",
    name: "start_time",
    label: "form.labels.start_time",
    type: "time",
  },
];
