import { Form, FormInputType, FormSection } from "src/shared/types/form/form";
import {
  TRANSACTION_BASE_FIELDS,
  TRANSACTION_BASE_FIELDS_SELECT,
  TRANSACTION_BASE_FIELDS_STATUS,
} from "./form-field-transaction";
import { IUserPaymentMethod, Transaction } from "src/shared/types/schema.types";
import { Column } from "src/shared/types/table/table.type";
import {
  FilterConfig,
  FilterField,
  TransactionFilterOptions,
} from "src/shared/types/filter/filter.type";

interface UserFormOptions {
  moreInputs?: FormInputType[];
  userId?: string;
  paymentsMethods: IUserPaymentMethod[];
}

export default class TransactionModel {
  constructor() {}

  public MODEL_NAME = "Transaction";

  // STATUS
  public readonly STATUS_ACTIVE = "ACTIVE";
  public readonly STATUS_SUSPENDED = "SUSPENDED";
  public readonly STATUS_DELETED = "DELETED";

  // EVENTS CREATED
  public readonly EVENT_CREATED = "TRANSACTION_CREATED";
  public readonly EVENT_CREATED_SUSSCESS = "TRANSACTION_CREATED_SUSSCESS";
  public readonly EVENT_CREATED_FAILED = "TRANSACTION_CREATED_FAILED";

  // EVENTS CREATED_NEXT
  public readonly EVENT_CREATED_NEXT = "TRANSACTION_CREATED_NEXT";
  public readonly EVENT_CREATED_NEXT_SUSSCESS =
    "TRANSACTION_CREATED_NEXT_SUSSCESS";
  public readonly EVENT_CREATED_NEXT_FAILED = "TRANSACTION_CREATED_NEXT_FAILED";

  // EVENTS UPDATED
  public readonly EVENT_UPDATED = "TRANSACTION_UPDATED";
  public readonly EVENT_UPDATED_SUCCESS = "TRANSACTION_UPDATED_SUCCESS";
  public readonly EVENT_UPDATED_FAILED = "TRANSACTION_UPDATED_FAILED";

  // EVENTS DELETED
  public readonly EVENT_DELETED = "TRANSACTION_DELETED";
  public readonly EVENT_DELETED_SUCCESS = "TRANSACTION_DELETED_SUCCESS";
  public readonly EVENT_DELETED_FAILED = "TRANSACTION_DELETED_FAILED";

  // SUBSCIRPTION EVENTS
  public readonly EVENT_TRANSACTION_START = "TRANSACTION_START";
  public readonly EVENT_TRANSACTION_ERROR = "TRANSACTION_ERROR";

  public readonly EVENT_SUBCRIPTION_RELOAD_SUCCESS =
    "TRANSACTION_RELOAD_SUCCESS";
  public readonly EVENT_SUBCRIPTION_RELOAD_FAILED = "TRANSACTION_RELOAD_FAILED";

  public readonly EVENT_NOTIFICATION_SEND_SUCCESS =
    "TRANSACTION_NOTIFICATION_SEND_SUCCESS";
  public readonly EVENT_NOTIFICATION_SEND_FAILED =
    "TRANSACTION_NOTIFICATION_SEND_FAILED";

  public readonly EVENT_RENOVATION_SEND_SUCCESS =
    "TRANSACTION_NOT_RENOVATION_SEND_SUCCESS";
  public readonly EVENT_RENOVATION_SEND_FAILED =
    "TRANSACTION_NOT_RENOVATION_SEND_FAILED";

  // EVENTS STATUS
  public readonly EVENT_STATUS_SUSPEND = "TRANSACTION_SUSPEND";
  public readonly EVENT_STATUS_UNSUSPEND = "TRANSACTION_UNSUSPEND";

  // EVENTS SET_STATUS
  public readonly EVENT_SET_STATUS = "TRANSACTION_SET_STATUS";
  public readonly EVENT_SET_STATUS_SUCCESS = "TRANSACTION_SET_STATUS_SUCCESS";
  public readonly EVENT_SET_STATUS_FAILED = "TRANSACTION_SET_STATUS_FAILED";

