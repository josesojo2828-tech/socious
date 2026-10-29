
export interface MenuMetricsOverview {
  totalMenus: number;
  assignedPatients: number;
  topCategory: string | null;
}

export interface MenuMetricsAverages {
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFats: number;
}

export interface MenuMetricsDistribution {
  category: string;
  count: number;
  percentage: number;
  color: string;
}

export interface MenuDashboardMetrics {
  overview: MenuMetricsOverview;
  averages: MenuMetricsAverages;
  distribution: MenuMetricsDistribution[];
}

export interface UseMenuMetricsParams {
  startDate?: Date | null;
  endDate?: Date | null;
}
