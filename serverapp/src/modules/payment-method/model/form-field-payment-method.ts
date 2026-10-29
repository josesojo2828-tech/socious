import { FormInput, FormInputType } from "src/shared/types/form/form";
import {
  IPaymentMethod,
} from "src/shared/types/schema.types";

const withHash = (v: string | undefined) =>
  v ? (v.startsWith("#") ? v : `#${v}`) : undefined;

/**
 * Campos Base para el Formulario de Métodos de Pago del Sistema
 */
export const PAYMENT_METHOD_BASE_FIELDS = (
  plan: IPaymentMethod | null = null,
): FormInputType[] => {
  return [
    {
      value: plan?.name || undefined,
      controlType: "input",
      name: "name",
      label: "form.labels.name",
      type: "text",
      required: true,
      placeholder: "form.placeholders.plan_name",
    },
    {
      value: plan?.code || undefined,
      controlType: "input",
      name: "code",
      label: "form.labels.code",
      type: "text",
      required: true,
      placeholder: "form.placeholders.code",
    },
    {
      value: plan?.imagePath || undefined,
      controlType: "input",
      name: "imagePath",
      label: "form.labels.imagePath",
      type: "text",
      required: true,
      placeholder: "form.placeholders.imagePath",
    },
    {
      value: withHash(plan?.colorStart),
      controlType: "input",
      name: "colorStart",
      label: "form.labels.colorStart",
      type: "color",
      required: true,
    },
    {
      value: withHash(plan?.colorEnd),
      controlType: "input",
      name: "colorEnd",
      label: "form.labels.colorEnd",
      type: "color",
      required: true,
    },
    {
      value: withHash(plan?.colorText),
      controlType: "input",
      name: "colorText",
      label: "form.labels.colorText",
      type: "color",
      required: true,
    },
  ];
};
