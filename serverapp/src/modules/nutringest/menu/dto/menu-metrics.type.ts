// --- TIPOS Y DTOS (En el mismo archivo para consistencia con tu food-metrics) ---

import { MenuCategory } from "src/shared/types/schema.types";

export interface MenuDashboardMetrics {
  overview: {
    totalMenus: number;
    assignedPatients: number; // Placeholder si no hay relación directa aún
    topCategory: string | null; // Ej: "Almuerzos"
  };
  averages: {
    avgCalories: number;
    avgProtein: number;
    avgCarbs: number;
    avgFats: number;
  };
  distribution: {
    category: string; // "Desayuno", "Almuerzo", etc.
    count: number;
    percentage: number;
    color: string; // Para el gráfico del frontend
  }[];
}

export interface GetMenuMetricsParams {
  nutritionistId?: string; // Para filtrar por nutricionista si es necesario
  patientId?: string; // Para filtrar por paciente si es necesario
  startDate?: Date;
  endDate?: Date;
}

// Mapa de colores estático para mantener consistencia visual
export const CATEGORY_CONFIG: Record<
  MenuCategory,
  { label: string; color: string }
> = {
  BREAKFAST: { label: "Desayuno", color: "#8884d8" }, // Morado
  MORNING_SNACK: { label: "Media Mañana", color: "#a78bfa" }, // Violeta claro
  LUNCH: { label: "Almuerzo", color: "#82ca9d" }, // Verde
  SNACK: { label: "Media Tarde", color: "#ff8042" }, // Naranja
  DINNER: { label: "Cena", color: "#ffc658" }, // Amarillo
  PRE_WORKOUT: { label: "Pre-Entreno", color: "#06b6d4" }, // Cian
  POST_WORKOUT: { label: "Post-Entreno", color: "#3b82f6" }, // Azul
  OTHER: { label: "Otros", color: "#cbd5e1" }, // Gris
};
