'use client';

import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler, // Importante para el relleno debajo de la linea
} from 'chart.js';
import { useChartTheme } from '@/shared/hooks';

// Registrar componentes necesarios de Chart.js
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

interface LineChartProps {
    title: string;
    labels: string[];
    data: number[];
    labelName?: string; // Ej: "Dinero ($)"
    color?: string; // Color principal
    className?: string;
}

export const LineChart = ({
    title,
    labels,
    data,
    labelName = 'Valor',
    color = '#6366f1', // Un morado por defecto (puedes usar tus variables)
    className
}: LineChartProps) => {

    const theme = useChartTheme();

    const chartData = {
        labels,
        datasets: [
            {
                fill: true, // Relleno de área
                label: labelName,
                data: data,
                borderColor: color,
                backgroundColor: `${color}33`, // El mismo color pero con transparencia (hex alpha)
                tension: 0.4, // Curvatura de la línea (0 es recta, 0.4 es curva suave)
                pointRadius: 4,
                pointBackgroundColor: theme.pointBackground,
                pointBorderColor: color,
                pointBorderWidth: 2,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'top' as const,
                labels: {
                    color: theme.legend,
                },
            },
            title: {
                display: false,
            },
            tooltip: {
                backgroundColor: theme.tooltipBackground,
                titleColor: theme.tooltipTitle,
                bodyColor: theme.tooltipBody,
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: theme.grid, // Grid muy suave
                },
                ticks: {
                    color: theme.ticks,
                },
            },
            x: {
                grid: {
                    display: false // Ocultar grid vertical para limpieza
                },
                ticks: {
                    color: theme.ticks,
                },
            }
        },
    };

    return (
        <div className={`w-full h-72 ${className || ''}`}>
            <h3 className="text-base-content/70 font-bold mb-4 text-sm uppercase tracking-wide">{title}</h3>
            <div className="h-full w-full pb-6">
                <Line options={options} data={chartData} />
            </div>
        </div>
    );
};