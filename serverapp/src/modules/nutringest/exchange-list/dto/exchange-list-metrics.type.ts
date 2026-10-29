export interface ExchangeDashboardMetrics {
  overview: {
    totalGroups: number; // Cantidad de listas (ej: 8)
    totalFoodItems: number; // Suma de todos los items en todas las listas
    mostDiverseGroup: string | null; // Nombre de la lista con más items
    mostDiverseCount: number; // Cuántos items tiene esa lista
    avgCalories: number; // Promedio del 'baseKcal' de los patrones
  };
  distribution: {
    name: string; // Ej: "Cereales", "Frutas"
    count: number; // Cantidad de alimentos en esta lista
    baseKcal: number; // Para mostrar info extra si se quiere
  }[];
}

export interface GetExchangeMetricsParams {
  nutritionistId?: string;
}

