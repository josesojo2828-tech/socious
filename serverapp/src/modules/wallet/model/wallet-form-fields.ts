import { FormInput, FormInputType } from "src/shared/types/form/form";
import { UserWallet } from "src/shared/types/schema.types";

// Campos Base de Datos Personales (Comunes en Create/Update)
export const USER_WALLET_BASE_FIELDS = (
  wallet: UserWallet | null = null,
): FormInput[] => {
  return [
    // Reutilizar campos de la biblioteca TEXT_FIELDS, o definirlos aquí si son específicos
    // { controlType: 'input', name: "firstName", label: "form.labels.first_name", type: "text", required: true, placeholder: "form.placeholders.first_name" },
    // { value: user && user.lastName ? user.lastName : undefined, controlType: 'input', name: "lastName", label: "form.labels.last_name", type: "text", required: true, placeholder: "form.placeholders.last_name" },
    // { value: user && user.username ? user.username : undefined, controlType: 'input', name: "username", label: "form.labels.username", type: "text", required: true, placeholder: "form.placeholders.username" },
    // { value: user && user.email ? user.email : undefined, controlType: 'input', name: "email", label: "form.labels.email", type: "email", required: true, placeholder: "form.placeholders.email" },
    // Opcionales del modelo
    // { value: '', controlType: 'input', name: "fullName", label: "form.labels.full_name", type: "text", required: false, placeholder: "form.placeholders.full_name" },
    // { value: '', controlType: 'input', name: "avatarUrl", label: "form.labels.avatar_url", type: "url", required: false, placeholder: "form.placeholders.avatar_url" },
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
