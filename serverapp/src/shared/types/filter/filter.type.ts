// ================ COMMON TYPES ================
export type SelectOption = {
  label: string;
  value: string | number;
};

export interface BaseFilterOptions {
  query?: any; // Para mantener los valores seleccionados (req.query)
}

export interface FilterOption {
  label: string;
  value: string | number;
}

// ================ FILTER TYPES ================
export interface FilterField {
  type: "search" | "select" | "date" | "checkbox";
  name: string; // El nombre del query param (ej: 'q', 'status', 'role')
  label?: string; // Etiqueta visible (opcional)
  placeholder?: string;
  options?: FilterOption[]; // Solo para selects
  value?: string | number | any; // El valor actual (para mantenerlo seleccionado tras recargar)
  width?: string; // Clase para el ancho (ej: 'col-span-2')
}

export interface FilterConfig {
  action: string; // URL a donde se envia el filtro (ej: /users)
  fields: FilterField[];
}

// ======================================
// PAYMENT METHOD (Métodos del Sistema)
// ======================================
export interface PaymentMethodFilterOptions extends BaseFilterOptions {
  // Filtrar por si está activo o inactivo
  statusOptions?: SelectOption[];
}

// ======================================
// USER PAYMENT METHOD (Métodos del Usuario)
// ======================================
export interface UserPaymentMethodFilterOptions extends BaseFilterOptions {
  // Filtrar por el "tipo" base (Ej: Todos los que tengan Visa, o PayPal)
  // Se llena consultando el modelo 'PaymentMethod'
  methodTypeOptions?: SelectOption[];

  // Filtrar por estado (Active / Inactive)
  statusOptions?: SelectOption[];
}

// ======================================
// USER ADDRESS
// ======================================
export interface UserAddressFilterOptions extends BaseFilterOptions {
  // Enum: HOME, OFFICE, etc.
  typeOptions?: SelectOption[];

  // Lista de países disponibles o existentes en la DB
  countryOptions?: SelectOption[];
}

// ======================================
// SUBSCRIPTION PLAN
// ======================================
export interface SubscriptionPlanFilterOptions extends BaseFilterOptions {
  // Filtrar por moneda (USD, EUR, etc.) si manejas múltiples
  currencyOptions?: SelectOption[];

  // Filtrar por si está visible/seleccionable
  statusOptions?: SelectOption[];
}

// ======================================
// SUBSCRIPTION (Suscripciones de Usuarios)
// ======================================
export interface SubscriptionFilterOptions extends BaseFilterOptions {
  // Enum: ACTIVE, CANCELED, EXPIRED...
  statusOptions?: SelectOption[];

  // Filtrar por qué plan tienen (Se llena consultando 'SubscriptionPlan')
  planOptions?: SelectOption[];

  // Filtrar por booleano (Auto renovación activada/desactivada)
  autoRenewOptions?: SelectOption[];
}

// ======================================
// USER WALLET
// ======================================
export interface UserWalletFilterOptions extends BaseFilterOptions {
  // Principalmente filtrar por tipo de moneda
  currencyOptions?: SelectOption[];
}

// ======================================
// TRANSACTION
// ======================================
export interface TransactionFilterOptions extends BaseFilterOptions {
  // Enum: DEPOSIT, WITHDRAW, PAYMENT...
  typeOptions?: SelectOption[];

  // Enum: PENDING, SUCCESS, FAILED...
  statusOptions?: SelectOption[];

  // Filtrar por método de pago usado (Se llena con 'PaymentMethod')
  paymentMethodOptions?: SelectOption[];
}

// ======================================
// USER
// ======================================
export interface UserFilterOptions {
  statusOptions?: { label: string; value: string }[];
  permitOptions?: { label: string; value: string }[];
  query?: any; // Recibimos el @Query() del controlador para persistir los valores
}

export interface NotificationFilterOptions {
  typeOptions?: { label: string; value: string }[];
  read?: { label: string; value: string }[];
  query?: any; // Recibimos el @Query() del controlador para persistir los valores
}
