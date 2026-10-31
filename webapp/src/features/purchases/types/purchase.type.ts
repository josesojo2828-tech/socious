/** Shapes the purchase list and payables report return (S8). */
export interface PurchasesReport {
  issued: {
    count: number;
    totalUSD: number;
    totalVES: number;
    totalUSDT: number;
  };
  accrualByMonth: { month: string; totalUSD: number; count: number }[];
  paymentsByMonth: { month: string; totalUSD: number; count: number }[];
  aging: {
    current: number;
    days1_30: number;
    days31_60: number;
    over60: number;
  };
  openItems: {
    id: string;
    purchaseNumber: string;
    issueDate: string;
    totalUSD: number;
    daysOverdue: number;
    supplier: { id: string; name: string } | null;
  }[];
}
