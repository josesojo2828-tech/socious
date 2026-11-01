
export type PermitName =
  | "SUPERADMIN"
  | "ADMIN"
  | "USER"
  | "PATIENT"
  | "CLINIC"
  | "CLINIC_ADMIN"
  | "CLINIC_STAFF";

export enum UserStatus {
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  DELETED = "DELETED",
}

export enum SubscriptionStatus {
  ACTIVE = "ACTIVE",
  CANCELED = "CANCELED",
  EXPIRED = "EXPIRED",
  NEXT = "NEXT",
  DECLINED = "DECLINED",
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
  HOME = 'HOME',
  OFFICE = 'OFFICE',
  BILLING = 'BILLING',
  SHIPPING = 'SHIPPING',
  OTHER = 'OTHER',
}


// ==========================================
// ENUMS (Manuales, sin depender de Prisma)
// ==========================================

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export enum ActivityLevel {
  SEDENTARY = 'SEDENTARY',
  LIGHTLY_ACTIVE = 'LIGHTLY_ACTIVE',
  MODERATELY_ACTIVE = 'MODERATELY_ACTIVE',
  VERY_ACTIVE = 'VERY_ACTIVE',
  EXTRA_ACTIVE = 'EXTRA_ACTIVE',
}

export enum FoodUnit {
  GRAMS = 'GRAMS',
  MILLILITERS = 'MILLILITERS',
}

export enum DietStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum ConsultationStatus {
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  SCHEDULED = 'SCHEDULED',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED',
  NO_SHOW = 'NO_SHOW',
}

// Interfaces
export interface User {
  id: string;
  firstName: string; // Added from schema
  lastName: string;  // Added from schema
  email: string;
  username: string;
  password: string; // Usually excluded from DTOs/interfaces unless needed for creation
  fullName?: string | null; // Made nullable
  avatarUrl?: string | null; // Made nullable
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  nutritionistProfile?: Nutritionist | null;
  patientProfiles?: Patient[];

  // Security
  permitId: string;
  permits: Permit; // Corrected to single object based on relation
  userPermissions?: {
    id: string;
    permission: string;
    expiresAt?: string | null;
  }[] | null;

  profile?: File | null;

  referredById: string;
  referredBy: User;
  referralCode: string;
  referrals: User[];

  // Email verification
  emailVerifiedAt?: string | null;
  emailVerificationToken?: string | null;
  resetPasswordToken?: string | null;
  resetPasswordExpiresAt?: string | null;

  // Forced password change
  mustChangePassword?: boolean;

  // Relations
  wallet: UserWallet | null;
  subscriptions?: Subscription[];
  transactions?: Transaction[];
  sessions?: UserSession[];
  activityLogs?: UserActivityLog[];
  files?: File[];
  addresses?: UserAddress[]; // Added relation
  paymentMethods?: IUserPaymentMethod[]; // Corrected type
}

export interface IPaymentMethod { // Renamed to avoid conflict with model name
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

  // Relations
  userMethods?: IUserPaymentMethod[]; // Renamed type
}

export interface IUserPaymentMethod { // Renamed to avoid conflict with model name
  id: string;
  userId: string;
  paymentMethodId: string;
  details?: unknown; // Json -> unknown
  isDefault: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;

  // Relations
  user?: User;              // Added relation
  paymentMethod: IPaymentMethod; // Added relation, renamed type
}

export interface Permit {
  id: string;
  name: string;
  description?: string;
  list: string[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;

  // Relations
  users?: User[];
  _count?: { users?: number };
}

export interface UserSession {
  id: string;
  userId: string;
  ipAddress?: string | null; // Made nullable
  userAgent?: string | null; // Made nullable
  device?: string | null;    // Made nullable
  location?: string | null;  // Made nullable
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
  planId: string;
  organizationId?: string | null;
  startDate: Date;
  endDate?: Date | null;
  status: SubscriptionStatus;
  autoRenew: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;

  // Relations
  plan: SubscriptionPlan; // Added relation
  user: User;             // Added relation
}

/**
 * Canonical `SubscriptionPlan.content` shape (mirrors the backend
 * `NormalizedSubscriptionPlanContent`). Legacy plans may still persist the old
 * `string[]` bullets, so consumers MUST normalize via `normalizePlanContent`
 * (`@/shared/authz`) before reading.
 */
export interface SubscriptionPlanContent {
  /** Human-readable feature bullets (legacy `content`). */
  features: string[];
  /** Machine permission keys granted by the plan. */
  grants: string[];
  /** Module keys unlocked by the plan (sidebar/route registry). */
  modules: string[];
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  price: number; // Decimal in Prisma → number in TS
  currency: string;
  selected: boolean;
  badge?: string | null;
  featured?: boolean;
  colorTheme?: { bg: string; text: string; accent: string; badge: string } | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  content: SubscriptionPlanContent;

  // Relations
  subscriptions?: Subscription[]; // Added relation
}

export interface UserAddress { // Renamed to avoid conflict
  id: string;
  userId: string;
  label: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  latitude: number
  longitude: number
  type: AddressType
  isDefault: boolean

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
  user?: User;      // Added relation
  paymentMethod?: IUserPaymentMethod; // Added relation
}

export interface Notification {
  id: string;

