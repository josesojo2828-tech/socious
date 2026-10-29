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
import { USER_ADDRESS_BASE_FIELDS } from "./user-address-form-fields";
import { UserAddress } from "src/shared/types/schema.types";
import {
  FilterConfig,
  FilterField,
  UserAddressFilterOptions,
} from "src/shared/types/filter/filter.type";

interface UserFormOptions {
  moreInputs?: FormInputType[];
  userId?: string;
}

export default class UserAddressModel {
  constructor() {}

  public MODEL_NAME = "UserAddress";

  // USER STATUS
  public readonly STATUS_ACTIVE = "ACTIVE";
  public readonly STATUS_SUSPENDED = "SUSPENDED";
  public readonly STATUS_DELETED = "DELETED";

  // USER EVENTS CREATED
  public readonly EVENT_CREATED = "USER_ADDRESS_CREATED";
  public readonly EVENT_CREATED_SUSSCESS = "USER_ADDRESS_CREATED_SUSSCESS";
  public readonly EVENT_CREATED_FAILED = "USER_ADDRESS_CREATED_FAILED";

  // USER_ADDRESS EVENTS UPDATED
  public readonly EVENT_UPDATED = "USER_ADDRESS_UPDATED";
  public readonly EVENT_UPDATED_SUCCESS = "USER_ADDRESS_UPDATED_SUCCESS";
  public readonly EVENT_UPDATED_FAILED = "USER_ADDRESS_UPDATED_FAILED";

  // USER_ADDRESS EVENTS DELETED
  public readonly EVENT_DELETED = "USER_ADDRESS_DELETED";
  public readonly EVENT_DELETED_SUCCESS = "USER_ADDRESS_DELETED_SUCCESS";
  public readonly EVENT_DELETED_FAILED = "USER_ADDRESS_DELETED_FAILED";

  // USER_ADDRESS SESSION EVENTS
  public readonly EVENT_SESSION_START = "USER_ADDRESS_SESSION_START";
  public readonly EVENT_SESSION_ERROR = "USER_ADDRESS_SESSION_ERROR";
  public readonly EVENT_SESSION_END = "USER_ADDRESS_SESSION_END";

  // USER_ADDRESS EVENTS STATUS
  public readonly EVENT_STATUS_SUSPEND = "USER_ADDRESS_SUSPEND";
  public readonly EVENT_STATUS_UNSUSPEND = "USER_ADDRESS_UNSUSPEND";

  getFilters({
    typeOptions,
    countryOptions,
    query,
  }: UserAddressFilterOptions): FilterConfig {
    const fields: FilterField[] = [
      {
        type: "search",
        name: "q",
        placeholder: "Buscar por ciudad, calle o usuario...",
        value: query?.q || "",
        width: "flex-grow",
      },
    ];

    if (typeOptions) {
      fields.push({
        type: "select",
        name: "type", // Enum AddressType
        label: "Tipo",
        placeholder: "Todos",
        options: typeOptions,
        value: query?.type || "",
        width: "w-40",
      });
    }

    if (countryOptions) {
      fields.push({
        type: "select",
        name: "country",
        label: "País",
        placeholder: "Todos",
        options: countryOptions,
        value: query?.country || "",
        width: "w-48",
      });
    }

    return { action: "/dashboard/users/addresses", fields };
  }

  getFormCreate({ moreInputs, userId }: UserFormOptions): Form {
    const controlSection: FormSection = {
      title: "form.section.address",
      className: "grid gap-4",
      elements: [...USER_ADDRESS_BASE_FIELDS(null, userId)],
    };

    const form: Form = {
      title: "form.title.create_user",
      method: "POST",
      action: "/api/user/address/" + userId,
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
  }: UserFormOptions & { object: UserAddress }): Form {
    const addressSection: FormSection = {
      title: "form.section.address",
      className: "grid grid-cols-1 md:grid-cols-2 gap-4",
      elements: [...USER_ADDRESS_BASE_FIELDS(object, userId)],
    };

    const form: Form = {
      title: "form.title.update_user",
      method: "POST",
      action: "/api/user/address/" + object.id + "/update",
      submitLabel: "common.button.update",
      inputs: [addressSection],
    };

    if (moreInputs && moreInputs.length > 0) {
      form.inputs.push(...moreInputs);
    }

    return form;
  }

  getColumn(): Column[] {
    return [
      // { field: 'postalCode', label: 'form.labels.postalCode' },
      // { field: 'address1', label: 'form.labels.address1' },
      // { field: 'postalCode', label: 'form.labels.postalCode' },
      { field: "city", label: "form.labels.city" },
      { field: "state", label: "form.labels.state" },
      { field: "country", label: "form.labels.country", formatter: "country" },
    ];
  }
}
