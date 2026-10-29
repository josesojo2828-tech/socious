import {
  FormInputType, // Usamos el tipo unión para el retorno
  FormSelect,
} from "src/shared/types/form/form";
import {
  ExchangeList,
  ExchangeListItem,
  Menu,
  Patient,
} from "src/shared/types/schema.types";

// =========================================================
// 3. FORMULARIO LISTA DE INTERCAMBIO (Cabecera)
// =========================================================

export const EXCHANGE_LIST_BASE_FIELDS = (
  list?: ExchangeList,
): FormInputType[] => {
  return [
    {
      controlType: "input",
      name: "name",
      label: "exchange.form.name",
      placeholder: "exchange.form.name_placeholder",
      type: "text",
      required: true,
      value: list?.name,
      className: "w-full",
    },
    {
      controlType: "textarea",
      name: "description",
      label: "exchange.form.description",
      placeholder: "exchange.form.description_placeholder",
      rows: 2,
      required: false,
      value: list?.description || "",
      className: "w-full",
    },
  ];
};

// =========================================================
// 4. FORMULARIO ÍTEM LISTA DE INTERCAMBIO
// =========================================================

export const EXCHANGE_ITEM_FIELDS = (
  item?: ExchangeListItem,
): FormInputType[] => {
  return [
    {
      controlType: "select",
      name: "foodId",
      label: "exchange.item.food",
      placeholder: "exchange.item.food_placeholder",
      required: true,
      value: item?.foodId,
      className: "w-full md:w-1/2",
      options: [],
    },
    {
      controlType: "input",
      name: "amount",
      label: "exchange.item.amount", // "Cantidad para 1 intercambio"
      placeholder: "exchange.item.amount_placeholder",
      type: "number",
      required: true,
      value: item?.amount ? Number(item.amount) : undefined,
      className: "w-full md:w-1/4",
    },
    {
      controlType: "input",
      name: "servingLabel",
      label: "exchange.item.label", // "Medida casera"
      placeholder: "exchange.item.label_placeholder",
      type: "text",
      required: false,
      value: item?.servingLabel || "",
      className: "w-full md:w-1/4",
    },
  ];
};
