"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useAdminAnalytics } from "@/features/dashboard/hooks/useAdminAnalytics";
import ActivityDashboard from "@/features/dashboard/components/ActivityDashboard";
import { useTranslation } from "@/context/i18n.context";
import { BarChart } from "@/shared/components/molecules/Charts/BarChart";
import { PieChart } from "@/shared/components/molecules/Charts/PieChart";
import { RenderPieChart } from "@/types/backend/dashboard.type";
import {
  TrendingUp,
  Users,
  UserCheck,
  Percent,
  Loader2,
  AlertCircle,
  RefreshCw,
  DollarSign,
  MapPin,
  Calculator,
  Stethoscope,
  FileText,
  Clock,
  ArrowUpRight,
  CheckCircle2,
  CreditCard
} from "lucide-react";
import Link from "next/link";
import { apiClient } from "@/shared/api/api.client";
import { CalculatorUsageEndpoints } from "@/features/calculadora/service/calculator-usage.endpoints";

const OfficeLocationsMap = dynamic(
  () => import("@/features/dashboard/components/OfficeLocationsMap"),
  { ssr: false }
);

export default function AdminAnalyticsPage() {
  const { t } = useTranslation();
  const { stats, loading, error, refetch } = useAdminAnalytics();
  const [calculatorUses, setCalculatorUses] = useState<number>(0);

  useEffect(() => {
    apiClient
      .get(CalculatorUsageEndpoints.api.stats)
      .then((res) => {
        const data = res.data;
        const total = (data?.totalPacientes ?? 0) + (data?.totalDeportistas ?? 0) + (data?.totalPediatria ?? 0);
        setCalculatorUses(total);
      })
      .catch(() => {});
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] w-full flex flex-col items-center justify-center bg-transparent">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-slate-500 font-medium animate-pulse">
          Cargando analíticas generales del sistema...
        </p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="card bg-red-50 border border-red-200 p-6 rounded-2xl max-w-2xl mx-auto my-12 shadow-sm text-center">
        <div className="flex justify-center mb-4 text-red-500">
          <AlertCircle size={48} />
        </div>
        <h3 className="text-lg font-bold text-red-800 mb-2">Error al cargar datos</h3>
        <p className="text-red-600 mb-6">{error || "No se pudo establecer conexión con el backend."}</p>
        <button
          onClick={refetch}
          className="btn btn-error text-white font-bold px-6 py-2 rounded-xl flex items-center gap-2 mx-auto"
        >
          <RefreshCw size={16} />
          Intentar de nuevo
        </button>
      </div>
    );
  }

  // Preparar datos para los gráficos
  const revenueLabels = stats.charts.revenueByMonth.map(d => d.month);
  const revenueValues = stats.charts.revenueByMonth.map(d => d.income);

  const userGrowthLabels = (stats.charts.userGrowth || []).map(d => d.month);
  const userGrowthValues = (stats.charts.userGrowth || []).map(d => d.count);

  const clinicalLabels = (stats.charts.clinicalActivity || []).map(d => d.month);
  const clinicalConsultationsValues = (stats.charts.clinicalActivity || []).map(d => d.consultations);

  const planChartConfig: RenderPieChart = {
    id: "plans-distribution",
    title: t("dashboard.sections.analytics.plans_distribution") || "Distribución de Planes",
    data: stats.charts.subscriptionsByPlan,
    keyLabel: "label",
    keyValue: "count",
    type: "doughnut"
  };

  const pendingCount = stats.kpi.pendingPaymentsCount ?? 0;
  const pendingTxs = stats.tables.pendingTransactions || [];

  return (
    <div className="w-full space-y-8 animate-fade-in font-sans text-base-content pb-16">

      {/* HEADER DE LA SECCIÓN */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-base-200">
        <div>
          <h1 className="text-3xl font-black text-base-content tracking-tight flex items-center gap-2">
            <TrendingUp className="text-primary" size={28} />
            {t("dashboard.sections.analytics.sumary") || "Panel Ejecutivo de Analíticas"}
          </h1>
          <p className="text-base-content/70 mt-1 text-sm">
            Telemetría en tiempo real: Adopción del software, flujo clínico y métricas de negocio.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={refetch}
            className="btn btn-outline btn-sm rounded-xl flex items-center gap-2"
          >
            <RefreshCw size={14} />
            Refrescar datos
          </button>
        </div>
      </div>

      {/* KPI CARDS (BENTO GRID SUPERIOR) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">

        {/* MRR */}
        <div className="bg-base-100 p-5 rounded-2xl border border-base-300 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-extrabold text-base-content/60 uppercase tracking-wider">MRR (Ingresos)</p>
            <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-500">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-base-content">
              ${stats.kpi.mrr.toLocaleString("es-ES", { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[11px] text-base-content/70 mt-0.5">Recurrente mensual</p>
          </div>
        </div>

        {/* Nutricionistas */}
        <div className="bg-base-100 p-5 rounded-2xl border border-base-300 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-extrabold text-base-content/60 uppercase tracking-wider">Nutris Activos</p>
            <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-500">
              <Users size={20} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-base-content">
              {stats.kpi.totalNutritionists}
            </h3>
            <p className="text-[11px] text-base-content/70 mt-0.5">Profesionales en plataforma</p>
          </div>
        </div>

        {/* Pacientes */}
        <div className="bg-base-100 p-5 rounded-2xl border border-base-300 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-extrabold text-base-content/60 uppercase tracking-wider">Pacientes Totales</p>
            <div className="p-2.5 bg-purple-500/10 rounded-xl text-purple-500">
              <UserCheck size={20} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-base-content">
              {stats.kpi.totalPatients}
            </h3>
            <p className="text-[11px] text-base-content/70 mt-0.5">Atendidos por profesionales</p>
          </div>
        </div>

        {/* Consultas */}
        <div className="bg-base-100 p-5 rounded-2xl border border-base-300 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-extrabold text-base-content/60 uppercase tracking-wider">Consultas</p>
            <div className="p-2.5 bg-teal-500/10 rounded-xl text-teal-500">
              <Stethoscope size={20} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-base-content">
              {stats.kpi.totalConsultations ?? 0}
            </h3>
            <p className="text-[11px] text-base-content/70 mt-0.5">Atenciones realizadas</p>
          </div>
        </div>

        {/* Planes Nutricionales */}
        <div className="bg-base-100 p-5 rounded-2xl border border-base-300 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-extrabold text-base-content/60 uppercase tracking-wider">Planes Creados</p>
            <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-500">
              <FileText size={20} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-base-content">
              {stats.kpi.totalDietPlans ?? 0}
            </h3>
            <p className="text-[11px] text-base-content/70 mt-0.5">Dietas & menús cargados</p>
          </div>
        </div>

        {/* Pagos Pendientes */}
        <div className={`p-5 rounded-2xl border shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow ${
          pendingCount > 0 
            ? "bg-amber-500/10 border-amber-500/30 text-base-content" 
            : "bg-base-100 border-base-300"
        }`}>
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-extrabold text-base-content/60 uppercase tracking-wider">Pagos Pendientes</p>
            <div className={`p-2.5 rounded-xl ${pendingCount > 0 ? "bg-amber-500/20 text-amber-500" : "bg-base-200 text-base-content/70"}`}>
              <Clock size={20} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-base-content flex items-center gap-2">
              {pendingCount}
              {pendingCount > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 font-bold uppercase">
                  Revisar
                </span>
              )}
            </h3>
            <p className="text-[11px] text-base-content/70 mt-0.5">Por verificar aprobación</p>
          </div>
        </div>

        {/* Usos Calculadora */}
        <div className="bg-base-100 p-5 rounded-2xl border border-base-300 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-extrabold text-base-content/60 uppercase tracking-wider">Calculadoras</p>
            <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-500">
              <Calculator size={20} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-base-content">
              {calculatorUses.toLocaleString()}
            </h3>
            <p className="text-[11px] text-base-content/70 mt-0.5">Cálculos ejecutados</p>
          </div>
        </div>

      </div>

      {/* GRÁFICOS (BENTO GRID INTERMEDIO) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Ingresos vs Tiempo */}
        <div className="bg-base-100 p-6 rounded-2xl border border-base-300 shadow-sm flex flex-col justify-between text-base-content">
          <div className="mb-4">
            <h3 className="font-bold text-lg text-base-content">Historial de Ingresos ($)</h3>
            <p className="text-xs text-base-content/70 mt-0.5">Facturación confirmada últimos 6 meses</p>
          </div>
          <div className="h-64">
            <BarChart
              title="Ingresos ($)"
              labels={revenueLabels}
              values={revenueValues}
              className="h-full"
            />
          </div>
        </div>

        {/* Actividad Clínica (Consultas) */}
        <div className="bg-base-100 p-6 rounded-2xl border border-base-300 shadow-sm flex flex-col justify-between text-base-content">
          <div className="mb-4">
            <h3 className="font-bold text-lg text-base-content">Flujo de Consultas Clínicas</h3>
            <p className="text-xs text-base-content/70 mt-0.5">Consultas atenciones realizadas por mes</p>
          </div>
          <div className="h-64">
            <BarChart
              title="Consultas"
              labels={clinicalLabels}
              values={clinicalConsultationsValues}
              className="h-full"
            />
          </div>
        </div>

        {/* Distribución de Planes */}
        <div className="bg-base-100 p-6 rounded-2xl border border-base-300 shadow-sm flex flex-col justify-between text-base-content">
          <div className="mb-4">
            <h3 className="font-bold text-lg text-base-content">Suscripciones por Plan</h3>
            <p className="text-xs text-base-content/70 mt-0.5">Distribución de nutris por plan activo</p>
          </div>
          <div className="h-64 flex items-center justify-center">
            <PieChart
              config={planChartConfig}
              className="h-full"
            />
          </div>
        </div>

      </div>

      {/* SECCIÓN DE PAGOS PENDIENTES (SI EXISTEN) */}
      {pendingCount > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 shadow-sm text-base-content">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="font-extrabold text-lg text-amber-500 flex items-center gap-2">
                <Clock className="text-amber-500" size={22} />
                Pagos Pendientes de Verificación ({pendingCount})
              </h3>
              <p className="text-xs text-base-content/70 mt-0.5">
                Transacciones que requieren revisión manual y aprobación por el superadmin.
              </p>
            </div>
            <Link
              href="/dashboard/subscriptions"
              className="btn btn-warning btn-sm rounded-xl font-bold flex items-center gap-1.5 shadow-xs"
            >
              Ir a Gestión de Suscripciones
              <ArrowUpRight size={16} />
            </Link>
          </div>

          <div className="overflow-x-auto bg-base-100 rounded-xl border border-base-300">
            <table className="table w-full text-left border-collapse">
              <thead>
                <tr className="bg-base-200 border-b border-base-300 text-xs font-bold text-base-content uppercase tracking-wider">
                  <th className="px-5 py-3">Fecha</th>
                  <th className="px-5 py-3">Usuario / Nutri</th>
                  <th className="px-5 py-3">Método de Pago</th>
                  <th className="px-5 py-3">Monto</th>
                  <th className="px-5 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base-200 text-sm">
                {pendingTxs.map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-base-200/50 transition-colors">
                    <td className="px-5 py-3 font-mono text-base-content/70 text-xs">
                      {new Date(tx.createdAt).toLocaleDateString("es-ES", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </td>
                    <td className="px-5 py-3 font-semibold text-base-content">{tx.user?.email || tx.userId}</td>
                    <td className="px-5 py-3 text-base-content/70 text-xs font-medium">
                      {tx.paymentMethod?.name || tx.type || "Pago Móvil / Transferencia"}
                    </td>
                    <td className="px-5 py-3 font-extrabold text-base-content">${Number(tx.amount).toFixed(2)}</td>
                    <td className="px-5 py-3">
                      <span className="badge badge-warning badge-sm font-bold px-2.5 py-1">
                        PENDIENTE
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TABLAS INFERIORES */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Últimas Transacciones (Ancho 2/3) */}
        <div className="bg-base-100 rounded-2xl border border-base-300 shadow-sm overflow-hidden xl:col-span-2 text-base-content">
          <div className="p-6 border-b border-base-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg text-base-content">Historial Reciente de Transacciones</h3>
              <p className="text-xs text-base-content/70 mt-0.5">Últimos pagos procesados en el sistema</p>
            </div>
            <CreditCard className="text-base-content/50" size={20} />
          </div>
          <div className="overflow-x-auto">
            <table className="table w-full text-left border-collapse">
              <thead>
                <tr className="bg-base-200 border-b border-base-300 text-xs font-bold text-base-content/70 uppercase tracking-wider">
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4">Usuario/Email</th>
                  <th className="px-6 py-4">Monto</th>
                  <th className="px-6 py-4">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base-200 text-sm">
                {stats.tables.recentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-base-content/60">
                      No hay transacciones registradas.
                    </td>
                  </tr>
                ) : (
                  stats.tables.recentTransactions.map((tx: any) => (
                    <tr key={tx.id} className="hover:bg-base-200/50 transition-colors">
                      <td className="px-6 py-4 font-mono text-base-content/70 text-xs">
                        {new Date(tx.createdAt).toLocaleDateString("es-ES", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </td>
                      <td className="px-6 py-4 font-medium text-base-content">{tx.user?.email || "N/A"}</td>
                      <td className="px-6 py-4 font-bold text-base-content">${Number(tx.amount).toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span className={`badge badge-sm border-none px-2.5 py-1 font-bold ${tx.status === "SUCCESS"
                          ? "badge-success"
                          : tx.status === "PENDING"
                          ? "badge-warning"
                          : "badge-error"
                          }`}>
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Nutricionistas (Ancho 1/3) */}
        <div className="bg-base-100 rounded-2xl border border-base-300 shadow-sm overflow-hidden text-base-content">
          <div className="p-6 border-b border-base-200">
            <h3 className="font-bold text-lg text-base-content">Top Nutricionistas</h3>
            <p className="text-xs text-base-content/70 mt-0.5">Profesionales con mayor volumen de pacientes</p>
          </div>
          <div className="divide-y divide-base-200">
            {stats.tables.topUsers.length === 0 ? (
              <div className="p-8 text-center text-base-content/60 text-sm">
                No hay registros disponibles.
              </div>
            ) : (
              stats.tables.topUsers.map((user, idx) => (
                <div key={idx} className="p-4 flex items-center justify-between hover:bg-base-200/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-black text-primary text-sm">
                      {idx + 1}
                    </div>
                    <div>
                      <h4 className="font-bold text-base-content text-sm">{user.name}</h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase tracking-wider">
                        {user.plan}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-base-content">{user.patients}</span>
                    <p className="text-[10px] text-base-content/60 font-bold uppercase tracking-wider">Pacientes</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* CONSULTORIOS Y MAPA */}
      <div className="pt-8 border-t border-base-200 space-y-4">
        <div className="flex items-center gap-2">
          <MapPin className="text-primary" size={22} />
          <h2 className="text-2xl font-bold text-base-content tracking-tight">
            {t("dashboard.sections.analytics.office_locations") || "Ubicaciones de Consultorios"}
          </h2>
        </div>
        <p className="text-sm text-base-content/70">
          Ubicaciones geográficas de consultorios registrados por los nutricionistas activos.
        </p>
        <OfficeLocationsMap />
      </div>

      {/* ACTIVIDAD GLOBAL DE AUDITORÍA */}
      <div className="pt-4 border-t border-base-200">
        <ActivityDashboard scope="GLOBAL" />
      </div>

    </div>
  );
}
