import {
  Form,
  FormInput,
  FormInputType,
  FormSection,
  FormSelect,
} from "src/shared/types/form/form";
import {
  mapValuesToInputs,
  USER_BASE_FIELDS,
  USER_DYNAMIC_SELECTS,
  USER_SECURITY_FIELDS,
} from "./user-form-fields";
import { Column } from "src/shared/types/table/table.type";
import { CardDefinition } from "src/shared/types/dashboard.type";
import { User } from "src/shared/types/schema.types";
import {
  FilterConfig,
  FilterField,
  UserFilterOptions,
} from "src/shared/types/filter/filter.type";

interface FeedbackFormOptions {
  statusOptions?: { label: string; value: string }[];
  permitOptions?: { label: string; value: string }[];
  moreInputs?: FormInputType[];
}

export default class FeedbackModel {
  constructor() {}

  public MODEL_NAME = "Feedback";

  // USER ROLES
  public readonly TYPE_FEEDBACK_ADMIN = "ADMIN";
  public readonly TYPE_FEEDBACK_FEEDBACK = "FEEDBACK";

  // USER STATUS
  public readonly STATUS_ACTIVE = "ACTIVE";
  public readonly STATUS_SUSPENDED = "SUSPENDED";
  public readonly STATUS_DELETED = "DELETED";

  // USER EVENTS CREATED
  public readonly EVENT_CREATED = "FEEDBACK_CREATED";
  public readonly EVENT_CREATED_SUSSCESS = "FEEDBACK_CREATED_SUSSCESS";
  public readonly EVENT_CREATED_FAILED = "FEEDBACK_CREATED_FAILED";

  // FEEDBACK EVENTS UPDATED
  public readonly EVENT_UPDATED = "FEEDBACK_UPDATED";
  public readonly EVENT_UPDATED_SUCCESS = "FEEDBACK_UPDATED_SUCCESS";
  public readonly EVENT_UPDATED_FAILED = "FEEDBACK_UPDATED_FAILED";

  // FEEDBACK EVENTS DELETED
  public readonly EVENT_DELETED = "FEEDBACK_DELETED";
  public readonly EVENT_DELETED_SUCCESS = "FEEDBACK_DELETED_SUCCESS";
  public readonly EVENT_DELETED_FAILED = "FEEDBACK_DELETED_FAILED";

  // FEEDBACK SESSION EVENTS
  public readonly EVENT_SESSION_START = "FEEDBACK_SESSION_START";
  public readonly EVENT_SESSION_ERROR = "FEEDBACK_SESSION_ERROR";
  public readonly EVENT_SESSION_END = "FEEDBACK_SESSION_END";

  // FEEDBACK EVENTS STATUS
  public readonly EVENT_STATUS_SUSPEND = "FEEDBACK_SUSPEND";
  public readonly EVENT_STATUS_UNSUSPEND = "FEEDBACK_UNSUSPEND";

  getColumns(): Column[] {
    return [
      { field: "message", label: "form.labels.message" },
      { field: "createdAt", label: "form.labels.createdAt", formatter: "date" },
      { field: "user.email", label: "form.labels.email", formatter: "email" },
    ];
  }

  /**
   * Genera la configuración para la barra de filtros en el listado
   */
  getFilters({
    statusOptions,
    permitOptions,
    query,
  }: UserFilterOptions): FilterConfig {
    const fields: FilterField[] = [
      {
        type: "search",
        name: "q", // 'q' es el estándar común para búsqueda general
        placeholder: "Buscar por nombre, usuario o email...",
        value: query?.q || "", // Mantiene el texto escrito
        width: "flex-grow", // Ocupa el espacio restante
      },
    ];

    if (statusOptions) {
      fields.push({
        type: "select",
        name: "status",
        label: "Estado",
        placeholder: "Todos",
        options: statusOptions,
        value: query?.status || "",
        width: "w-48", // Ancho fijo para selects
      });
    }

    if (permitOptions) {
      fields.push({
        type: "select",
        name: "permitId",
        label: "Rol",
        placeholder: "Todos",
        options: permitOptions,
        value: query?.permitId || "",
        width: "w-48",
      });
    }

    return {
      action: "/dashboard/users", // O la ruta base de tu módulo
      fields: fields,
    };
  }
}