  title: string;
  message: string;
  type: NotificationType;
  read: boolean

  // Metadatos para redirección (ej: clic y te lleva a la suscripción)
  entityId: string
  entityType: string

  createdAt: Date
  updatedAt: Date
  deletedAt?: Date | null
  userId: string
  user: User
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
  user?: User;              // Added relation
  transactions?: Transaction[]; // Added relation
}

export type UserUniqueTabs = 'transacciones' | 'paymentMethod' | 'subscription' | 'address' | 'reference';

export interface UserActivityLog {
  id: string;
  userId: string;
  action: string;
  description?: string | null; // Made nullable
  ipAddress?: string | null;   // Made nullable
  userAgent?: string | null;   // Made nullable
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;

  // Relations
  user?: User; // Added relation
}

export interface UserActivityLog {
  id: string;
  userId: string;
  action: string;
  description?: string | null; // Made nullable
  ipAddress?: string | null;   // Made nullable
  userAgent?: string | null;   // Made nullable
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;

  // Relations
  user?: User; // Added relation
}



// ==========================================
// MÓDULO NUTRICIONISTA
// ==========================================

export interface Nutritionist {
  id: string;
  userId: string;
  licenseCode?: string | null;
  specialty?: string | null;
  mppsCode?: string | null;
  cndvCode?: string | null;
  bio?: string | null;
  isPublic?: boolean;
  universityDegree?: string | null;
  lat?: number | null;
  lng?: number | null;

  createdAt?: Date | string;
  updatedAt?: Date | string;
  deletedAt?: Date | string | null;

  // Relaciones
  user?: User;
  patients?: Patient[];
  consultations?: Consultation[];
  menus?: Menu[];
  exchangeLists?: ExchangeList[];
  dietTemplates?: DietPlanTemplate[];

  _count?: {
    patients?: number;
    consultations?: number;
  };
}

// ==========================================
// MÓDULO PACIENTES
// ==========================================

export interface Patient {
  id: string;
  nutritionistId: string;
  createdBy?: { id: string; firstName: string; lastName: string; username: string; email: string } | null;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  gender: Gender;
  birthDate: Date | string; // String si viene del API JSON
  occupation?: string | null;
  activityLevel: ActivityLevel;
  medicalHistory?: unknown | null; // JSON

  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | string | null;

  // Relaciones (Opcionales dependiendo del include)
  nutritionist?: Nutritionist; // Nutritionist Profile
  anthropometrics?: AnthropometricAssessment[];
  consultations?: Consultation[];
  dietPlans?: DietPlan[];
  shoppingLists?: ShoppingList[];

  _count: Record<string, number>;
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

export interface FoodCategory {
  id: string;
  name: string;
  foods?: FoodItem[];
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

  // Relaciones
  category?: FoodCategory;
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

export interface Menu {
  id: string;
  nutritionistId: string;
  createdBy?: { id: string; firstName: string; lastName: string; username: string; email: string } | null;
  name: string;
  description?: string | null;
  totalKcal?: number | null;
  category?: string | null;
  tags?: string | null;
  imageUrl?: string | null;
  prepTime?: number | null;
  difficulty?: string | null;
  importedFromId?: string | null;
  importedFrom?: Menu | null;

  createdAt: Date | string;
  updatedAt: Date | string;

  items?: MenuItem[];
}

export interface MenuItem {
  id: string;
  menuId: string;
  foodId: string;
  quantity: number;
  portionLabel?: string | null;

  food: FoodItem;
}

export interface Condiment {
  id: string;
  name: string;
  isActive: boolean;
  menuItems?: MenuCondiment[];
}

export interface MenuCondiment {
  id: string;
  menuId: string;
  condimentId: string;
  quantity: number | null;
  unit: string | null;
  condiment?: Condiment;
}

export interface ExchangeList {
  id: string;
  nutritionistId?: string | null;
  createdBy?: { id: string; firstName: string; lastName: string; username: string; email: string } | null;
  name: string;
  unity?: string | null;
  calories?: number | null;

  items?: ExchangeListItem[];
}

export interface ExchangeListItem {
  id: string;
  exchangeListId: string;
  foodId: string;
  amount: number;
  description?: string | null;

  foodExchangeList: FoodCategory

  servingLabel: string;
  groupLabel?: string | null;
  cookingState?: string | null;
  food?: FoodItem;
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
  macroSplit?: unknown | null; // JSON { protein: 30, carbs: 40... }

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
  data: unknown; // JSON con la estructura completa del plan
}

// ==========================================
// MÓDULO EXTRAS
// ==========================================

export interface ShoppingList {
  id: string;
  patientId: string;
  createdBy?: { id: string; firstName: string; lastName: string; username: string; email: string } | null;
  name: string;
  items: unknown[]; // JSON Array de strings u objetos
  createdAt: Date | string;
}

export interface Consultation {
  id: string;
  patientId: string;
  createdBy?: { id: string; firstName: string; lastName: string; username: string; email: string } | null;
  date: Date | string;
  reason?: string | null;
  notes?: string | null;
  diagnosis?: string | null;
  status: ConsultationStatus;

  createdAt: Date | string;
  updatedAt: Date | string;
}

