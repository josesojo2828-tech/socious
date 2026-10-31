"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { AlertCircle, ArrowDownRight, ArrowUpRight, Loader2, RefreshCw } from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { SaleEndpoints } from "@/features/sales/services/sales.endpoints";
import { OrderEndpoints } from "@/features/orders/services/orders.endpoints";
import {
  buildWeekHeat,
  isoDaysAgo,
  localDayKey,
  percentDelta,
  usd,
  type WeekHeat,
} from "../lib/home-metrics";

/**
 * Panel del dashboard con datos reales (nada de pronósticos): KPIs del día,
 * saldo por cobrar, pedidos y el mapa de calor de ventas por día.
 */

interface SalesReportSlice {
  issued: { count: number; totalUSD: number };
  aging: {
    current: number;
    days1_30: number;
    days31_60: number;
    over60: number;
  };
  openItems: {
    id: string;
    saleNumber: string;
    issueDate: string;
    totalUSD: number;
    daysOverdue: number;
    client: { id: string; name: string } | null;
  }[];
}

interface OrderRow {
  id: string;
  orderNumber: string;
  customerName: string;
  totalUSD: string | number;
  status: "PENDING" | "CONFIRMED" | "PREPARING" | "DELIVERED" | "CANCELLED";
  createdAt: string;
}

interface SaleRow {
  id: string;
  issueDate: string;
}

const ORDER_STATUS: Record<OrderRow["status"], { label: string; className: string }> = {
  PENDING: {
    label: "Pendiente",
    className: "bg-amber-500/10 text-amber-700 border-amber-500/25 dark:text-amber-300",
  },
  CONFIRMED: {
    label: "Confirmado",
    className: "bg-sky-500/10 text-sky-700 border-sky-500/25 dark:text-sky-300",
  },
  PREPARING: {
    label: "Preparando",
    className: "bg-indigo-500/10 text-indigo-700 border-indigo-500/25 dark:text-indigo-300",
  },
  DELIVERED: {
    label: "Entregado",
    className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-300",
  },
  CANCELLED: {
    label: "Cancelado",
    className: "bg-slate-500/10 text-slate-500 border-slate-500/25 dark:text-slate-400",
  },
};

function CardHeader({ title, note }: { title: string; note: string }) {
  return (
    <div className="px-5 py-3.5 border-b border-[#1b1d21]/12 flex items-baseline justify-between">
      <h2 className="font-semibold text-[15px] tracking-tight text-[#1b1d21]">
        {title}
      </h2>
      <span className="font-mono text-[10px] text-[#1b1d21]/65 uppercase tracking-[0.14em]">
        {note}
      </span>
    </div>
  );
}

