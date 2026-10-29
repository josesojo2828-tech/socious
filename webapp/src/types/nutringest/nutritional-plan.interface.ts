import { ExchangeListItem, MenuItem } from "../backend/schema.types";
import { ConsultationSimple, PatientSimple } from "./anthropometry.interface";

// --- ENUMS ---
export enum PlanStatus {
    DRAFT = 'DRAFT',
    ACTIVE = 'ACTIVE',
    ARCHIVED = 'ARCHIVED'
}

// --- SUB-INTERFACES DE ASIGNACIÓN ---

// Referencia al Menú (Traemos solo lo necesario para mostrar la tarjeta)
export type MenuCategory = 'BREAKFAST' | 'MORNING_SNACK' | 'LUNCH' | 'SNACK' | 'DINNER' | 'PRE_WORKOUT' | 'POST_WORKOUT' | 'OTHER';
export interface MenuReference {
    id: string;
    name: string;
    category?: MenuCategory | null;
    totalKcal?: number | null;
    totalProtein?: number | null;
    totalCarbs?: number | null;
    totalFat?: number | null;
    tags: string;

    items: MenuItem[];

    // Relación

    // ...otros campos de Menu si se necesitan
}

export interface AssignedMenu {
    id: string;
    planId: string;
    menuId: string;
    
    eatingMoment: string | null; // "Desayuno"
    notes?: string | null;

    // Relación
    menu: MenuReference;
}

// Referencia a Lista de Intercambio
export interface ExchangeListReference {
    id: string;
    name: string;
    baseKcal?: number | null;

    items: ExchangeListItem[];
}

export interface AssignedExchangeList {
    id: string;
    planId: string;
    exchangeListId: string;
    
    portions: number; // Decimal en DB -> number en JS
    eatingMoment?: string | null;
    servingLabel: string

    // Relación
    exchangeList?: ExchangeListReference;
}

export interface AssignedSupplement {
    id: string;
    planId: string;
    
    name: string;
    dose: string;
    frequency: string;
    brand?: string | null;
}

// --- INTERFAZ PRINCIPAL ---

export interface NutritionalPlan {
    id: string;
    patientId: string;
    status: PlanStatus;
    
    name: string;
    startDate: string | Date;
    endDate?: string | Date | null;

    // Objetivos
    kcalTarget: number;
    proteinTarget: number;
    carbsTarget: number;
    fatsTarget: number;

    recommendations?: string | null;
    waterIntake?: number | null;
    waterRecommendation?: string | null;
    activityRecommendation?: string | null;
    sleepRecommendation?: string | null;

    // --- RELACIONES ---
    patient: PatientSimple;
    consultation?: ConsultationSimple | null;

    shareToken?: string
    isShared?: boolean

    // Arrays de Asignaciones (Populated)
    assignedMenus: AssignedMenu[];
    assignedLists: AssignedExchangeList[];
    supplements: AssignedSupplement[];

    createdAt?: string | Date;
    updatedAt?: string | Date;
}