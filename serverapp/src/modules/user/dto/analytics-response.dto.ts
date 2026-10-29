export class RenderPieChartDto {
  title: string;
  type: "pie" | "doughnut";
  data: any[];
  keyLabel: string;
  keyValue: string;
}

export class BarChartDataDto {
  title: string;
  labels: string[];
  values: number[];
}

export class WalletMetricsDto {
  balance: number;
  totalDeposited: number;
  totalSpent: number;
  currency: string;
}
