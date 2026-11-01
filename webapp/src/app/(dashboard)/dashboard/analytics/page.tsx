"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import {
  CARD,
  CARD_HEADER,
  EYEBROW,
  PAGE_TITLE,
  TABLE_HEAD,
  TABLE_ROW,
} from "@/shared/lib/maison-style";

/**
 * Platform analytics for global admins — REAL ERP counts only (organizations,
 * users, active subscriptions and the MRR they add up to). Replaces the
 * nutrition-era stats screen; GET /api/dashboard/platform-stats is
 * global-role-only.
 */

interface PlanRow {
  planId: string;
  name: string;
  priceUSD: number;
  count: number;
}

interface PlatformStats {
  organizations: number;
  users: number;
  activeSubscriptions: number;
  mrrUSD: number;
  plans: PlanRow[];
}

function KpiCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className={`${CARD} p-5`}>
      <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-3 font-mono text-[32px] leading-none tabular-nums font-medium text-[#111018] dark:text-slate-50">
        {value}
      </p>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{sub}</p>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get<PlatformStats>(
        "/api/dashboard/platform-stats",
      );
      setStats(data);
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "No se pudieron cargar las métricas de plataforma.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
        <AlertCircle className="h-8 w-8 text-red-400" />
        <p className="text-sm text-slate-500">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-white dark:border-slate-600 dark:text-slate-300"
        >
          <RefreshCw className="h-4 w-4" /> Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className={EYEBROW}>
          <span>Plataforma</span>
        </div>
        <h1 className={PAGE_TITLE}>Analítica</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Cifras reales de la plataforma — sin estimaciones.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Organizaciones"
          value={stats.organizations.toLocaleString("es-VE")}
          sub="Negocios registrados"
        />
        <KpiCard
          label="Usuarios"
          value={stats.users.toLocaleString("es-VE")}
          sub="Cuentas activas"
        />
        <KpiCard
          label="Suscripciones activas"
          value={stats.activeSubscriptions.toLocaleString("es-VE")}
          sub="Planes vigentes"
        />
        <KpiCard
          label="MRR"
          value={`$${stats.mrrUSD.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          sub="Suma de los planes activos"
        />
      </div>

      <div className={`${CARD} overflow-hidden`}>
        <div className={CARD_HEADER}>
          <h2 className="font-semibold text-[15px] tracking-tight text-[#111018] dark:text-slate-100">
            Suscripciones por plan
          </h2>
          <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-[0.14em]">
            activas
          </span>
        </div>
        {stats.plans.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-500 dark:text-slate-400">
            No hay suscripciones activas.
          </p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className={TABLE_HEAD}>
                <th className="px-5 py-2.5 font-medium">Plan</th>
                <th className="px-5 py-2.5 font-medium text-right">Precio</th>
                <th className="px-5 py-2.5 font-medium text-right">
                  Suscripciones
                </th>
                <th className="px-5 py-2.5 font-medium text-right">
                  Contribución
                </th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {stats.plans.map((plan) => (
                <tr key={plan.planId} className={TABLE_ROW}>
                  <td className="px-5 py-3 font-medium text-[#111018] dark:text-slate-100">
                    {plan.name}
                  </td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums">
                    ${plan.priceUSD.toFixed(2)}
                  </td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums">
                    {plan.count}
                  </td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums font-medium">
                    ${(plan.priceUSD * plan.count).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
