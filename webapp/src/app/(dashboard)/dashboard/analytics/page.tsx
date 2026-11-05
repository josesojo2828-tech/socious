"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowUpRight,
  Loader2,
  RefreshCw,
  UserPlus,
} from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { ExchangeEndpoints } from "@/features/exchange/services/exchange.endpoints";
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

interface RecentUser {
  id: string;
  name: string;
  email: string;
  status: string;
  createdAt: string;
  permitName: string | null;
}

interface PlatformStats {
  organizations: number;
  users: number;
  activeUsersToday: number;
  newUsersToday: number;
  recentUsers: RecentUser[];
  activeSubscriptions: number;
  mrrUSD: number;
  plans: PlanRow[];
}

interface RatesSnapshot {
  rateBcv: number;
  rateUsdt: number;
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
  const [rates, setRates] = useState<RatesSnapshot | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsResponse, ratesResponse] = await Promise.all([
        apiClient.get<PlatformStats>("/api/dashboard/platform-stats"),
        apiClient
          .get<{ rateBcv: number | string; rateUsdt: number | string }>(
            ExchangeEndpoints.latest,
          )
          .catch(() => ({ data: null })),
      ]);
      setStats(statsResponse.data);
      if (ratesResponse.data) {
        setRates({
          rateBcv: Number(ratesResponse.data.rateBcv) || 0,
          rateUsdt: Number(ratesResponse.data.rateUsdt) || 0,
        });
      }
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

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <KpiCard
          label="Organizaciones"
          value={stats.organizations.toLocaleString("es-VE")}
          sub="Negocios registrados"
        />
        <KpiCard
          label="Usuarios"
          value={stats.users.toLocaleString("es-VE")}
          sub="Cuentas registradas"
        />
        <KpiCard
          label="Activos hoy"
          value={stats.activeUsersToday.toLocaleString("es-VE")}
          sub="Con sesión abierta hoy"
        />
        <KpiCard
          label="Nuevos hoy"
          value={stats.newUsersToday.toLocaleString("es-VE")}
          sub="Registrados hoy"
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={`${CARD} p-5`}>
          <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-slate-500 dark:text-slate-400">
            Tasas del día
          </p>
          {rates ? (
            <div className="mt-4 space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-slate-600 dark:text-slate-300">
                  BCV (Bs/USD)
                </span>
                <span className="font-mono text-xl tabular-nums font-medium text-[#111018] dark:text-slate-50">
                  {rates.rateBcv.toLocaleString("es-VE", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-slate-600 dark:text-slate-300">
                  USDT
                </span>
                <span className="font-mono text-xl tabular-nums font-medium text-[#111018] dark:text-slate-50">
                  {rates.rateUsdt.toLocaleString("es-VE", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              Sin tasas registradas hoy.
            </p>
          )}
        </div>

        <div className={`${CARD} overflow-hidden lg:col-span-2`}>
          <div className={CARD_HEADER}>
            <h2 className="flex items-center gap-2 font-semibold text-[15px] tracking-tight text-[#111018] dark:text-slate-100">
              <UserPlus className="h-4 w-4 text-[#b2944a]" />
              Últimos registros
            </h2>
            <Link
              href="/dashboard/users"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#b2944a] hover:underline"
            >
              Ver todos <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {stats.recentUsers.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-500 dark:text-slate-400">
              Todavía no hay usuarios registrados.
            </p>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className={TABLE_HEAD}>
                  <th className="px-5 py-2.5 font-medium">Usuario</th>
                  <th className="px-5 py-2.5 font-medium">Rol</th>
                  <th className="px-5 py-2.5 font-medium text-right">
                    Registrado
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {stats.recentUsers.map((row) => (
                  <tr key={row.id} className={TABLE_ROW}>
                    <td className="px-5 py-3">
                      <Link
                        href={`/dashboard/users/${row.id}`}
                        className="font-medium text-[#111018] dark:text-slate-100 hover:text-[#b2944a] transition-colors"
                      >
                        {row.name}
                      </Link>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {row.email}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {row.permitName ?? "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                      {new Date(row.createdAt).toLocaleDateString("es-VE", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
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
