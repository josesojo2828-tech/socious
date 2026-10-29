import { IsBooleanString, IsOptional, IsString } from "class-validator";

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
    avgCarbs: number;
    avgFats: number;
  };
  // NUEVO: Reemplaza a las categorías que no existen
  distribution: {
    name: string;
    count: number;
    color?: string; // Para el frontend
  }[];
}

export interface GetFoodMetricsParams {
  includeInactive?: boolean;
  searchQuery?: string;
}

export class GetFoodMetricsDto {
  @IsOptional()
  @IsBooleanString()
  includeInactive?: string; // Recibimos como string 'true'/'false' desde la URL

  @IsOptional()
  @IsString()
  searchQuery?: string;
}

// === EXCHANGE LIST METRICS ===

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

// ----------------------------------------------------------------------
// 2. PARÁMETROS DE ENTRADA
// ----------------------------------------------------------------------

export interface GetExchangeMetricsParams {
  searchQuery?: string;
}

export class GetExchangeMetricsDto {
  @IsOptional()
  @IsString()
  searchQuery?: string;
}