  // EVENTS SET_STATUS
  public readonly EVENT_SET_SUCCESS = "TRANSACTION_SET_SUCCESS";
  public readonly EVENT_SET_FAILED = "TRANSACTION_SET_FAILED";

  // TYPES
  public readonly EVENT_SET_STATUS_TYPE_PENDING = "TRANSACTION_SET_PENDING";
  public readonly EVENT_SET_STATUS_TYPE_CANCELED = "TRANSACTION_SET_CANCELED";
  public readonly EVENT_SET_STATUS_TYPE_SUCCESS = "TRANSACTION_SET_SUCCESS";
  public readonly EVENT_SET_STATUS_TYPE_FAILED = "TRANSACTION_SET_FAILED";

  getFilters({
    typeOptions,
    statusOptions,
    paymentMethodOptions,
    query,
  }: TransactionFilterOptions): FilterConfig {
    const fields: FilterField[] = [
      {
        type: "search",
        name: "q",
        placeholder: "Ref. de transacción o usuario...",
        value: query?.q || "",
        width: "flex-grow", //
      },
    ];

    if (typeOptions) {
      fields.push({
        type: "select",
        name: "type", // Enum TransactionType (DEPOSIT, WITHDRAW...)
        label: "Tipo",
        placeholder: "Todos",
        options: typeOptions,
        value: query?.type || "",
        width: "w-40",
      });
    }

    if (statusOptions) {
      fields.push({
        type: "select",
        name: "status", // Enum TransactionStatus (PENDING, SUCCESS...)
        label: "Estado",
        placeholder: "Todos",
        options: statusOptions,
        value: query?.status || "",
        width: "w-40",
      });
    }

    if (paymentMethodOptions) {
      fields.push({
        type: "select",
        name: "paymentMethodId", // Relación con UserPaymentMethod -> PaymentMethod
        label: "Método Pago",
        placeholder: "Cualquiera",
        options: paymentMethodOptions,
        value: query?.paymentMethodId || "",
        width: "w-48",
      });
    }

    return { action: "/dashboard/transactions", fields };
  }

  getFormCreate({
    moreInputs,
    userId,
    paymentsMethods,
  }: UserFormOptions): Form {
    const dataSection: FormSection = {
      title: "form.section.control",
      className: "grid grid-cols-1 md:grid-cols-2 gap-4",
      elements: [
        ...TRANSACTION_BASE_FIELDS(),
        ...TRANSACTION_BASE_FIELDS_SELECT(paymentsMethods),
      ],
    };

    const form: Form = {
      title: "form.title.create_transaction",
      method: "POST",
      action: `/api/transactions/create`,
      submitLabel: "form.buttons.submit",
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
  }: UserFormOptions & { object: Transaction }): Form {
    const dataSection: FormSection = {
      title: "form.section.control",
      className: "grid grid-cols-1 md:grid-cols-2 gap-4",
      elements: [...TRANSACTION_BASE_FIELDS(object)],
    };

    const form: Form = {
      title: "form.title.update_transaction",
      method: "POST",
      action: `/api/transactions/${userId}/update`,
      submitLabel: "form.buttons.save",
      inputs: [dataSection],
    };

    if (moreInputs && moreInputs.length > 0) form.inputs.push(...moreInputs);
    return form;
  }

  getFormUpdateStatus({
    object,
    moreInputs,
    userId,
  }: UserFormOptions & { object: Transaction }): Form {
    const dataSection: FormSection = {
      title: "form.section.control",
      className: "grid grid-cols-1 md:grid-cols-2 gap-4",
      elements: [...TRANSACTION_BASE_FIELDS_STATUS(object)],
    };

    const form: Form = {
      title: "form.title.set_status",
      method: "POST",
      action: `/api/transactions/set/status/${object.id}`,
      submitLabel: "form.buttons.save",
      inputs: [dataSection],
    };

    if (moreInputs && moreInputs.length > 0) form.inputs.push(...moreInputs);
    return form;
  }

  getColumns(): Column[] {
    return [
      {
        field: "paymentMethod.paymentMethod.name",
        label: "common.payment_method.index",
      },
      { field: "amount", label: "form.labels.amount" },
      { field: "status", label: "form.labels.status" },
      { field: "createdAt", label: "form.labels.createdAt" },
    ];
  }
}
