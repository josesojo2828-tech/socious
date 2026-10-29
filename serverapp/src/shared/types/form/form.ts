// --------------------------------------------------------
// 1. INTERFAZ BASE
// --------------------------------------------------------

/**
 * Define las propiedades comunes que todo control de formulario debe tener.
 * La propiedad 'value' se hace opcional para formularios de creación.
 */
export interface FormControlBase {
  name: string;
  label: string; // Etiqueta (usualmente clave de traducción)
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  value?: string | number | boolean; // Valor actual del campo
  autoComplete?: string;

  // Propiedades de ayuda para el frontend/validación
  gridSpan?: number; // Cantidad de columnas a ocupar (UI-Agnostic, ej: 1, 2)
  className?: string; // Clases CSS legacy (evitar usar, usar gridSpan)
  errorKey?: string; // Clave del error de validación para mostrar (si existe)

  // Reglas de validación semánticas
  min?: number | string;
  max?: number | string;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

// --------------------------------------------------------
// 2. TIPOS DE CONTROL ESPECÍFICOS (Extendiendo la base)
// --------------------------------------------------------

/**
 * Define los tipos de control de formulario disponibles.
 */
export type FormControlType =
  | "input"
  | "select"
  | "checkbox"
  | "radio"
  | "textarea";

/**
 * Representa un campo de entrada de texto, número, contraseña, etc.
 */
export interface FormInput extends FormControlBase {
  controlType: "input" | "textarea" | "checkbox" | "select" | "hidden"; // CLAVE para el renderizado
  type:
    | "text"
    | "email"
    | "password"
    | "number"
    | "date"
    | "time"
    | "url"
    | "tel"
    | "color"
    | "hidden"
    | "textarea"
    | "checkbox"
    | "select";
  placeholder?: string;
  step?: number;
  options?: { label: string; value: string | number }[];
  defaultOptions?: { label: string; value: string | number };
  checked?: boolean;
}

/**
 * Representa un campo de selección desplegable.
 */
export interface FormSelect extends FormControlBase {
  controlType: "select" | "select-requets"; // CLAVE para el renderizado
  options: { label: string; value: string | number }[];
  multiple?: boolean; // Permite selección múltiple
  placeholder?: string;
  path?: string; // URL de la API para la selección
  payload?: string; // Payload de la API para la selección
}

/**
 * Representa un campo de casilla de verificación.
 */
export interface FormCheckbox extends FormControlBase {
  controlType: "checkbox"; // CLAVE para el renderizado
  // El 'value' aquí sería el valor que se envía si está marcado.
  // Si necesitas un grupo de checkboxes, usa FormSection con múltiples FormCheckbox.
}

/**
 * Representa un campo de grupo de radio buttons.
 */
export interface FormRadio extends FormControlBase {
  controlType: "radio"; // CLAVE para el renderizado
  options: { label: string; value: string | number }[]; // Las opciones para el grupo de radio
}

/**
 * Representa un área de texto grande.
 */
export interface FormTextarea extends FormControlBase {
  controlType: "textarea"; // CLAVE para el renderizado
  rows?: number; // Número de filas
  placeholder?: string;
}

/**
 * Define cualquiera de los tipos de control individuales.
 */
export type FormInputType =
  | FormInput
  | FormSelect
  | FormCheckbox
  | FormRadio
  | FormTextarea;

// --------------------------------------------------------
// 3. ESTRUCTURA DE AGRUPACIÓN (Escalabilidad)
// --------------------------------------------------------

/**
 * Permite agrupar campos relacionados visualmente bajo un título.
 */
export interface FormSection {
  title: string; // Título de la sección (ej: 'Información Personal')
  gridCols?: number; // Columnas del grid de la sección (UI-Agnostic, ej: 1, 2, 4)
  className?: string; // Clases legacy (evitar usar, usar gridCols)
  elements: FormInputType[]; // Los campos que van dentro de esta sección
}

/**
 * Un elemento en el formulario puede ser un campo simple o una sección.
 */
export type FormElement = FormInputType | FormSection;

// --------------------------------------------------------
// 4. ESTRUCTURA PRINCIPAL DEL FORMULARIO
// --------------------------------------------------------

/**
 * Interfaz principal que define todo el formulario.
 */
export interface Form {
  title: string; // Título principal del formulario
  method: "POST" | "PUT" | "PATCH"; // Añadí PATCH, común en APIs modernas
  action: string; // URL a donde se enviarán los datos

  // Los inputs ahora pueden ser elementos individuales o secciones agrupadas
  inputs: FormElement[];

  // Opcional: Para mostrar un mensaje de error global
  globalError?: string;

  // Opcional: Para el botón de envío
  submitLabel?: string;
}

// --------------------------------------------------------
// 5. ESTRUCTURA SELECT REQUETS
// --------------------------------------------------------

export type SelectRequestPayload =
  | "country"
  | "state"
  | "city"
  | "subscription"
  | "paymentMethod"
  | "myPaymentMethod"
  | "permit";

export interface SelectRequest {
  param: string;
  payload: SelectRequestPayload;
}

export interface SelectBody {
  label: string;
  value: string;
}

export interface SelectResponse {
  list: SelectBody[];
}
