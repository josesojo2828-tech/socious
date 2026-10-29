'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import '@/shared/lib/chart/chartConfig';
import { apiClient } from '@/shared/api/api.client';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Filter,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

interface DailyStat {
  day: number;
  completed: number;
  cancelled: number;
  scheduled: number;
}

interface MonthlyStat {
  month: number;
  monthName: string;
  completed: number;
  cancelled: number;
  scheduled: number;
}

interface BackendSummary {
  grandTotal: number;
  totalCompleted: number;
  totalCancelled: number;
  totalScheduled: number;
  attendanceRate: number;
}

interface AgendaHistoryChartProps {
  className?: string;
  orgId?: string;
}

export const AgendaHistoryChart: React.FC<AgendaHistoryChartProps> = ({ className = '', orgId }) => {
  const currentDate = new Date();
  const currentYearNum = currentDate.getFullYear();
  const currentMonthNum = currentDate.getMonth(); // 0-indexed

  // selectedMonth: -1 means "Todo el Año"
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonthNum);
  const [selectedYear, setSelectedYear] = useState<number>(currentYearNum);
  const [availableYears, setAvailableYears] = useState<number[]>([
    currentYearNum - 1,
    currentYearNum,
    currentYearNum + 1,
  ]);
  const [filterType, setFilterType] = useState<'all' | 'completed' | 'cancelled'>('all');

  // Backend response state
  const [loading, setLoading] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'monthly' | 'annual'>('monthly');
  const [backendDailyStats, setBackendDailyStats] = useState<DailyStat[] | null>(null);
  const [backendMonthlyStats, setBackendMonthlyStats] = useState<MonthlyStat[] | null>(null);
  const [backendSummary, setBackendSummary] = useState<BackendSummary | null>(null);

  // Days in selected month if monthly view
  const daysInMonth = useMemo(() => {
    if (selectedMonth === -1) return 12;
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  }, [selectedMonth, selectedYear]);

  // Fetch consultations from the working endpoint and transform to chart format
  const fetchAgendaFromBackend = async () => {
    setLoading(true);
    try {
      // Use the working consultations endpoint
      const res = await apiClient.get('/api/consultations?limit=500');
      const consultations = res.data?.list || res.data || [];

      if (!Array.isArray(consultations) || consultations.length === 0) {
        setBackendDailyStats(null);
        setBackendMonthlyStats(null);
        setBackendSummary(null);
        return;
      }

      // Filter consultations by selected year
      const yearConsultations = consultations.filter((c: any) => {
        const cDate = new Date(c.scheduledAt);
        return cDate.getFullYear() === selectedYear;
      });

      if (selectedMonth === -1) {
        // Annual view: group by month
        const monthlyStats: MonthlyStat[] = MONTHS.map((monthName, idx) => {
          const monthConsultations = yearConsultations.filter((c: any) => {
            const cDate = new Date(c.scheduledAt);
            return cDate.getMonth() === idx;
          });
          return {
            month: idx + 1,
            monthName,
            completed: monthConsultations.filter((c: any) => c.status === 'COMPLETED').length,
            cancelled: monthConsultations.filter((c: any) => c.status === 'CANCELED' || c.status === 'NO_SHOW').length,
            scheduled: monthConsultations.filter((c: any) => c.status === 'SCHEDULED').length,
          };
        });
        setBackendMonthlyStats(monthlyStats);
        setBackendDailyStats(null);
        setViewMode('annual');
      } else {
        // Monthly view: group by day
        const daysInSelectedMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        const monthConsultations = yearConsultations.filter((c: any) => {
          const cDate = new Date(c.scheduledAt);
          return cDate.getMonth() === selectedMonth;
        });

        const dailyStats: DailyStat[] = Array.from({ length: daysInSelectedMonth }, (_, i) => {
          const day = i + 1;
          const dayConsultations = monthConsultations.filter((c: any) => {
            const cDate = new Date(c.scheduledAt);
            return cDate.getDate() === day;
          });
          return {
            day,
            completed: dayConsultations.filter((c: any) => c.status === 'COMPLETED').length,
            cancelled: dayConsultations.filter((c: any) => c.status === 'CANCELED' || c.status === 'NO_SHOW').length,
            scheduled: dayConsultations.filter((c: any) => c.status === 'SCHEDULED').length,
          };
        });
        setBackendDailyStats(dailyStats);
        setBackendMonthlyStats(null);
        setViewMode('monthly');
      }

      // Calculate summary
      const totalCompleted = yearConsultations.filter((c: any) => c.status === 'COMPLETED').length;
      const totalCancelled = yearConsultations.filter((c: any) => c.status === 'CANCELED' || c.status === 'NO_SHOW').length;
      const totalScheduled = yearConsultations.filter((c: any) => c.status === 'SCHEDULED').length;
      const grandTotal = totalCompleted + totalCancelled + totalScheduled;

      setBackendSummary({
        grandTotal,
        totalCompleted,
        totalCancelled,
        totalScheduled,
        attendanceRate: grandTotal > 0 ? Math.round((totalCompleted / grandTotal) * 100) : 0,
      });

    } catch (err) {
      console.warn('Agenda history fetch error:', err);
      setBackendSummary(null);
      setBackendDailyStats(null);
      setBackendMonthlyStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgendaFromBackend();
  }, [selectedMonth, selectedYear, orgId]);

  // Build chart dataset & KPI summaries directly from backend data
  const chartData = useMemo(() => {
    const isAnnual = selectedMonth === -1 || viewMode === 'annual';
    const labels = isAnnual
      ? MONTHS
      : Array.from({ length: daysInMonth }, (_, i) => `Día ${i + 1}`);

    const count = isAnnual ? 12 : daysInMonth;
    const completedValues = new Array(count).fill(0);
    const cancelledValues = new Array(count).fill(0);
    const scheduledValues = new Array(count).fill(0);

    if (isAnnual && backendMonthlyStats && backendMonthlyStats.length > 0) {
      backendMonthlyStats.forEach((st) => {
        const idx = st.month - 1;
        if (idx >= 0 && idx < 12) {
          completedValues[idx] = st.completed || 0;
          cancelledValues[idx] = st.cancelled || 0;
          scheduledValues[idx] = st.scheduled || 0;
        }
      });
    } else if (!isAnnual && backendDailyStats && backendDailyStats.length > 0) {
      backendDailyStats.forEach((st) => {
        const idx = st.day - 1;
        if (idx >= 0 && idx < daysInMonth) {
          completedValues[idx] = st.completed || 0;
          cancelledValues[idx] = st.cancelled || 0;
          scheduledValues[idx] = st.scheduled || 0;
        }
      });
    }

    const calculatedCompleted = completedValues.reduce((a, b) => a + b, 0);
    const calculatedCancelled = cancelledValues.reduce((a, b) => a + b, 0);
    const calculatedScheduled = scheduledValues.reduce((a, b) => a + b, 0);
    const calculatedGrandTotal = calculatedCompleted + calculatedCancelled + calculatedScheduled;
    const calculatedAttendanceRate =
      calculatedGrandTotal > 0 ? Math.round((calculatedCompleted / calculatedGrandTotal) * 100) : 0;

    // Use backend summary directly if available
    const grandTotal = backendSummary ? backendSummary.grandTotal : calculatedGrandTotal;
    const totalCompleted = backendSummary ? backendSummary.totalCompleted : calculatedCompleted;
    const totalCancelled = backendSummary ? backendSummary.totalCancelled : calculatedCancelled;
    const attendanceRate = backendSummary ? backendSummary.attendanceRate : calculatedAttendanceRate;

    return {
      labels,
      completedValues,
      cancelledValues,
      scheduledValues,
      totalCompleted,
      totalCancelled,
      grandTotal,
      attendanceRate,
      isAnnual,
    };
  }, [
    selectedMonth,
    viewMode,
    daysInMonth,
    backendDailyStats,
    backendMonthlyStats,
    backendSummary,
  ]);

  const handlePrevMonth = () => {
    if (selectedMonth === -1) {
      setSelectedYear((prev) => Math.max(availableYears[0], prev - 1));
    } else if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((prev) => Math.max(availableYears[0], prev - 1));
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === -1) {
      setSelectedYear((prev) => Math.min(availableYears[availableYears.length - 1], prev + 1));
    } else if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((prev) => Math.min(availableYears[availableYears.length - 1], prev + 1));
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  const datasets = [];

  if (filterType === 'all' || filterType === 'completed') {
    datasets.push({
      label: 'Citas Atendidas',
      data: chartData.completedValues,
      backgroundColor: 'rgba(79, 70, 229, 0.85)',
      borderColor: 'rgb(79, 70, 229)',
      borderWidth: 1,
      borderRadius: 6,
    });
  }

  if (filterType === 'all') {
    datasets.push({
      label: 'Citas Programadas',
      data: chartData.scheduledValues,
      backgroundColor: 'rgba(59, 130, 246, 0.7)',
      borderColor: 'rgb(59, 130, 246)',
      borderWidth: 1,
      borderRadius: 6,
    });
  }

  if (filterType === 'all' || filterType === 'cancelled') {
    datasets.push({
      label: 'Canceladas / Ausentes',
      data: chartData.cancelledValues,
      backgroundColor: 'rgba(239, 68, 68, 0.75)',
      borderColor: 'rgb(239, 68, 68)',
      borderWidth: 1,
      borderRadius: 6,
    });
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          boxWidth: 8,
          font: {
            family: 'Inter, sans-serif',
            size: 11,
            weight: 600,
          },
        },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleFont: { size: 12, weight: 700 },
        bodyFont: { size: 11 },
        padding: 10,
        cornerRadius: 10,
      },
    },
    scales: {
      x: {
        stacked: filterType === 'all',
        grid: { display: false },
        ticks: {
          font: { size: 10 },
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 15,
        },
      },
      y: {
        stacked: filterType === 'all',
        beginAtZero: true,
        grid: { color: 'rgba(226, 232, 240, 0.6)' },
        ticks: {
          stepSize: 1,
          font: { size: 10 },
        },
      },
    },
  };

  return (
    <div className={`bg-base-100 text-base-content rounded-2xl border border-base-300 p-6 shadow-sm space-y-6 ${className}`}>
      {/* Header with Selector & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-base-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-base-content">
                Histórico de Agenda & Consultas
              </h2>
              <p className="text-xs text-base-content/70">
                {selectedMonth === -1
                  ? `Resumen anual de citas del año ${selectedYear} agrupado por meses.`
                  : `Evolución diaria de citas para ${MONTHS[selectedMonth]} ${selectedYear}.`}
              </p>
            </div>
          </div>
        </div>

        {/* Month & Year Selectors */}
        <div className="flex items-center gap-2 flex-wrap">
          {loading && <RefreshCw className="w-4 h-4 text-primary animate-spin mr-1" />}

          <div className="flex items-center bg-base-200 rounded-xl p-1 border border-base-300">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-base-100 rounded-lg text-base-content/70 transition-all cursor-pointer"
              title="Periodo Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent text-xs font-extrabold text-base-content px-2 py-1 border-none focus:ring-0 cursor-pointer"
            >
              <option value={-1}>📅 Todo el Año</option>
              {MONTHS.map((m, idx) => (
                <option key={idx} value={idx}>
                  {m}
                </option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-xs font-extrabold text-primary px-2 py-1 border-none focus:ring-0 cursor-pointer"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-base-100 rounded-lg text-base-content/70 transition-all cursor-pointer"
              title="Periodo Siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards (Strictly dependent on Backend Summary) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-primary/10 rounded-xl border border-primary/20 space-y-1">
          <div className="flex items-center justify-between text-[11px] font-bold text-base-content/70">
            <span>Total Citas</span>
            <CalendarIcon className="w-3.5 h-3.5 text-primary" />
          </div>
          <p className="text-xl font-black text-base-content">{chartData.grandTotal}</p>
          <p className="text-[10px] text-primary font-semibold">
            {selectedMonth === -1 ? `Año ${selectedYear}` : `${MONTHS[selectedMonth]} ${selectedYear}`}
          </p>
        </div>

        <div className="p-3.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 space-y-1">
          <div className="flex items-center justify-between text-[11px] font-bold text-base-content/70">
            <span>Atendidas</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <p className="text-xl font-black text-emerald-500">{chartData.totalCompleted}</p>
          <p className="text-[10px] text-emerald-500 font-semibold">Consultas efectuadas</p>
        </div>

        <div className="p-3.5 bg-rose-500/10 rounded-xl border border-rose-500/20 space-y-1">
          <div className="flex items-center justify-between text-[11px] font-bold text-base-content/70">
            <span>Canceladas</span>
            <XCircle className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <p className="text-xl font-black text-rose-500">{chartData.totalCancelled}</p>
          <p className="text-[10px] text-rose-500 font-semibold">Inasistencias / bajas</p>
        </div>

        <div className="p-3.5 bg-sky-500/10 rounded-xl border border-sky-500/20 space-y-1">
          <div className="flex items-center justify-between text-[11px] font-bold text-base-content/70">
            <span>% Asistencia</span>
            <TrendingUp className="w-3.5 h-3.5 text-sky-500" />
          </div>
          <p className="text-xl font-black text-sky-500">{chartData.attendanceRate}%</p>
          <p className="text-[10px] text-sky-500 font-semibold">Cumplimiento de agenda</p>
        </div>
      </div>

      {/* Filter Tabs & Chart Area */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-base-content/70 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-primary" /> Filtrar Vista:
          </span>
          <div className="flex items-center gap-1 bg-base-200 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                filterType === 'all'
                  ? 'bg-base-100 text-primary shadow-xs'
                  : 'text-base-content/70 hover:text-base-content'
              }`}
            >
              Ver Todo
            </button>
            <button
              onClick={() => setFilterType('completed')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                filterType === 'completed'
                  ? 'bg-base-100 text-emerald-500 shadow-xs'
                  : 'text-base-content/70 hover:text-base-content'
              }`}
            >
              Atendidas
            </button>
            <button
              onClick={() => setFilterType('cancelled')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                filterType === 'cancelled'
                  ? 'bg-base-100 text-rose-500 shadow-xs'
                  : 'text-base-content/70 hover:text-base-content'
              }`}
            >
              Canceladas
            </button>
          </div>
        </div>

        {/* Chart Render */}
        <div className="h-64 sm:h-72 w-full pt-2">
          {chartData.grandTotal === 0 ? (
            <div className="h-full flex flex-col items-center justify-center border border-dashed border-base-300 rounded-xl text-base-content/60 p-6">
              <AlertCircle className="w-8 h-8 text-base-content/40 mb-2" />
              <p className="text-xs font-bold text-base-content">Sin registros de agenda en este periodo</p>
              <p className="text-[11px] text-base-content/60 mt-1 text-center">
                {selectedMonth === -1
                  ? `No hay consultas registradas en la base de datos para el año ${selectedYear}.`
                  : `No hay consultas registradas en la base de datos para ${MONTHS[selectedMonth]} ${selectedYear}.`}
              </p>
            </div>
          ) : (
            <Bar data={{ labels: chartData.labels, datasets }} options={options} />
          )}
        </div>
      </div>
    </div>
  );
};
