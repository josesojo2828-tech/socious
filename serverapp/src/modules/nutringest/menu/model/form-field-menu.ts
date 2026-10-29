import {
  FormInputType, // Usamos el tipo unión para el retorno
  FormSelect,
} from "src/shared/types/form/form";
import {
  Menu,
  MenuCategory,
  ExchangeList,
  MenuItem,
  ExchangeListItem,
} from "src/shared/types/schema.types"; // Ajusta la ruta a tus tipos de Prisma

// =========================================================
// 1. FORMULARIO DE MENÚ (Cabecera)
// =========================================================

export const MENU_BASE_FIELDS = (menu?: Menu): FormInputType[] => {
  return [
    // --- Sección Principal ---
    {
      controlType: "input",
      name: "name",
      label: "menu.form.name", // Ej: "Desayuno Proteico"
      placeholder: "menu.placeholders.name",
      type: "text",
      required: true,
      value: menu?.name,
      className: "w-full",
    },
    {
      controlType: "select",
      name: "category",
      label: "menu.form.category",
      required: true,
      value: menu?.category || MenuCategory.OTHER,
      className: "w-full",
      options: [
        { label: "menu.category.breakfast", value: MenuCategory.BREAKFAST },
        { label: "menu.category.morning_snack", value: MenuCategory.MORNING_SNACK },
        { label: "menu.category.lunch", value: MenuCategory.LUNCH },
        { label: "menu.category.snack", value: MenuCategory.SNACK },
        { label: "menu.category.dinner", value: MenuCategory.DINNER },
        { label: "menu.category.pre_workout", value: MenuCategory.PRE_WORKOUT },
        { label: "menu.category.post_workout", value: MenuCategory.POST_WORKOUT },
        { label: "menu.category.other", value: MenuCategory.OTHER },
      ],
    },
    {
      controlType: "input",
      name: "prepTime",
      label: "menu.form.prep_time",
      placeholder: "menu.placeholders.prep_time",
      type: "number",
      min: 0,
      required: false,
      value: menu?.prepTime != null ? Number(menu.prepTime) : undefined,
      className: "w-full",
    },
    {
      controlType: "select",
      name: "difficulty",
      label: "menu.form.difficulty",
      required: false,
      value: menu?.difficulty || "Media",
      className: "w-full",
      options: [
        { label: "menu.difficulty.easy", value: "Fácil" },
        { label: "menu.difficulty.medium", value: "Media" },
        { label: "menu.difficulty.hard", value: "Difícil" },
      ],
    },

    // --- Descripción ---
    {
      controlType: "textarea", // Usando tu interfaz FormTextarea
      name: "description",
      label: "menu.form.description",
      placeholder: "menu.placeholders.description",
      rows: 3,
      required: false,
      value: menu?.description || "",
      className: "w-full col-span-1 md:col-span-2",
    },

    // --- Etiquetas (Tags) ---
    // Como es un array de strings, lo manejamos como texto separado por comas por ahora
    {
      controlType: "input",
      name: "tags",
      label: "menu.form.tags",
      placeholder: "menu.placeholders.tags",
      type: "text",
      required: false,
      value: menu?.tags ? menu?.tags : "",
      className: "w-full col-span-1 md:col-span-2",
    },
  ];
};

// =========================================================
// 2. FORMULARIO DE MENÚ ITEM (Para agregar un alimento al menú)
// =========================================================
// Úsalo si abres un Modal para "Agregar Ingrediente"

export const MENU_ITEM_FIELDS = (item?: MenuItem): FormInputType[] => {
  return [
    {
      // Asumiendo que cargarás la lista de alimentos vía API o props
      controlType: "select",
      name: "foodId",
      label: "menu.item.food",
      placeholder: "Selecciona un alimento",
      required: true,
      value: item?.foodId,
      className: "w-full",
      options: [], // Aquí deberías inyectar tus alimentos o usar 'select-requets' si agregas 'food' al payload
    },
    {
      controlType: "input",
      name: "quantity",
      label: "menu.item.quantity",
      placeholder: "Ej: 100",
      type: "number",
      min: 0,
      required: true,
      value: item?.quantity ? Number(item.quantity) : undefined,
      className: "w-full md:w-1/3",
    },
    {
      controlType: "input",
      name: "unit",
      label: "menu.item.unit",
      placeholder: "g, ml, pza",
      type: "text", // O podría ser un select si tienes unidades fijas
      required: false, // Opcional si asumes gramos por defecto
      value: item?.unit || "g",
      className: "w-full md:w-1/3",
    },
    {
      controlType: "input",
      name: "portionLabel",
      label: "menu.item.portion_label",
      placeholder: "Ej: 1 taza",
      type: "text",
      required: false,
      value: item?.portionLabel || "",
      className: "w-full md:w-1/3",
    },
  ];
};

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
      placeholder: "exchange.name_placeholder",
      type: "text",
      required: true,
      value: list?.name,
      className: "w-full",
    },
    {
      controlType: "textarea",
      name: "description",
      label: "exchange.form.description",
      placeholder: "exchange.description_placeholder",
      rows: 2,
      required: false,
      value: list?.description || "",
      className: "w-full",
    },

    // --- MACROS PATRÓN (Visualmente agrupados) ---
    // Aquí definimos qué significa "1 Intercambio" de esta lista
    {
      controlType: "input",
      name: "baseKcal",
      label: "exchange.form.base_kcal",
      type: "number",
      required: true,
      value: list?.baseKcal,
      className: "w-full md:w-1/4",
    },
    {
      controlType: "input",
      name: "baseCarbs",
      label: "exchange.form.base_carbs",
      type: "number",
      required: false,
      value: list?.baseCarbs ? Number(list.baseCarbs) : 0,
      className: "w-full md:w-1/4",
    },
    {
      controlType: "input",
      name: "baseProtein",
      label: "exchange.form.base_protein",
      type: "number",
      required: false,
      value: list?.baseProtein ? Number(list.baseProtein) : 0,
      className: "w-full md:w-1/4",
    },
    {
      controlType: "input",
      name: "baseFat",
      label: "exchange.form.base_fat",
      type: "number",
      required: false,
      value: list?.baseFat ? Number(list.baseFat) : 0,
      className: "w-full md:w-1/4",
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
      placeholder: "Buscar alimento...",
      required: true,
      value: item?.foodId,
      className: "w-full md:w-1/2",
      options: [],
    },
    {
      controlType: "input",
      name: "amount",
      label: "exchange.item.amount", // "Cantidad para 1 intercambio"
      placeholder: "Ej: 30",
      type: "number",
      required: true,
      value: item?.amount ? Number(item.amount) : undefined,
      className: "w-full md:w-1/4",
    },
    {
      controlType: "input",
      name: "servingLabel",
      label: "exchange.item.label", // "Medida casera"
      placeholder: "Ej: 1 rebanada",
      type: "text",
      required: false,
      value: item?.servingLabel || "",
      className: "w-full md:w-1/4",
    },
  ];
};
