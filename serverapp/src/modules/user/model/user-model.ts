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

interface UserFormOptions {
  statusOptions?: { label: string; value: string }[];
  permitOptions?: { label: string; value: string }[];
  moreInputs?: FormInputType[];
}

export default class UserModel {
  constructor() {}

  public MODEL_NAME = "User";

  // USER ROLES
  public readonly TYPE_USER_ADMIN = "ADMIN";
  public readonly TYPE_USER_USER = "USER";

  // USER STATUS
  public readonly STATUS_ACTIVE = "ACTIVE";
  public readonly STATUS_SUSPENDED = "SUSPENDED";
  public readonly STATUS_DELETED = "DELETED";

  // USER EVENTS CREATED
  public readonly EVENT_CREATED = "USER_CREATED";
  public readonly EVENT_CREATED_SUSSCESS = "USER_CREATED_SUSSCESS";
  public readonly EVENT_CREATED_FAILED = "USER_CREATED_FAILED";

  // USER EVENTS UPDATED
  public readonly EVENT_UPDATED = "USER_UPDATED";
  public readonly EVENT_UPDATED_SUCCESS = "USER_UPDATED_SUCCESS";
  public readonly EVENT_UPDATED_FAILED = "USER_UPDATED_FAILED";

  // USER EVENTS DELETED
  public readonly EVENT_DELETED = "USER_DELETED";
  public readonly EVENT_DELETED_SUCCESS = "USER_DELETED_SUCCESS";
  public readonly EVENT_DELETED_FAILED = "USER_DELETED_FAILED";

  // USER SESSION EVENTS
  public readonly EVENT_SESSION_START = "USER_SESSION_START";
  public readonly EVENT_SESSION_ERROR = "USER_SESSION_ERROR";
  public readonly EVENT_SESSION_END = "USER_SESSION_END";

  // USER EVENTS STATUS
  public readonly EVENT_STATUS_SUSPEND = "USER_SUSPEND";
  public readonly EVENT_STATUS_UNSUSPEND = "USER_UNSUSPEND";

  //
  public readonly EVENT_USE_CODE_REF = "USER_USE_CODE_REF";

  getFormCreateUser({
    statusOptions,
    permitOptions,
    moreInputs,
  }: UserFormOptions): Form {
    // 1. Configurar campos de selección con datos dinámicos
    const statusSelect = {
      ...USER_DYNAMIC_SELECTS().find((f) => f.name === "status"),
      options: statusOptions,
    } as FormSelect;
    const permitSelect = {
      ...USER_DYNAMIC_SELECTS().find((f) => f.name === "permitId"),
      options: permitOptions,
    } as FormSelect;

    // 2. Definir Secciones
    const personalSection: FormSection = {
      title: "form.section.personal_data",
      className: "grid grid-cols-1 md:grid-cols-2 gap-4",
      elements: USER_BASE_FIELDS(),
    };

    const securitySection: FormSection = {
      title: "form.section.security",
      className: "grid grid-cols-1 md:grid-cols-2 gap-4",
      elements: [...USER_SECURITY_FIELDS()],
    };

    const controlSection: FormSection = {
      title: "form.section.control",
      className: "gap-4",
      elements: [statusSelect, permitSelect], // Campos de control de acceso
    };

    // 3. Componer el formulario
    const form: Form = {
      title: "form.title.create_user",
      method: "POST",
      action: "/api/user",
      submitLabel: "common.button.create",
      inputs: [personalSection, securitySection, controlSection],
    };

    if (moreInputs && moreInputs.length > 0) {
      form.inputs.push(...moreInputs);
    }

    return form;
  }

  getFormUpdateUser({
    object,
    statusOptions,
    permitOptions,
    moreInputs,
  }: UserFormOptions & { object: User }): Form {
    // 1. Configurar Selects con valores y opciones (CORRECTO)
    const statusSelect = statusOptions
      ? ({
          ...USER_DYNAMIC_SELECTS().find((f) => f.name === "status"),
          options: statusOptions,
          required: false,
          value: object.status, // ✅ Carga el valor actual
        } as FormSelect)
      : undefined;

    const permitSelect = permitOptions
      ? ({
          ...USER_DYNAMIC_SELECTS().find((f) => f.name === "permitId"),
          options: permitOptions,
          required: false,
          value: object.permitId, // ✅ Carga el valor actual
        } as FormSelect)
      : undefined;

    // 2. Mapear valores del objeto a los campos base (CORRECCIÓN)
    // ----------------------------------------------------------------------
    // Obtenemos solo los campos que van a la sección personal (ej: 0 al 3)
    const personalFieldsDefinition = USER_BASE_FIELDS(object).map((input) => ({
      ...input,
      required: false,
    }));

    // 🛑 APLICAR EL MAPEO: Esto inyecta object.firstName, object.lastName, etc.
    const personalFieldsWithValue = mapValuesToInputs(
      personalFieldsDefinition,
      object,
    );
    // ----------------------------------------------------------------------

    // 3. Definir Secciones
    const personalSection: FormSection = {
      title: "form.section.personal_data",
      className: "grid grid-cols-1 md:grid-cols-2 gap-4",
      elements: personalFieldsWithValue, // 🛑 USAR EL ARRAY CON VALORES INYECTADOS
    };

    // const securitySection: FormSection = {
    //     title: "form.section.security",
    //     className: "grid grid-cols-1 md:grid-cols-2 gap-4",
    //     // Los campos de seguridad se cargan sin 'value' intencionalmente (contraseña vacía)
    //     elements: USER_SECURITY_FIELDS().map(input => ({ ...input, value: '', required: false }))
    // };

    const controlSection: FormSection = {
      title: "form.section.control",
      className: "grid grid-cols-1 md:grid-cols-2 gap-4",
      elements: [],
    };

    if (statusSelect) controlSection.elements.push(statusSelect);
    if (permitSelect) controlSection.elements.push(permitSelect);

    // 4. Componer el formulario (El resto es correcto)
    const form: Form = {
      title: "form.title.update_user",
      method: "POST",
      action: "/api/user/" + object.id + "/update",
      submitLabel: "common.button.update",
      inputs: [
        personalSection,
        // securitySection,
        // controlSection,
      ],
    };

    if (controlSection.elements.length > 0) form.inputs.push(controlSection);

    if (moreInputs && moreInputs.length > 0) {
      form.inputs.push(...moreInputs);
    }

    return form;
  }

