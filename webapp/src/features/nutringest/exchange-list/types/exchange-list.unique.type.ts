
export interface ExchangeItem {
    id: string;
    amount: number;      // Cantidad de raciones (ej: 1, 2, 0.5)
    servingLabel: string; // Ej: "1/3 taza"
    groupLabel?: string | null; // Descripción del grupo intercambiable (ej: "Acelga, Ají, Tomate")
    cookingState?: string | null; // "CRUDO" o "COCIDO" — ajusta la medida visible
    foodExchangeList: {
        id: string;
        name: string;
        brand?: string;
        category?: string;
        sub?: string;
        unity?: string;
        /**
         * Gramos o cc de la medida práctica. `null` cuando la fuente no lo
         * define. Prisma serializa `Decimal` como string, así que este
         * endpoint lo devuelve como texto mientras que `/api/exchange-food`
         * lo devuelve como número.
         */
        grams?: number | string | null;
        calories?: number;
    };
}

// Estructura del Alimento (Anidado en el Item)
export interface FoodItemSimple {
    id: string;
    name: string;
    brand?: string | null;
    category?: string;
    sub?: string;
    unity?: string;
    /** Gramos o cc de la medida práctica. `null` cuando la fuente no lo define. */
    grams?: number | null;
    calories?: number;
    // Podríamos agregar más datos si quisiéramos mostrarlos en el modal de búsqueda
}

// Estructura Principal de la Lista (Detalle Completo)
export interface ExchangeListDetail {
    id: string;
    nutritionistId: string;
    name: string;
    description: string;

    // Valores Base (Patrón)
    baseKcal: number | string; // El backend puede mandar Decimal como string a veces, lo maneja el hook
    baseCarbs: number | string;
    baseProtein: number | string;
    baseFat: number | string;

    tags?: string[]; // Opcional
    createdAt: string;
    updatedAt: string;

    items: ExchangeItem[]; // Array de alimentos ya incluidos
}

// Payload para Agregar un Item (Lo que enviamos al POST)
export interface AddExchangeItemPayload {
    foodId: string;
    amount: number;
    servingLabel: string;
}

// Valores calculados por el Totalizador en el Frontend
export interface SimulatedValues {
    kcal: number;
    carbs: string;
    protein: string;
    fat: string;
}

// Macros por categoría de intercambio según la tabla UCV 2018 (ADA/ADA)
export interface ExchangeMacros {
    protein: number;  // g por intercambio
    fat: number;      // g por intercambio
    carbs: number;    // g por intercambio
    kcal: number;     // kcal por intercambio
}

// Mapa de valores nutricionales estándar por subcategoría
// Fuente: UCV - Listas de Intercambio 2018 (ADA/ADA)
export const EXCHANGE_MACROS_MAP: Record<string, ExchangeMacros> = {
    // Lista 1: Leche y Sustitutos

    // Lista 2: Hortalizas y Vegetales
    'HORTALIZAS Y VEGETALES': { protein: 2, fat: 0, carbs: 5, kcal: 25 },
    // Ajo: aliño de 5-10 g, el PDF no lo cuenta como intercambio (kcal 0).
    'ALIÑOS': { protein: 0, fat: 0, carbs: 0, kcal: 0 },

    // Lista 3: Frutas
    'FRUTAS': { protein: 0, fat: 0, carbs: 15, kcal: 60 },

    // Lista 4: Almidones, Cereales y Panes
    'CEREALES': { protein: 2.5, fat: 0, carbs: 15, kcal: 80 },
    'PANES': { protein: 2.5, fat: 0, carbs: 15, kcal: 80 },
    'TUBERCULOS': { protein: 2.5, fat: 0, carbs: 15, kcal: 80 },
    'LEGUMINOSAS': { protein: 2.5, fat: 0, carbs: 15, kcal: 80 },
    'GALLETAS': { protein: 2.5, fat: 0, carbs: 15, kcal: 80 },

    // Lista 5: Carnes o Sustitutos
    'CARNES MAGRAS': { protein: 7, fat: 3, carbs: 0, kcal: 55 },
    'CARNES SEMIGORDAS': { protein: 7, fat: 5, carbs: 0, kcal: 75 },
    'CARNES GORDAS': { protein: 7, fat: 8, carbs: 0, kcal: 100 },
    'CARNES': { protein: 7, fat: 5, carbs: 0, kcal: 75 }, // Default: semigorda
    'CARNES O SUSTITUTOS': { protein: 7, fat: 5, carbs: 0, kcal: 75 },
    'LECHE Y SUSTITUTOS': { protein: 8, fat: 2.4, carbs: 12, kcal: 102 },

    // Lista 6: Grasas
    'GRASAS MONOINSATURADAS': { protein: 0, fat: 5, carbs: 0, kcal: 45 },
    'GRASAS POLIINSATURADAS': { protein: 0, fat: 5, carbs: 0, kcal: 45 },
    'GRASAS SATURADAS': { protein: 0, fat: 5, carbs: 0, kcal: 45 },
    // PDF LISTA Nº 1 sub names (order matters: MUY BAJA before BAJA)
    'MUY BAJA EN GRASA': { protein: 8, fat: 1.2, carbs: 12, kcal: 90 },
    'BAJA EN GRASA': { protein: 8, fat: 2.4, carbs: 12, kcal: 102 },
    'SEMIDESCREMADA': { protein: 8, fat: 4.8, carbs: 12, kcal: 123 },
    'ENTERA': { protein: 8, fat: 8, carbs: 12, kcal: 150 },
    'DESLACTOSADOS': { protein: 8, fat: 4.8, carbs: 12, kcal: 123 },
    'GRASAS': { protein: 0, fat: 5, carbs: 0, kcal: 45 },

    // Lista 7: Azúcares
    'AZUCARES': { protein: 0, fat: 0, carbs: 10, kcal: 40 },
    'AZUCAR CON GRASA': { protein: 0, fat: 5, carbs: 10, kcal: 85 },
};

/**
 * Resuelve los macronutrientes de un alimento de intercambio basado en su categoría y subcategoría.
 * Busca primero en la subcategoría (más específico), luego en la categoría (fallback).
 */
export function getExchangeMacros(category?: string, sub?: string): ExchangeMacros {
    const defaultMacros: ExchangeMacros = { protein: 0, fat: 0, carbs: 0, kcal: 0 };

    if (!category && !sub) return defaultMacros;

    // 1. Intentar con sub normalizada
    if (sub) {
        const subUpper = sub.toUpperCase();
        // Buscar coincidencia exacta o parcial
        for (const [key, value] of Object.entries(EXCHANGE_MACROS_MAP)) {
            if (subUpper.includes(key) || key.includes(subUpper)) {
                return value;
            }
        }
    }

    // 2. Intentar con categoría
    if (category) {
        const catUpper = category.toUpperCase();
        for (const [key, value] of Object.entries(EXCHANGE_MACROS_MAP)) {
            if (catUpper.includes(key) || key.includes(catUpper)) {
                return value;
            }
        }
    }

    return defaultMacros;
}
