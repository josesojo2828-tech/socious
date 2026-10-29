// Estados de la consulta
export enum ConsultationStatus {
  SCHEDULED = "SCHEDULED",
  COMPLETED = "COMPLETED",
  CANCELED = "CANCELED",
  NO_SHOW = "NO_SHOW",
}

// Tipos de consulta
export enum ConsultationType {
  FIRST_TIME = "FIRST_TIME",
  FOLLOW_UP = "FOLLOW_UP",
  EMERGENCY = "EMERGENCY",
}

// Opciones para el Select del Frontend (Labels traducibles o directos)
export const CONSULTATION_STATUS_OPTIONS = [
  { label: "Agendada", value: ConsultationStatus.SCHEDULED },
  { label: "Completada", value: ConsultationStatus.COMPLETED },
  { label: "Cancelada", value: ConsultationStatus.CANCELED },
  { label: "No Asistió", value: ConsultationStatus.NO_SHOW },
];

export const CONSULTATION_TYPE_OPTIONS = [
  { label: "Primera Vez", value: ConsultationType.FIRST_TIME },
  { label: "Control / Seguimiento", value: ConsultationType.FOLLOW_UP },
  { label: "Emergencia", value: ConsultationType.EMERGENCY },
];

export enum UserRole {
  ADMIN = "ADMIN",
  USER = "USER",
  PATIENT = "PATIENT",
}

export enum UserStatus {
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  DELETED = "DELETED",
}

export enum SubscriptionStatus {
  ACTIVE = "ACTIVE",
  CANCELED = "CANCELED",
  DECLINED = "DECLINED",
  EXPIRED = "EXPIRED",
  NEXT = "NEXT",
}

export enum VerificationStatus {
  UNVERIFIED = "UNVERIFIED",
  PENDING = "PENDING",
  VERIFIED = "VERIFIED",
  REJECTED = "REJECTED",
}

export enum TransactionType {
  DEPOSIT = "DEPOSIT",
  WITHDRAW = "WITHDRAW",
  PAYMENT = "PAYMENT",
  REFUND = "REFUND",
}

export enum NotificationType {
  INFO = "INFO",
  SUCCESS = "SUCCESS",
  WARNING = "WARNING",
  ERROR = "ERROR",
}

export type TransactionStatus = "PENDING" | "SUCCESS" | "FAILED" | "CANCELED";

export enum FileType {
  IMAGE = "IMAGE",
  DOCUMENT = "DOCUMENT",
  REPORT = "REPORT",
  RECEIPT = "RECEIPT",
  OTHER = "OTHER",
}

export enum FileStorage {
  LOCAL = "LOCAL",
  S3 = "S3",
  SUPABASE = "SUPABASE",
  GCS = "GCS",
}

export enum FileVisibility {
  PUBLIC = "PUBLIC",
  PRIVATE = "PRIVATE",
  PROTECTED = "PROTECTED",
}

export enum AddressType {
  HOME = "HOME",
  OFFICE = "OFFICE",
  BILLING = "BILLING",
  SHIPPING = "SHIPPING",
  OTHER = "OTHER",
}

// Interfaces
export interface User {
  id: string;
  firstName: string; // Added from schema
  lastName: string; // Added from schema
  email: string;
  username: string;
  password: string; // Usually excluded from DTOs/interfaces unless needed for creation
  fullName?: string | null; // Made nullable
  avatarUrl?: string | null; // Made nullable
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;

  // Security
  permitId: string;
  permits: Permit; // Corrected to single object based on relation
  emailVerifiedAt?: Date | null;
  hashedRefreshToken?: string | null;
  emailVerificationToken?: string | null;
  emailVerificationExpiresAt?: Date | null;
  failedLoginAttempts?: number;
  lockedUntil?: Date | null;

  profile?: File | null;

  referredById: string;
  referredBy: User;
  referralCode: string;
  referrals: User[];

  // Relations
  wallet: UserWallet | null;
  subscriptions?: Subscription[];
  transactions?: Transaction[];
  sessions?: UserSession[];
  activityLogs?: UserActivityLog[];
  files?: File[];
  addresses?: UserAddress[]; // Added relation
  paymentMethods?: IUserPaymentMethod[]; // Corrected type

  // Community Permissions (overrides)
  userPermissions?: UserPermission[];

  // Organization membership
  organizationMembers?: any[];

  // Perfil Profesional (Si es Nutricionista)
  nutritionistProfile?: Nutritionist | null;

  // Perfil de Paciente (Si es Paciente)
  patientProfiles?: Patient[];
}

export interface IPaymentMethod {
  // Renamed to avoid conflict with model name
  id: string;
  name: string;
  code: string;
  description: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;

  colorStart: string;
  colorEnd: string;
  colorText: string;
  imagePath: string;