  getFormControlUser({
    statusOptions,
    permitOptions,
    moreInputs,
  }: UserFormOptions): Form {
    // 1. Configurar campos de selección con datos dinámicos
    const statusSelect = {
      ...USER_DYNAMIC_SELECTS().find((f) => f.name === "status"),
      options: statusOptions,
    } as FormSelect;
    const permitSelect = {
      ...USER_DYNAMIC_SELECTS().find((f) => f.name === "permitId"),
      options: permitOptions,
    } as FormSelect;

    const securitySection: FormSection = {
      title: "form.section.security",
      className: "grid grid-cols-1 md:grid-cols-2 gap-4",
      elements: [...USER_SECURITY_FIELDS()],
    };

    const controlSection: FormSection = {
      title: "form.section.control",
      className: "gap-4",
      elements: [statusSelect, permitSelect], // Campos de control de acceso
    };

    // 3. Componer el formulario
    const form: Form = {
      title: "form.title.control_user",
      method: "POST",
      action: "/api/user",
      submitLabel: "common.button.create",
      inputs: [securitySection, controlSection],
    };

    if (moreInputs && moreInputs.length > 0) {
      form.inputs.push(...moreInputs);
    }

    return form;
  }

  getFormUpdatePassword({
    object,
    moreInputs,
  }: {
    object: User;
    moreInputs?: FormInputType[];
  }): Form {
    const securitySection: FormSection = {
      title: "form.section.security",
      className: "grid grid-cols-1 md:grid-cols-2 gap-4",
      elements: USER_SECURITY_FIELDS().map((input) => ({
        ...input,
        value: "",
        required: false,
      })),
    };

    // 4. Componer el formulario (El resto es correcto)
    const form: Form = {
      title: "form.title.password_user",
      method: "POST",
      action: "/api/user/" + object.id + "/password",
      submitLabel: "common.button.update",
      inputs: [securitySection],
    };

    if (moreInputs && moreInputs.length > 0) {
      form.inputs.push(...moreInputs);
    }

    return form;
  }

  getColumns(): Column[] {
    return [
      { field: "firstName", label: "form.labels.firstName" },
      { field: "lastName", label: "form.labels.lastName" },
      { field: "username", label: "form.labels.username" },
      { field: "email", label: "form.labels.email", formatter: "email" },
      { field: "nutritionistName", label: "Nutricionista" },
      { field: "createdAt", label: "form.labels.createdAt", formatter: "date" },
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

    // Filtro para usuarios demo
    fields.push({
      type: "select",
      name: "isDemo",
      label: "Demo",
      placeholder: "Todos",
      options: [
        { label: "No Demo", value: "false" },
        { label: "Demo", value: "true" },
        { label: "Todos", value: "" },
      ],
      value: query?.isDemo || "false", // Por defecto excluir demo
      width: "w-48",
    });

    return {
      action: "/dashboard/users", // O la ruta base de tu módulo
      fields: fields,
    };
  }

  // CARDS
  public getProfileCards(user: User): CardDefinition[] {
    const cards: CardDefinition[] = [
      {
        title: "common.user.personal_data",
        icon: "user",
        // 🛑 wrapperClass define el ancho de la columna (ej: w-1/2 o col-span-5)
        wrapperClass: "md:col-span-3",
        fields: [
          {
            label: "form.labels.fullname",
            value: user.fullName,
            className: "text-md font-bold",
          },
          {
            label: "form.labels.email",
            value: user.email,
            className: "text-xs text-base text-gray-600",
          },
          {
            label: "form.labels.username",
            value: `@${user.username}`,
            className: "text-xs text-base",
          },
        ],
      },
      {
        title: "common.user.security_control",
        icon: "lock",
        wrapperClass: "md:col-span-2", // Columna más pequeña (5 - 3 = 2)
        fields: [
          {
            label: "form.labels.status",
            value: user.status,
            formatter: "status_badge",
          }, // Nuevo formatter para badges
          {
            label: "form.labels.permit",
            value: user.permits.name,
            formatter: "capitalize",
          },
          {
            label: "form.labels.createdAt",
            value: user.createdAt,
            formatter: "date",
          },
        ],
      },
      // ... (otras tarjetas, ej: Contacto, Historial)
    ];

    return cards;
  }
}
