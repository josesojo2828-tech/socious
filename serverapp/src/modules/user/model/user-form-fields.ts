import {
  FormInput,
  FormInputType,
  FormSelect,
} from "src/shared/types/form/form";
import { User } from "src/shared/types/schema.types";

// Campos de Seguridad (Requeridos solo en Creación)
export const USER_SECURITY_FIELDS = (user: User | null = null): FormInput[] => {
  return [
    {
      gridSpan: 1,
      controlType: "input",
      name: "password",
      label: "form.labels.password",
      type: "password",
      required: true,
      placeholder: "form.placeholders.password",
    },
    {
      gridSpan: 1,
      controlType: "input",
      name: "passwordConfirm",
      label: "form.labels.password_confirm",
      type: "password",
      required: true,
      placeholder: "form.placeholders.password_confirm",
    },
  ];
};

// Campos Base de Datos Personales (Comunes en Create/Update)
export const USER_BASE_FIELDS = (user: User | null = null): FormInput[] => {
  return [
    // Reutilizar campos de la biblioteca TEXT_FIELDS, o definirlos aquí si son específicos
    {
      gridSpan: 1,
      value: user && user.firstName ? user.firstName : undefined,
      controlType: "input",
      name: "firstName",
      label: "form.labels.first_name",
      type: "text",
      required: true,
      placeholder: "form.placeholders.first_name",
    },
    {
      gridSpan: 1,
      value: user && user.lastName ? user.lastName : undefined,
      controlType: "input",
      name: "lastName",
      label: "form.labels.last_name",
      type: "text",
      required: true,
      placeholder: "form.placeholders.last_name",
    },
    {
      gridSpan: 1,
      value: user && user.username ? user.username : undefined,
      controlType: "input",
      name: "username",
      label: "form.labels.username",
      type: "text",
      required: true,
      placeholder: "form.placeholders.username",
    },
    {
      gridSpan: 1,
      value: user && user.email ? user.email : undefined,
      controlType: "input",
      name: "email",
      label: "form.labels.email",
      type: "email",
      required: true,
      placeholder: "form.placeholders.email",
    },
    // Opcionales del modelo
    // { value: '', controlType: 'input', name: "fullName", label: "form.labels.full_name", type: "text", required: false, placeholder: "form.placeholders.full_name" },
    // { value: '', controlType: 'input', name: "avatarUrl", label: "form.labels.avatar_url", type: "url", required: false, placeholder: "form.placeholders.avatar_url" },
  ];
};

// Esqueletos para Campos de Selección Dinámica
export const USER_DYNAMIC_SELECTS = (
  user: User | null = null,
): Partial<FormSelect>[] => {
  return [
    {
      gridSpan: 1,
      controlType: "select",
      name: "status",
      label: "form.labels.status",
      required: true,
    },
    {
      gridSpan: 1,
      controlType: "select",
      name: "permitId",
      label: "form.labels.permit",
      required: true,
    },
  ];
};

/**
 * Asigna valores de un objeto de datos a una lista de FormInputType.
 * Mapea los valores del objeto 'data' a la propiedad 'value' de los inputs.
 * @param inputs La definición de los campos (FormInputType[]).
 * @param data El objeto con los datos a rellenar (ej: el objeto User).
 * @returns Una nueva lista de FormInputType con los valores asignados.
 */
export function mapValuesToInputs(
  inputs: FormInputType[],
  data: any,
): FormInputType[] {
  return inputs.map((input) => {
    if (data && input.name && data[input.name] !== undefined) {
      const updatedInput = { ...input };
      updatedInput.value = data[input.name];
      return updatedInput;
    }
    return input;
  });
}
