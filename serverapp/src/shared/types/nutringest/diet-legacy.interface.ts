import { PatientSimple } from "./anthropometry.interface";

// Enums
export enum DietStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  ARCHIVED = "ARCHIVED",
}

// --- ESTRUCTURA PROFUNDA ---

export interface DietFood {
  id: string;
  foodId: string;
  quantity: number;
  portionName: string;
  calculatedGrams: number;

  // Relación con el alimento base
  food?: {
    id: string;
    name: string;
    calories: number;
    // ...macros
  };
}

export interface DietMeal {
  id: string;
  name: string; // "Desayuno"
  time?: string | null; // "08:00 AM"
  order: number;

  foods: DietFood[];
}

export interface DietDay {
  id: string;
  name: string; // "Lunes" o "Día de Entreno"
  order: number;

  meals: DietMeal[];
}

// --- INTERFAZ PRINCIPAL ---

export interface LegacyDietPlan {
  id: string;
  patientId: string;
  createdBy?: { id: string; firstName: string; lastName: string; username: string; email: string } | null;

  name: string;
  startDate: string | Date;
  endDate?: string | Date | null;
  status: DietStatus;

  totalKcal?: number | null;
  macroSplit?: any | null; // JSON

  // --- RELACIONES ---
  patient?: PatientSimple;

  // Array anidado completo
  days: DietDay[];

  createdAt: string | Date;
  updatedAt: string | Date;
}