  fields: any;

  // Relations
  userMethods?: IUserPaymentMethod[]; // Renamed type
}

export interface IUserPaymentMethod {
  // Renamed to avoid conflict with model name
  id: string;
  userId: string;
  paymentMethodId: string;
  details?: any; // Json -> any or a specific interface
  isDefault: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;

  // Relations
  user?: User; // Added relation
  paymentMethod?: IPaymentMethod; // Added relation, renamed type
}

export interface Permit {
  id: string;
  name: string;
  description?: string; // Made optional to match schema
  list: string[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;

  // Relations
  users?: User[]; // Added relation
}

export interface UserSession {
  id: string;
  userId: string;
  ipAddress?: string | null; // Made nullable
  userAgent?: string | null; // Made nullable
  device?: string | null; // Made nullable
  location?: string | null; // Made nullable
  startedAt: Date;
  endedAt?: Date | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;

  // Relations
  user?: User; // Added relation
}

export interface File {
  id: string;
  name: string;
  originalName?: string;
  type: FileType;
  mimeType?: string;
  size?: number;
  path: string;
  storage: FileStorage;
  visibility: FileVisibility;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;

  uploadedById?: string;
  uploadedBy?: User | null; // Added relation

  entityId?: string;
  entityType?: string;
}

export interface Subscription {
  id: string;
  userId: string;
  organizationId?: string | null;
  planId: string;
  startDate: Date;
  endDate?: Date | null;
  status: SubscriptionStatus;
  autoRenew: boolean;

  // Cancellation cascade fields
  gracePeriodEndsAt?: Date | null;
  readOnlyEndsAt?: Date | null;
  canceledAt?: Date | null;
  lastPlanChangeAt?: Date | null;

  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;

  // Relations
  plan: SubscriptionPlan;
  user: User;
  organization?: any | null;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  price: number; // Decimal in Prisma → number in TS
  currency: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  content: any;

  // Relations
  subscriptions?: Subscription[]; // Added relation
}

export interface UserAddress {
  // Renamed to avoid conflict
  id: string;
  userId: string;
  label: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  type: AddressType;
  isDefault: boolean;

  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;

  // Relations
  user?: User; // Added relation
}

export interface Transaction {
  id: string;
  userId: string;
  paymentMethodId: string;
  type: TransactionType;
  amount: number; // Decimal in Prisma → number in TS
  description?: string;
  status: TransactionStatus;
  referenceCode?: string | null; // Made optional to match schema
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;

  // Relations
  user?: User; // Added relation
  paymentMethod?: IUserPaymentMethod; // Added relation
}

export interface Notification {
  id: string;

  title: string;
  message: string;
  type: NotificationType;
  read: boolean;

  // Metadatos para redirección (ej: clic y te lleva a la suscripción)
  entityId: string;
  entityType: string;

  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  userId: string;
  user: User;
}

export interface UserWallet {
  id: string;
  userId: string;
  balance: number; // Decimal -> number
  currency: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;

  // Relations
  user?: User; // Added relation
  transactions?: Transaction[]; // Added relation
}

export type UserUniqueTabs =
  | "transacciones"
  | "paymentMethod"
  | "subscription"
  | "address"
  | "reference"
  | "activity";

export interface UserActivityLog {
  id: string;
  userId: string;
  action: string;
  description?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;

  user?: User;
}

// ==========================================
// ENUMS (Manuales, sin depender de Prisma)
// ==========================================

export enum Gender {
  MALE = "MALE",
  FEMALE = "FEMALE",
  OTHER = "OTHER",
}

export enum ActivityLevel {
  SEDENTARY = "SEDENTARY",
  LIGHTLY_ACTIVE = "LIGHTLY_ACTIVE",
  MODERATELY_ACTIVE = "MODERATELY_ACTIVE",
  VERY_ACTIVE = "VERY_ACTIVE",
  EXTRA_ACTIVE = "EXTRA_ACTIVE",
}

export enum FoodUnit {
  GRAMS = "GRAMS",
  MILLILITERS = "MILLILITERS",
}

export enum PriceUnit {
  KG = "KG",
  LITER = "LITER",
  UNIT = "UNIT",
  PORTION = "PORTION",
}

export enum DietStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  ARCHIVED = "ARCHIVED",
}
// ==========================================
// MÓDULO ANTROPOMETRÍA
// ==========================================

export interface AnthropometricAssessment {
  id: string;
  patientId: string;
  createdBy?: { id: string; firstName: string; lastName: string; username: string; email: string } | null;
  date: Date | string;

  // Básicos
  weight: number;
  height: number;
  bmi?: number | null;

  // Pliegues
  tricipital?: number | null;
  bicipital?: number | null;
  subscapular?: number | null;
  suprailiac?: number | null;

