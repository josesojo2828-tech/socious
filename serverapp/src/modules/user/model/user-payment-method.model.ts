import { Form, FormInputType, FormSection } from "src/shared/types/form/form";
import { Column } from "src/shared/types/table/table.type";
import { USER_PAYMENT_METHOD_BASE_FIELDS } from "./user-payment-method-form-fields";
import {
  IPaymentMethod,
  IUserPaymentMethod,
} from "src/shared/types/schema.types";
import {
  FilterConfig,
  FilterField,
  UserPaymentMethodFilterOptions,
} from "src/shared/types/filter/filter.type";

interface UserFormOptions {
  moreInputs?: FormInputType[];
  userId?: string;
  paymentsMethods?: IPaymentMethod[];
}

export default class UserPaymentMethodModel {
  constructor() {}

  public MODEL_NAME = "UserPaymentMethod";

  // USER STATUS
  public readonly STATUS_ACTIVE = "ACTIVE";
  public readonly STATUS_SUSPENDED = "SUSPENDED";
  public readonly STATUS_DELETED = "DELETED";

  // USER EVENTS CREATED
  public readonly EVENT_CREATED = "USER_PAYMENT_METHOD_CREATED";
  public readonly EVENT_CREATED_SUSSCESS =
    "USER_PAYMENT_METHOD_CREATED_SUSSCESS";
  public readonly EVENT_CREATED_FAILED = "USER_PAYMENT_METHOD_CREATED_FAILED";

  // USER_PAYMENT_METHOD EVENTS UPDATED
  public readonly EVENT_UPDATED = "USER_PAYMENT_METHOD_UPDATED";
  public readonly EVENT_UPDATED_SUCCESS = "USER_PAYMENT_METHOD_UPDATED_SUCCESS";
  public readonly EVENT_UPDATED_FAILED = "USER_PAYMENT_METHOD_UPDATED_FAILED";

  // USER_PAYMENT_METHOD EVENTS DELETED
  public readonly EVENT_DELETED = "USER_PAYMENT_METHOD_DELETED";
  public readonly EVENT_DELETED_SUCCESS = "USER_PAYMENT_METHOD_DELETED_SUCCESS";
  public readonly EVENT_DELETED_FAILED = "USER_PAYMENT_METHOD_DELETED_FAILED";

  // USER_PAYMENT_METHOD SESSION EVENTS
  public readonly EVENT_SESSION_START = "USER_PAYMENT_METHOD_SESSION_START";
  public readonly EVENT_SESSION_ERROR = "USER_PAYMENT_METHOD_SESSION_ERROR";
  public readonly EVENT_SESSION_END = "USER_PAYMENT_METHOD_SESSION_END";

  // USER_PAYMENT_METHOD EVENTS STATUS
  public readonly EVENT_STATUS_SUSPEND = "USER_PAYMENT_METHOD_SUSPEND";
  public readonly EVENT_STATUS_UNSUSPEND = "USER_PAYMENT_METHOD_UNSUSPEND";

  getFilters({
    methodTypeOptions,
    statusOptions,
    query,
  }: UserPaymentMethodFilterOptions): FilterConfig {
    const fields: FilterField[] = [
      {
        type: "search",
        name: "q",
        placeholder: "Buscar por correo de usuario...",
        value: query?.q || "",
        width: "flex-grow",
      },
    ];

    if (methodTypeOptions) {
      fields.push({
        type: "select",
        name: "paymentMethodId",
        label: "Proveedor",
        placeholder: "Cualquiera",
        options: methodTypeOptions,
        value: query?.paymentMethodId || "",
        width: "w-48",
      });
    }

    if (statusOptions) {
      fields.push({
        type: "select",
        name: "active",
        label: "Estado",
        placeholder: "Todos",
        options: statusOptions,
        value: query?.active || "",
        width: "w-40",
      });
    }

    return { action: "/dashboard/users/payment-methods", fields };
  }

  getFormCreate({
    moreInputs,
    userId,
    paymentsMethods,
  }: UserFormOptions): Form {
    const controlSection: FormSection = {
      title: "common.user.payment_method",
      className: "grid gap-4",
      elements: [
        ...USER_PAYMENT_METHOD_BASE_FIELDS(null, paymentsMethods, `${userId}`),
      ],
    };

    const form: Form = {
      title: "form.title.create_user",
      method: "POST",
      action: "/api/user/payment-method/" + userId,
      submitLabel: "common.button.save",
      inputs: [controlSection],
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
    paymentsMethods,
  }: UserFormOptions & { object: IUserPaymentMethod }): Form {
    const addressSection: FormSection = {
      title: "common.user.payment_method",
      className: "grid grid-cols-1 md:grid-cols-2 gap-4",
      elements: [
        ...USER_PAYMENT_METHOD_BASE_FIELDS(
          object,
          paymentsMethods,
          `${userId}`,
        ),
      ],
    };

    const form: Form = {
      title: "form.title.update_payment_method",
      method: "POST",
      action: "/api/user/payment-method/" + object.id + "/update",
      submitLabel: "common.button.update",
      inputs: [addressSection],
    };

    if (moreInputs && moreInputs.length > 0) {
      form.inputs.push(...moreInputs);
    }

    return form;
  }

  getColumns(): Column[] {
    return [
      { field: "user.email", label: "form.labels.email", formatter: "email" },
      // { field: 'details', label: 'form.labels.details' },
      // { field: 'isDefault', label: 'form.labels.isDefault' },
      // { field: "active", label: "form.labels.active" },
      { field: "paymentMethod.name", label: "form.labels.paymentMethod" },
    ];
  }
}
