import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

export interface ExchangeStatData {
    totalItems: number;
    totalCategories: number;
    totalSubCategories: number;
    avgCalories: number;
}

export interface CategoryDistribution {
    name: string;
    count: number;
    color?: string; // Opcional, si viene del front
}

export interface DashboardCardProps {
    children: ReactNode;
    className?: string;
}

export interface StatCardProps {
    title: string;
    value: number | string;
    subtext?: string | ReactNode;
    icon: LucideIcon;
    colorClass: string;
}

export interface CategoryChartProps {
    data: CategoryDistribution[];
    loading?: boolean;
}

export interface InfoCardProps {
    className?: string;
}