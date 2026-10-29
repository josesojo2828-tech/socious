import { Form, FormInputType, FormSection } from "src/shared/types/form/form";
import { Column } from "src/shared/types/table/table.type";
import { Subscription, SubscriptionPlan } from "src/shared/types/schema.types";
import { SUBSCRIPTION_PLAN_BASE_FIELDS } from "src/modules/subscription/model/form-field-subscription-plan";
import { SUBSCRIPTION_BASE_FIELDS } from "./subscription-form-fields";
import {
  FilterConfig,
  FilterField,
  SubscriptionFilterOptions,
} from "src/shared/types/filter/filter.type";

interface UserFormOptions {
  plans: SubscriptionPlan[];
  moreInputs?: FormInputType[];
  userId?: string;
  path?: string;
}

export default class SubscriptionModel {
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
    statusOptions,
    planOptions,
    autoRenewOptions,
    query,
  }: SubscriptionFilterOptions): FilterConfig {
    const fields: FilterField[] = [
      {
        type: "search",
        name: "q",
        placeholder: "Buscar por usuario...",
        value: query?.q || "",
        width: "flex-grow",
      },
    ];

    if (planOptions) {
      fields.push({
        type: "select",
        name: "planId",
        label: "Plan",
        placeholder: "Cualquiera",
        options: planOptions,
        value: query?.planId || "",
        width: "w-48",
      });
    }

    if (statusOptions) {
      fields.push({
        type: "select",
        name: "status", // Enum SubscriptionStatus
        label: "Estado",
        placeholder: "Todos",
        options: statusOptions,
        value: query?.status || "",
        width: "w-40",
      });
    }

    if (autoRenewOptions) {
      fields.push({
        type: "select",
        name: "autoRenew",
        label: "Auto-Renovación",
        placeholder: "Todos",
        options: autoRenewOptions,
        value: query?.autoRenew || "",
        width: "w-40",
      });
    }

    return { action: "/dashboard/users/subscriptions", fields };
  }

  getFormCreate({ moreInputs, plans, userId, path }: UserFormOptions): Form {
    const controlSection: FormSection = {
      title: "form.section.control",
      className: "grid grid-cols-1 md:grid-cols-2 gap-4",
      elements: [...SUBSCRIPTION_BASE_FIELDS(plans)],
    };

    const form: Form = {
      title: "form.title.create_subscription",
      method: "POST",
      action: path ? path : `/api/user/${userId}/subscription`,
      submitLabel: "common.button.create",
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
    path,
  }: UserFormOptions & { object: Subscription }): Form {
    const subscriptionSection: FormSection = {
      title: "form.section.personal_data",
      className: "grid grid-cols-1 md:grid-cols-2 gap-4",
      elements: [],
    };

    const form: Form = {
      title: "form.title.update_subscription",
      method: "POST",
      action: path ? path : "/api/subscription/" + object.id + "/update",
      submitLabel: "common.button.update",
      inputs: [subscriptionSection],
    };

    if (moreInputs && moreInputs.length > 0) {
      form.inputs.push(...moreInputs);
    }

    return form;
  }

  getColumns(): Column[] {
    return [
      { field: "plan.name", label: "common.subscription.plan" },
      {
        field: "startDate",
        label: "common.subscription.startDate",
        formatter: "date",
      },
      {
        field: "endDate",
        label: "common.subscription.endDate",
        formatter: "date",
      },
      { field: "status", label: "common.subscription.status" },
      { field: "user.email", label: "form.labels.email", formatter: "email" },
      { field: "createdAt", label: "form.labels.createdAt", formatter: "date" },
    ];
  }
}
