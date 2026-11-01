'use client'; // Importante para gráficos

import { Doughnut, Pie } from 'react-chartjs-2';
import { BASE_COLORS, BORDER_COLORS } from '@/shared/lib/chart/chartConfig';
import { RenderPieChart } from '@/types/backend/dashboard.type'; // Usamos tu tipo existente

interface PieChartProps {
  config: RenderPieChart;
  className?: string;
}

export const PieChart = ({ config, className }: PieChartProps) => {
  // Mapeamos los datos según la lógica de tu charts.js
  // El backend envía 'data' como array de objetos.
  // keyLabel y keyValue nos dicen qué propiedades usar.
  
  const labels = config.data.map((item) => item[config.keyLabel] as string);
  const values = config.data.map((item) => item[config.keyValue] as number);

  const chartData = {
    labels,
    datasets: [
      {
        label: config.title,
        data: values,
        backgroundColor: BASE_COLORS.slice(0, values.length),
        borderColor: BORDER_COLORS.slice(0, values.length),
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false, // Para que se adapte al contenedor CSS
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: config.title,
      },
    },
  };

  const ChartComponent = config.type === 'pie' ? Pie : Doughnut;

  return (
    <div className={`w-full h-64 ${className || ''}`}> {/* Contenedor con altura fija */}
      <ChartComponent data={chartData} options={options} />
    </div>
  );
};