  // Circunferencias
  waist?: number | null;
  hip?: number | null;
  arm?: number | null;

  // Composición
  fatPercentage?: number | null;
  musclePercentage?: number | null;
  visceralFat?: number | null;

  notes?: string | null;
}

// ==========================================
// MÓDULO ALIMENTOS (FOOD DB)
// ==========================================

export interface FoodExchangeList {
  id: string;
  name: string;
  category: string;
  sub: string;
  unity: string;
  /** Gramos o cc de la medida práctica. `null` cuando la fuente no lo define. */
  grams: number | null;
  calories: number;
  createdBy?: string;
  exchange?: any;

  _count: {
    exchange: number;
  };
}

export interface FoodItem {
  id: string;
  createdById?: string | null;
  createdBy?: { id: string; firstName: string; lastName: string; username: string; email: string } | null;
  categoryId: string;
  code?: number | null;
  name: string;
  brand?: string | null;

  // Base
  baseUnit: FoodUnit;
  baseQuantity: number;

  // Macros
  calories: number;
  proteins: number;
  carbohydrates: number;
  fats: number;

  // Detalles
  humidity: number;
  fiberTotal: number;
  fiberInsoluble: number;
  sugar?: number | null;

  // Minerales
  calcium: number;
  iron: number;
  magnesium: number;
  zinc: number;
  copper: number;
  sodium: number;
  phosphorus: number;
  potassium: number;

  // Vitaminas
  vitaminA: number;
  thiamin: number;
  riboflavin: number;
  niacin: number;
  vitaminB6: number;
  ascorbicAcid: number;

  isActive: boolean;

  // Costeo y Precios
  currentPrice?: number | null;
  priceUnit?: PriceUnit;
  lastPriceSync?: Date | null;
  wasteFactor?: number;

  // Relaciones
  portions?: FoodPortion[];
}

export interface FoodPortion {
  id: string;
  foodId: string;
  name: string; // Ej: "Taza"
  gramWeight: number; // Ej: 200

  food?: FoodItem;
}

// ==========================================
// MÓDULO MENÚS Y HERRAMIENTAS
// ==========================================

// =========================================================
// ENUMS & DEPENDENCIAS (Placeholders)
// =========================================================

export enum MenuCategory {
  BREAKFAST = "BREAKFAST",
  MORNING_SNACK = "MORNING_SNACK",
  LUNCH = "LUNCH",
  SNACK = "SNACK",
  DINNER = "DINNER",
  PRE_WORKOUT = "PRE_WORKOUT",
  POST_WORKOUT = "POST_WORKOUT",
  OTHER = "OTHER",
}

export interface Menu {
  id: string;
  nutritionistId: string;
  createdBy?: { id: string; firstName: string; lastName: string; username: string; email: string } | null;

  name: string;
  description: string | null;

  // Totales cacheados
  totalKcal: number | null;
  totalProtein: number | null;
  totalCarbs: number | null;
  totalFats: number | null;

  category: MenuCategory | null;
  tags: string;
  imageUrl?: string | null;
  prepTime?: number | null;
  difficulty?: string | null;
  importedFromId?: string | null;
  importedFrom?: any;

  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date | null;
  deletedAt?: Date | null;

  // Relaciones
  nutritionist?: User;
  items?: MenuItem[];
  condiments?: MenuCondiment[];

  // Conteos de Prisma
  _count?: {
    items: number;
  };
}

export interface MenuItem {
  id: string;
  menuId: string;
  foodId: string;

  quantity: number;
  unit: string | null;
  portionLabel: string | null;

  // Relaciones
  menu?: Menu;
  food?: FoodItem;
}

export interface Condiment {
  id: string;
  name: string;
  isActive: boolean;

  // Relaciones
  menuItems?: MenuCondiment[];
}

export interface MenuCondiment {
  id: string;
  menuId: string;
  condimentId: string;

  quantity: number | null;
  unit: string | null;

  // Relaciones
  menu?: Menu;
  condiment?: Condiment;
}

// =========================================================
// MÓDULO LISTAS DE INTERCAMBIO
// =========================================================

export interface ExchangeList {
  id: string;
  nutritionistId: string | null;
  createdBy?: { id: string; firstName: string; lastName: string; username: string; email: string } | null;

  name: string;
  description: string | null;

  // Patrón de intercambio
  baseKcal: number;
  baseCarbs: number | null;
  baseProtein: number | null;
  baseFat: number | null;

  createdAt?: Date;
  updatedAt?: Date;
  archivedAt?: Date | null;
  deletedAt?: Date | null;

  // Relaciones
  nutritionist?: User | null;
  items?: ExchangeListItem[];

  // Conteos de Prisma
  _count?: {
    items: number;
  };
}

