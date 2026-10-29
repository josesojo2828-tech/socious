import { FormInputType } from "src/shared/types/form/form";
import { ShoppingList } from "src/shared/types/schema.types";

export const SHOPPING_LIST_FIELDS = (list?: ShoppingList): FormInputType[] => {
  return [
    {
      controlType: "input",
      type: "text",
      name: "name",
      label: "shopping.form.name",
      placeholder: "Ej: Lista Semana 1",
      required: true,
      value: list?.name,
      className: "w-full",
    },
    // Nota: Los items de la lista de compras usualmente se generan automáticamente
    // desde el plan, pero permitimos edición manual JSON si es necesario.
    {
      controlType: "textarea",
      name: "itemsJson",
      label: "shopping.form.items_json",
      placeholder: '{"Manzanas": "1kg", "Pollo": "500g"}',
      rows: 6,
      required: true,
      value: list?.items ? JSON.stringify(list.items, null, 2) : "{}",
      className: "w-full font-mono text-xs",
    },
  ];
};