export default function HomeDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todayCount, setTodayCount] = useState(0);
  const [todayUSD, setTodayUSD] = useState(0);
  const [deltaPct, setDeltaPct] = useState<number | null>(null);
  const [arTotalUSD, setArTotalUSD] = useState(0);
  const [openItems, setOpenItems] = useState<SalesReportSlice["openItems"]>([]);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [recentOrders, setRecentOrders] = useState<OrderRow[]>([]);
  const [heat, setHeat] = useState<WeekHeat | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const today = localDayKey(new Date());
      const yesterday = isoDaysAgo(1);

      const [todayReport, yesterdayReport, arReport, pendingRes, ordersRes] =
        await Promise.all([
          apiClient
            .get<SalesReportSlice>(
              `${SaleEndpoints.report}?from=${today}&to=${today}`,
            )
            .then((r) => r.data),
          apiClient
            .get<SalesReportSlice>(
              `${SaleEndpoints.report}?from=${yesterday}&to=${yesterday}`,
            )
            .then((r) => r.data),
          apiClient
            .get<SalesReportSlice>(SaleEndpoints.report)
            .then((r) => r.data),
          apiClient
            .get<{ total: number }>(OrderEndpoints.list, {
              params: { status: "PENDING", limit: 1 },
            })
            .then((r) => r.data),
          apiClient
            .get<{ list: OrderRow[] }>(OrderEndpoints.list, {
              params: { limit: 5 },
            })
            .then((r) => r.data),
        ]);

      // Heat: hasta500 ventas de las últimas4 semanas (5 páginas de100).
      const from = isoDaysAgo(27);
      const firstPage = await apiClient
        .get<{ list: SaleRow[]; totalPages: number }>(SaleEndpoints.list, {
          params: { from, limit: 100, page: 1 },
        })
        .then((r) => r.data);
      const extraPages = Math.min(Math.max(firstPage.totalPages - 1, 0), 4);
      const restPages =
        extraPages > 0
          ? await Promise.all(
              Array.from({ length: extraPages }, (_, i) =>
                apiClient
                  .get<{ list: SaleRow[] }>(SaleEndpoints.list, {
                    params: { from, limit: 100, page: i + 2 },
                  })
                  .then((r) => r.data),
              ),
            )
          : [];
      const saleRows: SaleRow[] = [
        ...firstPage.list,
        ...restPages.flatMap((page) => page.list),
      ];

      const aging = arReport.aging;
      setTodayCount(todayReport.issued.count);
      setTodayUSD(todayReport.issued.totalUSD);
      setDeltaPct(
        percentDelta(todayReport.issued.totalUSD, yesterdayReport.issued.totalUSD),
      );
      setArTotalUSD(
        aging.current + aging.days1_30 + aging.days31_60 + aging.over60,
      );
      setOpenItems(
        [...arReport.openItems].sort(
          (a, b) =>
            new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime(),
        ),
      );
      setPendingOrders(pendingRes.total);
      setRecentOrders(ordersRes.list ?? []);
      setHeat(buildWeekHeat(saleRows, 4));
    } catch {
      setError("No se pudieron cargar los datos del panel.");
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

  if (error) {
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

  const kpis: {
    label: string;
    value: string;
    sub: string;
    deltaPct?: number | null;
  }[] = [
    {
      label: "Ventas hoy",
      value: usd(todayUSD),
      sub: `${todayCount} venta${todayCount === 1 ? "" : "s"} · vs ayer`,
      deltaPct,
    },
    {
      label: "Dinero en la calle",
      value: usd(arTotalUSD),
      sub: "Saldo total por cobrar",
    },
    {
      label: "Cuentas por cobrar",
      value: String(openItems.length),
      sub: "Facturas abiertas",
    },
    {
      label: "Pedidos pendientes",
      value: String(pendingOrders),
      sub: "En la bandeja",
    },
  ];

  const arTop = openItems.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Título sobre el fondo de la página */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#1b1d21] dark:text-slate-100">
            Dashboard
          </h1>
          <p className="font-mono text-[11px] text-[#1b1d21]/65 dark:text-slate-400 mt-1">
            DATOS EN VIVO · SOCIOUS ERP
          </p>
        </div>
        <span className="font-mono text-[11px] text-[#1b1d21]/65 dark:text-slate-400 tnum">
          {new Date().toLocaleDateString("es-VE", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}
        </span>
      </div>

      {/* KPIs: cada stat en su propia card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const showDelta =
            kpi.deltaPct !== null && kpi.deltaPct !== undefined;
          const up = (kpi.deltaPct ?? 0) >= 0;
          return (
            <div
              key={kpi.label}
              className="rounded-xl bg-white dark:bg-slate-900 border border-[#1b1d21]/12 dark:border-white/10 shadow-[0_1px_2px_rgba(27,29,33,0.05)] p-5"
            >
              <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-[#1b1d21]/65 dark:text-slate-400">
                {kpi.label}
              </p>
              <div className="mt-4 flex items-end justify-between gap-2">
                <span className="font-mono text-[28px] sm:text-[32px] leading-none font-medium tnum text-[#1b1d21] dark:text-slate-50">
                  {kpi.value}
                </span>
                {showDelta ? (
                  <span
                    className={`font-mono text-[12px] tnum mb-1 flex items-center gap-0.5 ${
                      up ? "text-[#128454]" : "text-[#c63749]"
                    }`}
                  >
                    {up ? (
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowDownRight className="h-3.5 w-3.5" />
                    )}
                    {up ? "+" : ""}
                    {kpi.deltaPct!.toFixed(1)}%
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-xs text-[#1b1d21]/55 dark:text-slate-400">
                {kpi.sub}
              </p>
            </div>
          );
        })}
      </div>

      {/* Cuerpo: heat + tablas, cada uno en su card */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <section className="xl:col-span-7">
          <div className="rounded-xl bg-white dark:bg-slate-900 border border-[#1b1d21]/12 dark:border-white/10 shadow-[0_1px_2px_rgba(27,29,33,0.05)] overflow-hidden">
            <CardHeader title="Ventas por día" note="últimas 4 semanas" />
            <div className="p-5">
              {heat ? (
                <>
                  <div className="overflow-x-auto">
                    <div className="min-w-[420px]">
                      <div
                        className="grid gap-1"
                        style={{
                          gridTemplateColumns: "64px repeat(7, minmax(0,1fr))",
                        }}
                      >
                        <span />
                        {heat.weekdays.map((day) => (
                          <span
                            key={day}
                            className="text-center font-mono text-[10px] text-[#1b1d21]/55 dark:text-slate-400 pb-1"
                          >
                            {day}
                          </span>
                        ))}
                        {heat.cells.map((row, weekIdx) => (
                          <Fragment key={heat.labels[weekIdx]}>
                            <span className="flex items-center justify-end pr-2 font-mono text-[10px] text-[#1b1d21]/55 dark:text-slate-400">
                              {heat.labels[weekIdx]}
                            </span>
                            {row.map((count, dayIdx) => {
                              if (count === null) {
                                return (
                                  <div
                                    key={dayIdx}
                                    className="h-9 rounded-[3px] border border-dashed border-[#1b1d21]/10 dark:border-white/10"
                                  />
                                );
                              }
                              const ratio = count / heat.max;
                              const opacity =
                                count === 0 ? 0.04 : 0.18 + ratio * 0.74;
                              return (
                                <div
                                  key={dayIdx}
                                  title={`${count} venta${count === 1 ? "" : "s"}`}
                                  className="h-9 rounded-[3px] flex items-center justify-center font-mono text-[11px] tnum"
                                  style={{
                                    backgroundColor: `rgba(79,70,229,${opacity})`,
                                    color:
                                      count > 0 && ratio > 0.55
                                        ? "rgba(255,255,255,0.95)"
                                        : "rgba(27,29,33,0.55)",
                                  }}
                                >
                                  {count}
                                </div>
                              );
                            })}
                          </Fragment>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-[#1b1d21]/12 dark:border-white/10 flex items-center justify-between">
                    <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-[#1b1d21]/65 dark:text-slate-400">
                      Ventas
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-[#1b1d21]/65 dark:text-slate-400">
                        0
                      </span>
                      <div className="flex">
                        {[0.08, 0.25, 0.45, 0.68, 0.9].map((opacity) => (
                          <div
                            key={opacity}
                            className="w-6 h-3"
                            style={{
                              backgroundColor: `rgba(79,70,229,${opacity})`,
                            }}
                          />
                        ))}
                      </div>
                      <span className="font-mono text-[10px] text-[#1b1d21]/65 dark:text-slate-400">
                        {heat.max}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-500 py-6 text-center">
                  Sin datos de ventas.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="xl:col-span-5 space-y-6">
          <div className="rounded-xl bg-white dark:bg-slate-900 border border-[#1b1d21]/12 dark:border-white/10 shadow-[0_1px_2px_rgba(27,29,33,0.05)] overflow-hidden">
            <CardHeader title="Cuentas por cobrar" note="más recientes" />
            {arTop.length === 0 ? (
              <p className="px-5 py-6 text-sm text-[#1b1d21]/55 dark:text-slate-400 text-center">
                Todo cobrado: no hay cuentas abiertas.
              </p>
            ) : (
              <ul className="divide-y divide-[#1b1d21]/12 dark:divide-white/10">
                {arTop.map((item) => (
                  <li key={item.id} className="px-5 py-3 flex items-center gap-3">
                    <span className="font-mono text-[12px] tnum text-[#1b1d21]/75 dark:text-slate-300 w-24 shrink-0">
                      {item.saleNumber}
                    </span>
                    <span className="flex-1 min-w-0 text-[13px] truncate text-[#1b1d21] dark:text-slate-100">
                      {item.client?.name ?? "Sin cliente"}
                    </span>
                    <span
                      className={`font-mono text-[11px] tnum ${
                        item.daysOverdue > 0
                          ? "text-[#c63749]"
                          : "text-[#1b1d21]/55 dark:text-slate-400"
                      }`}
                    >
                      {item.daysOverdue > 0 ? `${item.daysOverdue}d` : "al día"}
                    </span>
                    <span className="font-mono text-[12px] tnum font-medium text-right w-20 text-[#1b1d21] dark:text-slate-100">
                      {usd(item.totalUSD)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl bg-white dark:bg-slate-900 border border-[#1b1d21]/12 dark:border-white/10 shadow-[0_1px_2px_rgba(27,29,33,0.05)] overflow-hidden">
            <CardHeader title="Pedidos" note="recientes" />
            {recentOrders.length === 0 ? (
              <p className="px-5 py-6 text-sm text-[#1b1d21]/55 dark:text-slate-400 text-center">
                Sin pedidos todavía.
              </p>
            ) : (
              <ul className="divide-y divide-[#1b1d21]/12 dark:divide-white/10">
                {recentOrders.map((order) => {
                  const status =
                    ORDER_STATUS[order.status] ?? ORDER_STATUS.PENDING;
                  return (
                    <li
                      key={order.id}
                      className="px-5 py-3 flex items-center gap-3"
                    >
                      <span className="font-mono text-[12px] tnum text-[#1b1d21]/75 dark:text-slate-300 w-24 shrink-0">
                        {order.orderNumber}
                      </span>
                      <span className="flex-1 min-w-0 text-[13px] truncate text-[#1b1d21] dark:text-slate-100">
                        {order.customerName}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap ${status.className}`}
                      >
                        {status.label}
                      </span>
                      <span className="font-mono text-[12px] tnum font-medium text-right w-20 text-[#1b1d21] dark:text-slate-100">
                        {usd(Number(order.totalUSD))}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
