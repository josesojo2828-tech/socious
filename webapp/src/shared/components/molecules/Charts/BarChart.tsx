'use client';

import { Bar } from 'react-chartjs-2';
import { BASE_COLORS, BORDER_COLORS } from '@/shared/lib/chart/chartConfig';

interface BarChartProps {
    title: string;
    labels: string[];
    values: number[];
    className?: string;
}

export const BarChart = ({ title, labels, values, className }: BarChartProps) => {
    const data = {
        labels,
        datasets: [
            {
                label: title,
                data: values,
                backgroundColor: BASE_COLORS[1], // Azul fijo según tu charts.js original
                borderColor: BORDER_COLORS[1],
                borderWidth: 1,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top' as const,
            },
            title: {
                display: true,
                text: title,
            },
        },
        scales: {
            y: {
                beginAtZero: true,
            },
        },
    };

    return (
        <div className={`w-full h-64 ${className || ''}`}>
            <Bar data={data} options={options} />
        </div>
    );
};