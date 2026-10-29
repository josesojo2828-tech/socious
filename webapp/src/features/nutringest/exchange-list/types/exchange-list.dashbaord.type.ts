export interface ExchangeMetricsOverview {
  totalGroups: number;       // Cantidad de listas (ej: 8)
  totalFoodItems: number;    // Suma de todos los items
  mostDiverseGroup: string | null; // Nombre de la lista con más items
  mostDiverseCount: number;  // Cantidad de items en esa lista
  avgCalories: number;       // Promedio calórico
}

export interface ExchangeListDistribution {
  name: string;
  count: number;
  baseKcal: number;
}

export interface ExchangeDashboardMetrics {
  overview: ExchangeMetricsOverview;
  distribution: ExchangeListDistribution[];
}