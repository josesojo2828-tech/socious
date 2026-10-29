import { FoodItem, Condiment, MenuCondiment } from "@/types/backend/schema.types";

// Estructura de un Ingrediente del Menú (Tabla Intermedia MenuItem)
export interface MenuIngredient {
    id: string;
    menuId: string;
    foodId: string;

    quantity: number;       // Cantidad numérica (g/ml)
    unit: string | null;    // Ej: "g", "ml"
    portionLabel: string | null; // Ej: "1 taza", "2 unidades"

    food: FoodItem;   // Relación populada
}

// Estructura Principal del Menú (Detalle Completo)
export interface MenuDetail {
    id: string;
    nutritionistId: string;

    name: string;
    description: string | null;
    category: 'BREAKFAST' | 'MORNING_SNACK' | 'LUNCH' | 'SNACK' | 'DINNER' | 'PRE_WORKOUT' | 'POST_WORKOUT' | 'OTHER' | null;
    tags: string | null;
    imageUrl?: string | null;
    prepTime?: number | null;
    difficulty?: string | null;

    // Totales Cacheados (Calculados por el Backend)
    totalKcal: number | string;
    totalProtein: number | string;
    totalCarbs: number | string;
    totalFats: number | string;

    createdAt: string;
    updatedAt: string;
    publishedAt?: string | null;
    canViewCondiments?: boolean;

    items: MenuIngredient[]; // Array de ingredientes
    condiments?: MenuCondiment[]; // Array de condimentos
}

// Payload para Agregar un Ingrediente (POST)
export interface AddMenuIngredientPayload {
    foodId: string;
    quantity: number;
    unit?: string;
    portionLabel?: string;
}

// Payload para Agregar un Condimento (POST)
export interface AddMenuCondimentPayload {
    condimentId: string;
    quantity?: number;
    unit?: string;
}

export type BadgeColor = 'purple' | 'blue' | 'green' | 'gray' | 'orange';

export interface BadgeProps {
    children: React.ReactNode;
    color?: BadgeColor;
    className?: string;
}

export interface MacroDonutProps {
    p: number;
    c: number;
    f: number;
    size?: number;
}

export interface MenuDetailProps {
    menu: MenuDetail;
    reload: () => void;
}

export interface MenuIngredientsTableProps {
    items: MenuIngredient[];
    totalKcal: number | string;
    handleAddIngredient: (payload: AddMenuIngredientPayload) => Promise<boolean>;
    handleUpdateIngredient?: (itemId: string, payload: AddMenuIngredientPayload) => Promise<boolean>;
    onDelete?: (itemId: string) => void; // Opcional para vista de solo lectura vs edición
}
