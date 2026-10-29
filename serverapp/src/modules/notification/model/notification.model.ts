import { Form, FormInputType, FormSection } from "src/shared/types/form/form";
import { Notification, SubscriptionPlan } from "src/shared/types/schema.types";
import { Column } from "src/shared/types/table/table.type";
import {
  FilterConfig,
  FilterField,
  NotificationFilterOptions,
} from "src/shared/types/filter/filter.type";

interface UserFormOptions {
  moreInputs?: FormInputType[];
  userId?: string;
}

export default class NotificationModel {
  constructor() {}

  public MODEL_NAME = "Subscription";

  // STATUS
  public readonly STATUS_ACTIVE = "ACTIVE";
  public readonly STATUS_SUSPENDED = "SUSPENDED";
  public readonly STATUS_DELETED = "DELETED";

  // EVENTS CREATED
  public readonly EVENT_CREATED = "NOTIFICATION_CREATED";
  public readonly EVENT_CREATED_SUSSCESS = "NOTIFICATION_CREATED_SUSSCESS";
  public readonly EVENT_CREATED_FAILED = "NOTIFICATION_CREATED_FAILED";

  // EVENTS CREATED_NEXT
  public readonly EVENT_CREATED_NEXT = "NOTIFICATION_CREATED_NEXT";
  public readonly EVENT_CREATED_NEXT_SUSSCESS =
    "NOTIFICATION_CREATED_NEXT_SUSSCESS";
  public readonly EVENT_CREATED_NEXT_FAILED =
    "NOTIFICATION_CREATED_NEXT_FAILED";

  // EVENTS UPDATED
  public readonly EVENT_UPDATED = "NOTIFICATION_UPDATED";
  public readonly EVENT_UPDATED_SUCCESS = "NOTIFICATION_UPDATED_SUCCESS";
  public readonly EVENT_UPDATED_FAILED = "NOTIFICATION_UPDATED_FAILED";

  // EVENTS DELETED
  public readonly EVENT_DELETED = "NOTIFICATION_DELETED";
  public readonly EVENT_DELETED_SUCCESS = "NOTIFICATION_DELETED_SUCCESS";
  public readonly EVENT_DELETED_FAILED = "NOTIFICATION_DELETED_FAILED";

  // SUBSCIRPTION EVENTS
  public readonly EVENT_NOTIFICATION_START = "NOTIFICATION_START";
  public readonly EVENT_NOTIFICATION_ERROR = "NOTIFICATION_ERROR";

  public readonly EVENT_SUBCRIPTION_RELOAD_SUCCESS =
    "NOTIFICATION_RELOAD_SUCCESS";
  public readonly EVENT_SUBCRIPTION_RELOAD_FAILED =
    "NOTIFICATION_RELOAD_FAILED";

  public readonly EVENT_NOTIFICATION_SEND_SUCCESS =
    "NOTIFICATION_NOTIFICATION_SEND_SUCCESS";
  public readonly EVENT_NOTIFICATION_SEND_FAILED =
    "NOTIFICATION_NOTIFICATION_SEND_FAILED";

  public readonly EVENT_RENOVATION_SEND_SUCCESS =
    "NOTIFICATION_NOT_RENOVATION_SEND_SUCCESS";
  public readonly EVENT_RENOVATION_SEND_FAILED =
    "NOTIFICATION_NOT_RENOVATION_SEND_FAILED";

  // EVENTS STATUS
  public readonly EVENT_STATUS_SUSPEND = "NOTIFICATION_SUSPEND";
  public readonly EVENT_STATUS_UNSUSPEND = "NOTIFICATION_UNSUSPEND";

  getFilters({
    read,
    typeOptions,
    query,
  }: NotificationFilterOptions): FilterConfig {
    const fields: FilterField[] = [
      {
        type: "search",
        name: "q",
        placeholder: "Buscar plan por nombre...",
        value: query?.q || "",
        width: "flex-grow",
      },
    ];

    if (typeOptions) {
      fields.push({
        type: "select",
        name: "type",
        label: "Tipo",
        placeholder: "Todas",
        options: typeOptions,
        value: query?.currency || "",
        width: "w-32",
      });
    }

    // Asumiendo que statusOptions maneja el booleano 'selected'
    if (read) {
      fields.push({
        type: "checkbox",
        name: "selected",
        label: "Visible",
        placeholder: "Todos",
        value: query?.selected || "",
        width: "w-32",
      });
    }

    return { action: "/dashboard/notification", fields };
  }

  getFormRead({
    object,
    moreInputs,
    userId,
  }: UserFormOptions & { object: Notification }): Form {
    const dataSection: FormSection = {
      title: "form.section.control",
      className: "grid grid-cols-1 md:grid-cols-2 gap-4",
      elements: [],
    };

    const form: Form = {
      title: "form.title.add_content",
      method: "POST",
      action: `/api/notification/read/${object.id}`,
      submitLabel: "common.button.add",
      inputs: [dataSection],
    };

    if (moreInputs && moreInputs.length > 0) {
      form.inputs.push(...moreInputs);
    }

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
