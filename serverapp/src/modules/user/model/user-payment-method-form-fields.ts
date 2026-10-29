import {
  FormInput,
  FormInputType,
  FormSelect,
} from "src/shared/types/form/form";
import {
  IPaymentMethod,
  IUserPaymentMethod,
} from "src/shared/types/schema.types";

export const USER_PAYMENT_METHOD_BASE_FIELDS = (
  paymentMethod: IUserPaymentMethod | null = null,
  paymentsMethods: IPaymentMethod[] | null = null,
  userId: string,
): FormInput[] => {
  const elements: FormInput[] = [
    {
      value: paymentMethod?.userId ?? userId,
      controlType: "input",
      name: "userId",
      label: "", // No es visible
      type: "hidden",
      required: true,
    },
  ];

  if (paymentMethod) {
    // Si estamos editando, agregamos los campos específicos según el tipo de método de pago
    const savedDetails = (paymentMethod?.details as any)?.dateails || (paymentMethod?.details as any)?.details || {};
    const codeUpper = paymentMethod.paymentMethod?.code?.toUpperCase();

    if (codeUpper === "PAGOMOVIL") {
      elements.push(
        {
          controlType: "input",
          name: "bank",
          label: "form.payment.pago_movil.bank_label",
          placeholder: "form.payment.pago_movil.bank_placeholder",
          required: true,
          type: "text",
          value: savedDetails.bank || "",
          className: "col-span-1 md:col-span-12",
        },
        {
          controlType: "input",
          name: "identity",
          label: "form.payment.pago_movil.identity_label",
          placeholder: "form.payment.pago_movil.identity_placeholder",
          required: true,
          type: "text",
          value: savedDetails.identity || "",
          className: "col-span-1 md:col-span-6",
        },
        {
          controlType: "input",
          name: "phone",
          label: "form.payment.pago_movil.phone_label",
          placeholder: "form.payment.pago_movil.phone_placeholder",
          required: true,
          type: "text",
          value: savedDetails.phone || "",
          className: "col-span-1 md:col-span-6",
        },
      );
    } else if (codeUpper === "PAYPAL") {
      elements.push({
        controlType: "input",
        name: "email",
        label: "form.payment.paypal.email_label",
        placeholder: "form.payment.paypal.email_placeholder",
        required: true,
        type: "email",
        value: savedDetails.email || "",
        className: "col-span-1 md:col-span-12",
      });
    } else if (codeUpper === "BINANCE") {
      elements.push(
        {
          controlType: "input",
          name: "email",
          label: "form.payment.binance.email_label",
          placeholder: "form.payment.binance.email_placeholder",
          required: true,
          type: "email",
          value: savedDetails.email || "",
          className: "col-span-1 md:col-span-6",
        },
        {
          controlType: "input",
          name: "username",
          label: "form.payment.binance.username_label",
          placeholder: "form.payment.binance.username_placeholder",
          required: true,
          type: "text",
          value: savedDetails.username || "",
          className: "col-span-1 md:col-span-6",
        },
      );
    }
  } else {
    // Si estamos creando, agregamos el selector del método de pago y los campos para detalles
    elements.push(
      {
        controlType: "select",
        name: "paymentMethodId",
        label: "form.labels.paymentMethod",
        required: true,
        className: "col-span-1 md:col-span-12",
        type: "select",
        options: paymentsMethods?.map((pm) => ({
          label: pm.name,
          value: pm.id,
        })),
      },
      {
        controlType: "input",
        name: "bank",
        label: "form.payment.pago_movil.bank_label",
        placeholder: "form.payment.pago_movil.bank_placeholder",
        required: false,
        type: "text",
        className: "col-span-1 md:col-span-12",
      },
      {
        controlType: "input",
        name: "identity",
        label: "form.payment.pago_movil.identity_label",
        placeholder: "form.payment.pago_movil.identity_placeholder",
        required: false,
        type: "text",
        className: "col-span-1 md:col-span-6",
      },
      {
        controlType: "input",
        name: "phone",
        label: "form.payment.pago_movil.phone_label",
        placeholder: "form.payment.pago_movil.phone_placeholder",
        required: false,
        type: "text",
        className: "col-span-1 md:col-span-6",
      },
      {
        controlType: "input",
        name: "email",
        label: "form.payment.paypal.email_label",
        placeholder: "form.payment.paypal.email_placeholder",
        required: false,
        type: "email",
        className: "col-span-1 md:col-span-6",
      },
      {
        controlType: "input",
        name: "username",
        label: "form.payment.binance.username_label",
        placeholder: "form.payment.binance.username_placeholder",
        required: false,
        type: "text",
        className: "col-span-1 md:col-span-6",
      },
    );
  }

  return elements;
};
