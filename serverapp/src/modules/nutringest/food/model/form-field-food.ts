import { FormInput, FormSelect } from "src/shared/types/form/form";
import { FoodItem, FoodUnit } from "src/shared/types/schema.types";

interface FoodOptions {
  categoryOptions: { label: string; value: string }[];
}

export const FOOD_BASE_FIELDS = (
  food?: FoodItem,
  options?: FoodOptions,
): (FormInput | FormSelect)[] => {
  return [
    // --- CABECERA ---
    {
      controlType: "input",
      name: "name",
      label: "common.form.food_name",
      placeholder: "Ej: Arroz Blanco Cocido",
      type: "text",
      required: true,
      value: food?.name,
      className: "",
    },
    {
      controlType: "select",
      name: "categoryId",
      label: "common.form.category",
      required: true,
      value: food?.categoryId,
      className: "",
      options: options?.categoryOptions || [], // Inyectado desde DB
    },
    {
      controlType: "input",
      name: "brand",
      label: "common.form.brand",
      placeholder: "Opcional",
      type: "text",
      required: false,
      value: food?.brand || "",
      className: "",
    },

    // --- MACROS PRINCIPALES (Fila destacada) ---
    {
      controlType: "input",
      name: "calories",
      label: "Kcal",
      placeholder: "0",
      type: "number",
      required: true,
      value: food?.calories?.toString(),
      className: "",
    },
    {
      controlType: "input",
      name: "proteins",
      label: "Prot (g)",
      placeholder: "0",
      type: "number",
      required: true,
      value: food?.proteins?.toString(),
      className: "",
    },
    {
      controlType: "input",
      name: "carbohydrates",
      label: "Carbs (g)",
      placeholder: "0",
      type: "number",
      required: true,
      value: food?.carbohydrates?.toString(),
      className: "",
    },
    {
      controlType: "input",
      name: "fats",
      label: "Grasas (g)",
      placeholder: "0",
      type: "number",
      required: true,
      value: food?.fats?.toString(),
      className: "",
    },

    // --- CONFIGURACIÓN BASE ---
    {
      controlType: "select",
      name: "baseUnit",
      label: "common.form.base_unit",
      required: true,
      value: food?.baseUnit || FoodUnit.GRAMS,
      className: "w-1/2",
      options: [
        { label: "Gramos (g)", value: FoodUnit.GRAMS },
        { label: "Mililitros (ml)", value: FoodUnit.MILLILITERS },
      ],
    },
    {
      controlType: "input",
      name: "baseQuantity",
      label: "common.form.base_quantity",
      placeholder: "100",
      type: "number",
      required: true,
      value: food?.baseQuantity?.toString() || "100",
      className: "w-1/2",
    },

    // Aquí podrías agregar más campos para micros (hierro, calcio)
    // pero suelen ir en una sección colapsable o pestaña aparte.
  ];
};
