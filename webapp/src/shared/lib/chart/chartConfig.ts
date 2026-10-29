import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

// Registramos los componentes que usaremos
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// Tus colores base de charts.js
export const BASE_COLORS = [
    'rgba(255, 99, 132, 0.7)',  // Rojo
    'rgba(54, 162, 235, 0.7)',  // Azul
    'rgba(255, 206, 86, 0.7)',  // Amarillo
    'rgba(75, 192, 192, 0.7)',  // Verde
    'rgba(153, 102, 255, 0.7)', // Púrpura
    'rgba(255, 159, 64, 0.7)'   // Naranja
];

export const BORDER_COLORS = BASE_COLORS.map(c => c.replace('0.7', '1'));

// Tema de charts.js por modo claro/oscuro (consumido por useChartTheme)
export interface ChartTheme {
  grid: string;
  ticks: string;
  legend: string;
  tooltipBackground: string;
  tooltipTitle: string;
  tooltipBody: string;
  pointBackground: string;
}

export const LIGHT_CHART_THEME: ChartTheme = {
  grid: '#f1f5f9', // slate-100
  ticks: '#94a3b8', // slate-400
  legend: '#475569', // slate-600
  tooltipBackground: '#1e293b', // slate-800
  tooltipTitle: '#f8fafc', // slate-50
  tooltipBody: '#e2e8f0', // slate-200
  pointBackground: '#ffffff', // blanco
};

export const DARK_CHART_THEME: ChartTheme = {
  grid: '#334155', // slate-700
  ticks: '#cbd5e1', // slate-300
  legend: '#cbd5e1', // slate-300
  tooltipBackground: '#0f172a', // slate-900
  tooltipTitle: '#f1f5f9', // slate-100
  tooltipBody: '#cbd5e1', // slate-300
  pointBackground: '#f1f5f9', // slate-100
};
