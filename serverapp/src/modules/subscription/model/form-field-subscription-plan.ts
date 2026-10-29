import { FormInput, FormSelect } from "src/shared/types/form/form";
import { SubscriptionPlan } from "src/shared/types/schema.types";

/**
 * Campos Base para el Formulario de Plan de Suscripción (Inputs)
 * Contiene los campos de texto, número y área de texto.
 */
export const SUBSCRIPTION_PLAN_BASE_FIELDS = (
  plan: SubscriptionPlan | null = null,
): FormInput[] => {
  return [
    {
      value: plan && plan.name ? plan.name : undefined,
      controlType: "input",
      name: "name",
      label: "form.labels.plan_name", // Deberás crear esta clave i18n
      type: "text",
      required: true,
      placeholder: "form.labels.plan_name",
    },
    {
      value: plan && plan.description ? plan.description : undefined,
      // Usamos 'textarea' ya que es más apropiado para una descripción
      controlType: "textarea",
      name: "description",
      label: "form.labels.plan_description",
      type: "text", // 'type' puede ser irrelevante para textarea, pero mantengo la estructura
      required: false, // Es opcional en tu schema (String?)
      placeholder: "form.labels.plan_description",
    },
    {
      // Los inputs de formulario manejan strings.
      // Convertimos el valor Decimal a string si existe.
      value: plan && plan.price ? plan.price.toString() : undefined,
      controlType: "input",
      name: "price",
      label: "form.labels.price",
      type: "number", // 'number' para validación de navegador
      required: true,
      placeholder: "form.labels.price", // Ej: "9.99"
    },
  ];
};

export const SUBSCRIPTION_PLAN_ADD_CONTENT = (
  plan: SubscriptionPlan | null = null,
): FormInput[] => {
  return [
    {
      controlType: "input",
      name: "content",
      label: "form.labels.content",
      type: "text",
      required: true,
      placeholder: "form.labels.content",
    },
  ];
};

/**
 * Campos de Selección Dinámica para el Plan de Suscripción (Selects)
 * Contiene campos que se poblarán con opciones (ej. una lista de monedas).
 */
export const SUBSCRIPTION_PLAN_DYNAMIC_SELECTS = (
  plan: SubscriptionPlan | null = null,
): Partial<FormSelect>[] => {
  return [
    {
      controlType: "select",
      name: "currency",
      label: "form.labels.currency",
      required: true,
      options: [
        { label: "USD (Dólares)", value: "USD" },
        { label: "VES (Bolívares)", value: "VES" },
      ],
    },
  ];
};
