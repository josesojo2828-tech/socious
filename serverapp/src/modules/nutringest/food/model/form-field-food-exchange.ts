import { FormInput, FormSelect } from "src/shared/types/form/form";
import { FoodExchangeList } from "src/shared/types/schema.types";

export const EXCHANGE_LIST_BASE_FIELDS = (
  list?: FoodExchangeList,
): (FormInput | FormSelect)[] => {
  return [
    {
      controlType: "input",
      name: "name",
      label: "common.form.name",
      placeholder: "Ej: Cereales",
      type: "text",
      required: true,
      value: list?.name,
      // width: "w-full md:w-1/2"
    },
    {
      controlType: "input",
      name: "category",
      label: "common.form.category",
      placeholder: "Ej: Carbohidratos",
      type: "text",
      required: false,
      value: list?.category || "",
      // width: "w-full md:w-1/2"
    },
    {
      controlType: "input",
      name: "sub",
      label: "Sub-Categoría",
      placeholder: "Ej: Integrales",
      type: "text",
      required: false,
      value: list?.sub || "",
      // width: "w-full md:w-1/3"
    },
    {
      controlType: "input",
      name: "unity",
      label: "Unidad Base",
      placeholder: "Ej: 1 Taza",
      type: "text",
      required: false,
      value: list?.unity || "",
      // width: "w-full md:w-1/3"
    },
    {
      controlType: "input",
      name: "calories",
      label: "Calorías",
      placeholder: "0",
      type: "number",
      required: false,
      value: list?.calories?.toString(),
      // width: "w-full md:w-1/3"
    },
  ];
};
