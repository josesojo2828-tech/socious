'use client';

import { Line } from 'react-chartjs-2';
import type { ScriptableContext } from 'chart.js';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { useChartTheme } from '@/shared/hooks';

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

// Definición para una serie de datos individual
export interface MultyLineChartDataset {
    label: string;
    data: number[];
    color: string;
    fill?: boolean; // Opcional: para rellenar el área bajo la curva
}

interface MultyLineChartProps {
    title: string;
    labels: string[];
    
    // MODO SIMPLE (Una línea)
    data?: number[];
    labelName?: string;
    color?: string;

    // MODO MULTI-LÍNEA (Varias series)
    datasets?: MultyLineChartDataset[];
    
    className?: string;
}

export const MultyLineChart = ({
    title,
    labels,
    // Props modo simple
    data,
    labelName = 'Valor',
    color = '#6366f1',
    // Props modo multi
    datasets,
    className
}: MultyLineChartProps) => {

    const theme = useChartTheme();

    // Lógica para normalizar: Si viene 'datasets' úsalo, si no, construye uno con 'data'
    const finalDatasets = datasets || (data ? [{
        label: labelName,
        data: data,
        color: color,
        fill: true // El modo simple por defecto tiene relleno
    }] : []);

    const chartData = {
        labels,
        datasets: finalDatasets.map(ds => ({
            fill: ds.fill ?? false, // Por defecto sin relleno en modo multi para no ensuciar
            label: ds.label,
            data: ds.data,
            borderColor: ds.color,
            backgroundColor: (context: ScriptableContext<'line'>) => {
                if (!ds.fill) return 'transparent'; // Sin relleno
                
                // Gradiente suave solo si tiene relleno activado
                const ctx = context.chart.ctx;
                const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                gradient.addColorStop(0, `${ds.color}33`); // Color con 20% opacidad
                gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                return gradient;
            },
            tension: 0.4, // Curva suave
            pointRadius: 4,
            pointBackgroundColor: theme.pointBackground,
            pointBorderColor: ds.color,
            pointBorderWidth: 2,
            pointHoverRadius: 6,
        })),
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'top' as const,
                align: 'end' as const,
                labels: {
                    boxWidth: 8,
                    usePointStyle: true,
                    pointStyle: 'circle',
                    font: { size: 11 },
                    color: theme.legend
                }
            },
            title: { display: false },
            tooltip: {
                backgroundColor: theme.tooltipBackground,
                titleColor: theme.tooltipTitle,
                bodyColor: theme.tooltipBody,
                padding: 10,
                cornerRadius: 8,
                titleFont: { size: 13 },
                bodyFont: { size: 12 },
                displayColors: true, 
                usePointStyle: true,
            }
        },
        interaction: {
            mode: 'index' as const, // Al pasar el mouse, muestra todos los puntos de esa fecha
            intersect: false,
        },
        scales: {
            y: {
                beginAtZero: false, // Importante para ver variaciones pequeñas de peso
                grid: { color: theme.grid },
                border: { display: false },
                ticks: { font: { size: 10 }, color: theme.ticks }
            },
            x: {
                grid: { display: false },
                border: { display: false },
                ticks: { font: { size: 10 }, color: theme.ticks }
            }
        },
    };

    return (
        <div className={`w-full h-full max-h-[400px] flex flex-col ${className || ''}`}>
            {title && <h3 className="text-base-content/70 font-bold mb-4 text-xs uppercase tracking-wide shrink-0">{title}</h3>}
            <div className="flex-1 w-full relative min-h-0">
                <Line options={options} data={chartData} />
            </div>
        </div>
    );
};