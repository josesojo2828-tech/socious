import { FormInput, FormSelect } from "src/shared/types/form/form";
import { Subscription, SubscriptionPlan } from "src/shared/types/schema.types";

/**
 * Campos Base para el Formulario de Suscripción (Inputs)
 * Contiene los campos de fecha y booleanos.
 */
export const SUBSCRIPTION_BASE_FIELDS = (
  plans: SubscriptionPlan[],
): FormInput[] => {
  return [
    {
      type: "select",
      controlType: "select",
      name: "planId",
      label: "form.labels.subscription_plan",
      required: true,
      options: plans.map((plan) => ({ label: plan.name, value: plan.id })),
    },
    {
      controlType: "checkbox",
      name: "autoRenew",
      label: "form.labels.auto_renew",
      type: "checkbox",
      required: false,
    },
  ];
};
