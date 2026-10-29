import { Form, FormInputType, FormSection } from "src/shared/types/form/form";
import {
  SUBSCRIPTION_PLAN_ADD_CONTENT,
  SUBSCRIPTION_PLAN_BASE_FIELDS,
} from "./form-field-subscription-plan";
import { SubscriptionPlan } from "src/shared/types/schema.types";
import { Column } from "src/shared/types/table/table.type";
import {
  FilterConfig,
  FilterField,
  SubscriptionPlanFilterOptions,
} from "src/shared/types/filter/filter.type";

interface UserFormOptions {
  moreInputs?: FormInputType[];
  userId?: string;
}

export default class SubscriptionPlanModel {
  constructor() {}

  public MODEL_NAME = "Subscription";

  // STATUS
  public readonly STATUS_ACTIVE = "ACTIVE";
  public readonly STATUS_SUSPENDED = "SUSPENDED";
  public readonly STATUS_DELETED = "DELETED";

  // EVENTS CREATED
  public readonly EVENT_CREATED = "SUBSCRIPTION_CREATED";
  public readonly EVENT_CREATED_SUSSCESS = "SUBSCRIPTION_CREATED_SUSSCESS";
  public readonly EVENT_CREATED_FAILED = "SUBSCRIPTION_CREATED_FAILED";

  // EVENTS CREATED_NEXT
  public readonly EVENT_CREATED_NEXT = "SUBSCRIPTION_CREATED_NEXT";
  public readonly EVENT_CREATED_NEXT_SUSSCESS =
    "SUBSCRIPTION_CREATED_NEXT_SUSSCESS";
  public readonly EVENT_CREATED_NEXT_FAILED =
    "SUBSCRIPTION_CREATED_NEXT_FAILED";

  // EVENTS UPDATED
  public readonly EVENT_UPDATED = "SUBSCRIPTION_UPDATED";
  public readonly EVENT_UPDATED_SUCCESS = "SUBSCRIPTION_UPDATED_SUCCESS";
  public readonly EVENT_UPDATED_FAILED = "SUBSCRIPTION_UPDATED_FAILED";

  // EVENTS DELETED
  public readonly EVENT_DELETED = "SUBSCRIPTION_DELETED";
  public readonly EVENT_DELETED_SUCCESS = "SUBSCRIPTION_DELETED_SUCCESS";
  public readonly EVENT_DELETED_FAILED = "SUBSCRIPTION_DELETED_FAILED";

  // SUBSCIRPTION EVENTS
  public readonly EVENT_SUBSCRIPTION_START = "SUBSCRIPTION_START";
  public readonly EVENT_SUBSCRIPTION_ERROR = "SUBSCRIPTION_ERROR";

  public readonly EVENT_SUBCRIPTION_RELOAD_SUCCESS =
    "SUBSCRIPTION_RELOAD_SUCCESS";
  public readonly EVENT_SUBCRIPTION_RELOAD_FAILED =
    "SUBSCRIPTION_RELOAD_FAILED";

  public readonly EVENT_NOTIFICATION_SEND_SUCCESS =
    "SUBSCRIPTION_NOTIFICATION_SEND_SUCCESS";
  public readonly EVENT_NOTIFICATION_SEND_FAILED =
    "SUBSCRIPTION_NOTIFICATION_SEND_FAILED";

  public readonly EVENT_RENOVATION_SEND_SUCCESS =
    "SUBSCRIPTION_NOT_RENOVATION_SEND_SUCCESS";
  public readonly EVENT_RENOVATION_SEND_FAILED =
    "SUBSCRIPTION_NOT_RENOVATION_SEND_FAILED";

  // EVENTS STATUS
  public readonly EVENT_STATUS_SUSPEND = "SUBSCRIPTION_SUSPEND";
  public readonly EVENT_STATUS_UNSUSPEND = "SUBSCRIPTION_UNSUSPEND";

  getFilters({
    currencyOptions,
    statusOptions,
    query,
  }: SubscriptionPlanFilterOptions): FilterConfig {
    const fields: FilterField[] = [
      {
        type: "search",
        name: "q",
        placeholder: "Buscar plan por nombre...",
        value: query?.q || "",
        width: "flex-grow",
      },
    ];

    if (currencyOptions) {
      fields.push({
        type: "select",
        name: "currency",
        label: "Moneda",
        placeholder: "Todas",
        options: currencyOptions,
        value: query?.currency || "",
        width: "w-32",
      });
    }

    // Asumiendo que statusOptions maneja el booleano 'selected'
    if (statusOptions) {
      fields.push({
        type: "select",
        name: "selected",
        label: "Visible",
        placeholder: "Todos",
        options: statusOptions,
        value: query?.selected || "",
        width: "w-32",
      });
    }

    return { action: "/dashboard/subscription", fields };
  }

  getFormCreate({ moreInputs, userId }: UserFormOptions): Form {
    const dataSection: FormSection = {
      title: "form.section.control",
      className: "grid grid-cols-1 md:grid-cols-2 gap-4",
      elements: [...SUBSCRIPTION_PLAN_BASE_FIELDS()],
    };

    const form: Form = {
      title: "form.title.create_subscription_plan",
      method: "POST",
      action: `/api/subscription/create`,
      submitLabel: "common.button.create",
      inputs: [dataSection],
    };

    if (moreInputs && moreInputs.length > 0) {
      form.inputs.push(...moreInputs);
    }

    return form;
  }

  getFormAdd({
    object,
    moreInputs,
    userId,
  }: UserFormOptions & { object: SubscriptionPlan }): Form {
    const dataSection: FormSection = {
      title: "form.section.control",
      className: "grid grid-cols-1 md:grid-cols-2 gap-4",
      elements: [...SUBSCRIPTION_PLAN_ADD_CONTENT()],
    };

    const form: Form = {
      title: "form.title.add_content",
      method: "POST",
      action: `/api/subscription/add/content/${object.id}`,
      submitLabel: "common.button.add",
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
  }: UserFormOptions & { object: SubscriptionPlan }): Form {
    const dataSection: FormSection = {
      title: "form.section.control",
      className: "grid grid-cols-1 md:grid-cols-2 gap-4",
      elements: [...SUBSCRIPTION_PLAN_BASE_FIELDS(object)],
    };

    const form: Form = {
      title: "form.title.update_subscription_plan",
      method: "POST",
      action: `/api/subscription/${userId}/update`,
      submitLabel: "common.button.create",
      inputs: [dataSection],
    };

    if (moreInputs && moreInputs.length > 0) form.inputs.push(...moreInputs);
    return form;
  }

  getColumns(): Column[] {
    return [
      { field: "name", label: "common.subscription.plan" },
      // { field: 'description', label: 'common.subscription.description' },
      { field: "price", label: "form.labels.price" },
      { field: "selected", label: "form.labels.selected" },
      { field: "currency", label: "form.labels.currency" },
      { field: "_count.subscriptions", label: "form.labels.subscriptions" },
    ];
  }
}
