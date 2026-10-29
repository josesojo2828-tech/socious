
export interface FoodDatabaseMetrics {
    overview: {
        totalFoods: number;
        systemFoods: number;
        userFoods: number;
        needsReview: number;
    };
    dataQuality: {
        fiberCompletion: number;
        sodiumCompletion: number;
        ironCompletion: number;
    };
    averages: {
        avgCalories: number;
        avgProtein: number;
    };
}

export interface CategorizedFoodMetrics {
    overview: {
        totalItems: number;
        totalCategories: number;
        totalSubCategories: number;
    };
    averages: {
        avgCalories: number;
    };
    distribution: {
        name: string;
        count: number;
    }[];
}

// --- HOOK 1: Para el Dashboard General de Alimentos ---

export interface UseFoodMetricsParams {
    includeInactive?: boolean;
    searchQuery?: string;
}   

// --- HOOK 2: Para el Dashboard de Listas de Intercambio ---

export interface UseCategorizedMetricsParams {
  searchQuery?: string;
}
