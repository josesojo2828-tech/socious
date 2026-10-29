import { Form, FormInputType, FormSection } from "src/shared/types/form/form";
import { PAYMENT_METHOD_BASE_FIELDS } from "./form-field-payment-method";
import {
  IPaymentMethod,
  SubscriptionPlan,
} from "src/shared/types/schema.types";
import { Column } from "src/shared/types/table/table.type";
import {
  FilterConfig,
  FilterField,
  PaymentMethodFilterOptions,
} from "src/shared/types/filter/filter.type";

interface UserFormOptions {
  moreInputs?: FormInputType[];
  userId?: string;
}

export default class PaymentMethodModel {
  constructor() {}

  public MODEL_NAME = "Subscription";

  // STATUS
  public readonly STATUS_ACTIVE = "ACTIVE";
  public readonly STATUS_SUSPENDED = "SUSPENDED";
  public readonly STATUS_DELETED = "DELETED";

  // EVENTS CREATED
  public readonly EVENT_CREATED = "PAYMENT_METHOD_CREATED";
  public readonly EVENT_CREATED_SUSSCESS = "PAYMENT_METHOD_CREATED_SUSSCESS";
  public readonly EVENT_CREATED_FAILED = "PAYMENT_METHOD_CREATED_FAILED";

  // EVENTS CREATED_NEXT
  public readonly EVENT_CREATED_NEXT = "PAYMENT_METHOD_CREATED_NEXT";
  public readonly EVENT_CREATED_NEXT_SUSSCESS =
    "PAYMENT_METHOD_CREATED_NEXT_SUSSCESS";
  public readonly EVENT_CREATED_NEXT_FAILED =
    "PAYMENT_METHOD_CREATED_NEXT_FAILED";

  // EVENTS UPDATED
  public readonly EVENT_UPDATED = "PAYMENT_METHOD_UPDATED";
  public readonly EVENT_UPDATED_SUCCESS = "PAYMENT_METHOD_UPDATED_SUCCESS";
  public readonly EVENT_UPDATED_FAILED = "PAYMENT_METHOD_UPDATED_FAILED";

  // EVENTS DELETED
  public readonly EVENT_DELETED = "PAYMENT_METHOD_DELETED";
  public readonly EVENT_DELETED_SUCCESS = "PAYMENT_METHOD_DELETED_SUCCESS";
  public readonly EVENT_DELETED_FAILED = "PAYMENT_METHOD_DELETED_FAILED";

  // SUBSCIRPTION EVENTS
  public readonly EVENT_PAYMENT_METHOD_START = "PAYMENT_METHOD_START";
  public readonly EVENT_PAYMENT_METHOD_ERROR = "PAYMENT_METHOD_ERROR";

  public readonly EVENT_SUBCRIPTION_RELOAD_SUCCESS =
    "PAYMENT_METHOD_RELOAD_SUCCESS";
  public readonly EVENT_SUBCRIPTION_RELOAD_FAILED =
    "PAYMENT_METHOD_RELOAD_FAILED";

  public readonly EVENT_NOTIFICATION_SEND_SUCCESS =
    "PAYMENT_METHOD_NOTIFICATION_SEND_SUCCESS";
  public readonly EVENT_NOTIFICATION_SEND_FAILED =
    "PAYMENT_METHOD_NOTIFICATION_SEND_FAILED";

  public readonly EVENT_RENOVATION_SEND_SUCCESS =
    "PAYMENT_METHOD_NOT_RENOVATION_SEND_SUCCESS";
  public readonly EVENT_RENOVATION_SEND_FAILED =
    "PAYMENT_METHOD_NOT_RENOVATION_SEND_FAILED";

  // EVENTS STATUS
  public readonly EVENT_STATUS_SUSPEND = "PAYMENT_METHOD_SUSPEND";
  public readonly EVENT_STATUS_UNSUSPEND = "PAYMENT_METHOD_UNSUSPEND";

  getFilters({
    statusOptions,
    query,
  }: PaymentMethodFilterOptions): FilterConfig {
    const fields: FilterField[] = [
      {
        type: "search",
        name: "q",
        placeholder: "Buscar método por nombre o código...",
        value: query?.q || "",
        width: "flex-grow",
      },
    ];

    if (statusOptions) {
      fields.push({
        type: "select",
        name: "active", // Coincide con el campo boolean en DB (enviado como string)
        label: "Estado",
        placeholder: "Todos",
        options: statusOptions,
        value: query?.active || "",
        width: "w-40",
      });
    }

    return { action: "/dashboard/payment-methods", fields };
  }

  getFormCreate({ moreInputs, userId }: UserFormOptions): Form {
    const dataSection: FormSection = {
      title: "form.section.control",
      className: "grid grid-cols-1 md:grid-cols-2 gap-4",
      elements: [...PAYMENT_METHOD_BASE_FIELDS()],
    };

    const form: Form = {
      title: "form.title.create_user",
      method: "POST",
      action: `/api/payment-methods/create`,
      submitLabel: "common.button.create",
      inputs: [dataSection],
    };

    if (moreInputs && moreInputs.length > 0) {
      form.inputs.push(...moreInputs);
    }

    return form;
  }

  getFormUpdate({
    object,
    moreInputs,
    userId,
  }: UserFormOptions & { object: IPaymentMethod }): Form {
    const dataSection: FormSection = {
      title: "form.section.control",
      className: "grid grid-cols-1 md:grid-cols-2 gap-4",
      elements: [...PAYMENT_METHOD_BASE_FIELDS(object)],
    };

    const form: Form = {
      title: "form.title.create_user",
      method: "POST",
      action: `/api/payment-methods/${userId}/update`,
      submitLabel: "common.button.create",
      inputs: [dataSection],
    };

    if (moreInputs && moreInputs.length > 0) form.inputs.push(...moreInputs);
    return form;
  }

  getColumns(): Column[] {
    return [
      { field: "name", label: "common.subscription.plan" },
      { field: "code", label: "common.subscription.code" },
      // { field: 'description', label: 'common.subscription.description' },
      // { field: 'currency', label: 'form.labels.currency' },
      // { field: '_count.subscriptions', label: 'form.labels.subscriptions' },
    ];
  }
}
