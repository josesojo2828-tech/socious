import { FormInput, FormSelect } from "src/shared/types/form/form";
import { IUserPaymentMethod, Transaction } from "src/shared/types/schema.types";

/**
 * Campos Base para el Formulario de Plan de Suscripción (Inputs)
 * Contiene los campos de texto, número y área de texto.
 */
export const TRANSACTION_BASE_FIELDS = (
  plan: Transaction | null = null,
): FormInput[] => {
  return [
    {
      value: plan && plan.amount ? plan.amount : undefined,
      controlType: "input",
      name: "amount",
      label: "form.labels.amount",
      type: "number",
      required: true,
      placeholder: "form.placeholders.amount",
    },
    {
      value: plan && plan.description ? plan.description : undefined,
      controlType: "textarea",
      name: "description",
      label: "form.labels.description",
      type: "text",
      required: false,
      placeholder: "form.placeholders.description",
    },
    {
      value: plan && plan.referenceCode ? plan.referenceCode : undefined,
      controlType: "input",
      name: "referenceCode",
      label: "form.labels.reference_code",
      type: "text",
      required: true,
      placeholder: "form.placeholders.reference_code",
    },
  ];
};

export const TRANSACTION_BASE_FIELDS_STATUS = (
  plan: Transaction | null = null,
): FormInput[] => {
  return [
    {
      value: plan && plan.status ? plan.status : undefined,
      controlType: "select",
      name: "status",
      label: "form.labels.status",
      required: true,
      type: "select",
      options: [
        { label: "form.labels.status_success", value: "SUCCESS" },
        { label: "form.labels.status_pending", value: "PENDING" },
        { label: "form.labels.status_failed", value: "FAILED" },
        { label: "form.labels.status_canceled", value: "CANCELED" },
      ],
    },
  ];
};

export const TRANSACTION_BASE_FIELDS_SELECT = (
  method: IUserPaymentMethod[],
): FormSelect[] => {
  return [
    {
      controlType: "select",
      placeholder: "form.placeholders.payment_method",
      name: "paymentMethodId",
      label: "form.labels.payment_method",
      required: true,
      options: method.map((mt) => ({
        label: `${mt.paymentMethod?.name}`,
        value: `${mt.id}`,
      })),
    },
  ];
};
