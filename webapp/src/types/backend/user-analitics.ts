
export interface RenderPieChartDto {
    title: string;
    type: 'pie' | 'doughnut';
    data: any[];
    keyLabel: string;
    keyValue: string;
}

export interface BarChartDataDto {
    title: string;
    labels: string[];
    values: number[];
}

export interface WalletMetricsDto {
    balance: number;
    totalDeposited: number;
    totalSpent: number;
    currency: string;
}