export interface ExchangeListItem {
  id: string;
  exchangeListId: string;
  foodId: string;

  amount: number;
  servingLabel: string | null;
  groupLabel?: string | null;
  cookingState?: string | null;

  // Relaciones
  exchangeList?: ExchangeList;
  food?: FoodItem;
}

// ==========================================
// COMUNIDAD PREMIUM
// ==========================================

export interface CommunityMetadata {
  id: string;
  entityType: string;
  entityId: string;
  authorId: string;
  tags: string[];
  importCount: number;
  publishedAt: Date;

  author?: User;
}

export interface UserPermission {
  id: string;
  userId: string;
  permission: string;
  grantedAt: Date;
  expiresAt: Date | null;

  user?: User;
}

// ==========================================
// MÓDULO PLAN ALIMENTICIO (DIETA)
// ==========================================

export interface DietPlan {
  id: string;
  patientId: string;
  createdBy?: { id: string; firstName: string; lastName: string; username: string; email: string } | null;
  name: string;
  startDate: Date | string;
  endDate?: Date | string | null;
  status: DietStatus;

  totalKcal?: number | null;
  macroSplit?: any | null; // JSON { protein: 30, carbs: 40... }

  createdAt: Date | string;
  updatedAt: Date | string;

  // Relaciones
  patient?: Patient;
  days?: DietDay[];
}

export interface DietDay {
  id: string;
  dietPlanId: string;
  name: string; // "Lunes"
  order: number;

  meals?: DietMeal[];
}

export interface DietMeal {
  id: string;
  dietDayId: string;
  name: string; // "Desayuno"
  time?: string | null;
  order: number;

  foods?: DietFood[];
}

export interface DietFood {
  id: string;
  dietMealId: string;
  foodId: string;

  quantity: number;
  portionName: string;
  calculatedGrams: number;

  food?: FoodItem;
}

export interface DietPlanTemplate {
  id: string;
  nutritionistId: string;
  createdBy?: { id: string; firstName: string; lastName: string; username: string; email: string } | null;
  name: string;
  description?: string | null;
  data: any; // JSON con la estructura completa del plan
}

// ==========================================
// MÓDULO EXTRAS
// ==========================================

export interface ShoppingList {
  id: string;
  patientId: string;
  createdBy?: { id: string; firstName: string; lastName: string; username: string; email: string } | null;
  name: string;
  items: any; // JSON Array de strings u objetos
  createdAt: Date | string;
}

// Tipos auxiliares para no importar todo el modelo de paciente aquí
export interface PatientSimple {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  avatarUrl?: string | null;
}

// Interfaz pura de Consulta
export interface Consultation {
  id: string;
  patientId: string;
  nutritionistId: string;
  createdBy?: { id: string; firstName: string; lastName: string; username: string; email: string } | null;

  scheduledAt: Date;
  status: ConsultationStatus;
  type: ConsultationType;

  reason?: string | null;
  notes?: string | null;

  // Relaciones (Opcionales dependiendo del include)
  patient?: PatientSimple;

  // IDs de snapshots
  anthropometryId?: string | null;
  planId?: string | null;

  createdAt: Date;
  // updatedAt no está en tu modelo actual de Consultation, pero es buena práctica
}

// Interfaz para la respuesta paginada
export interface ConsultationPaginated {
  list: Consultation[];
  total: number;
  page: number;
  limit: number;
}

export interface Nutritionist {
  id: string;
  userId: string;
  user: User;
  licenseCode?: string | null;
  specialty?: string | null;

  // Legal Accreditation fields
  universityDegree?: string | null;
  graduationYear?: number | null;
  mppsCode?: string | null;
  cndvCode?: string | null;
  cndvState?: string | null;
  identityCard?: string | null;
  degreeFileUrl?: string | null;
  licenseFileUrl?: string | null;

  verificationStatus: VerificationStatus;
  verifiedAt?: Date | null;
  rejectionReason?: string | null;

  consultations: Consultation[];
  menus: Menu[];
  exchangeLists: ExchangeList[];
  dietTemplates: DietPlanTemplate[];
  _count?: {
    consultations?: number;
  };
}

export interface Patient {
  id: string;
  userId?: string | null;
  createdBy?: { id: string; firstName: string; lastName: string; username: string; email: string } | null;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  gender: Gender;
  birthDate: Date;
  occupation?: string | null;
  activityLevel: ActivityLevel;
  // anamnesis?: Anamnesis | null;
  medicalHistory?: any | null;
  consultations: Consultation[];
  // anthropometrics: Anthropometry[];
  // labResults: LabResult[];
  // goals: Goal[];
  // plans: NutritionalPlan[];
  shoppingLists: ShoppingList[];
  dietPlans: DietPlan[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  nutritionist: Nutritionist;
  user?: User | null;
}
