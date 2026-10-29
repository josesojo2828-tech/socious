export interface AdminDashboardStats {
  kpi: {
    mrr: number;
    totalNutritionists: number;
    totalPatients: number;
    churnRate: number;
    totalConsultations: number;
    totalDietPlans: number;
    pendingPaymentsCount: number;
  };
  charts: {
    revenueByMonth: { month: string; income: number; failed: number }[];
    subscriptionsByPlan: { label: string; count: number; color: string }[];
    userGrowth: { month: string; count: number }[];
    clinicalActivity: { month: string; consultations: number; plans: number }[];
  };
  tables: {
    topUsers: any[];
    recentTransactions: any[];
    pendingTransactions: any[];
  };
}

