"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  DollarSign,
  Loader2,
  Package,
  ShoppingBag,
  Store,
  Ticket,
} from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { useWorkspaceStore } from "@/shared/store/workspace/useWorkspaceStore";
import {
  BRASS_DOT,
  CARD,
  CARD_HEADER,
  EYEBROW,
  PAGE_TITLE,
} from "@/shared/lib/maison-style";
import { StorefrontEndpoints } from "../services/storefront.endpoints";
import { rangeForPreset, type StorefrontRangePreset } from "../lib/range";
import {
  STOREFRONT_FULFILLMENT_LABELS,
  STOREFRONT_STATUS_LABELS,
  type StorefrontFulfillment,
  type StorefrontMetrics,
  type StorefrontOrderStatus,
} from "../types";

const PRESETS: StorefrontRangePreset[] = [7, 30, 90];

const usd = (value: number): string =>
  `$${(Number.isFinite(value) ? value : 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const quantity = (value: number): string =>
  Number(value).toLocaleString("en-US", { maximumFractionDigits: 2 });

function Kpi({
  icon,
  label,
  value,
  note,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className={`p-5 ${CARD}`}>
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
        <span className="text-[#b2944a]">{icon}</span>
        {label}
      </div>
      <p className="mt-3 font-display text-2xl font-semibold text-[#111018] dark:text-slate-50 tabular-nums">
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{note}</p>
    </div>
  );
}

export function StorefrontMetricsPage() {
  const { addToast } = useToastStore();
  const workspaceName = useWorkspaceStore((s) => s.activeWorkspace?.name);
  const slug = useWorkspaceStore((s) => s.activeWorkspace?.slug);

  const [preset, setPreset] = useState<StorefrontRangePreset>(30);
  const [metrics, setMetrics] = useState<StorefrontMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    const range = rangeForPreset(preset);
    void apiClient
      .get<StorefrontMetrics>(StorefrontEndpoints.metrics, {
        params: range,
      })
      .then(({ data }) => {
        if (alive) setMetrics(data);
      })
      .catch(() => {
        if (!alive) return;
        setError("No se pudieron cargar las métricas de la tienda.");
        addToast({
          type: "error",
          title: "Métricas de la tienda",
          message: "No se pudieron cargar las métricas.",
        });
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [preset, addToast]);

  const maxDailyOrders = useMemo(
    () => Math.max(1, ...(metrics?.daily.map((row) => row.orders) ?? [0])),
    [metrics],
  );

  const statuses = metrics
    ? (Object.keys(STOREFRONT_STATUS_LABELS) as StorefrontOrderStatus[])
    : [];
  const fulfillments = metrics
    ? (Object.keys(STOREFRONT_FULFILLMENT_LABELS) as StorefrontFulfillment[])
    : [];

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className={EYEBROW}>
            <span className="truncate max-w-[180px]">
              {workspaceName ?? "Stockira"}
            </span>
            <span className={BRASS_DOT} aria-hidden />
            <span>Tienda online</span>
            <span className={BRASS_DOT} aria-hidden />
            <span className="font-mono">pedidos</span>
          </div>
          <h1 className={PAGE_TITLE}>Métricas de la tienda</h1>
          <p className="mt-2 max-w-xl text-sm text-slate-500 dark:text-slate-400">
            Pedidos que entraron por tu página pública. No incluye los pedidos
            cargados a mano desde el panel.
          </p>
        </div>

        {slug ? (
          <Link
            href={`/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-2xl bg-[#1a2a46] px-4 py-2.5 text-sm font-semibold text-[#f0ede4] transition-colors hover:bg-[#243a5e]"
          >
            <Store className="h-4 w-4" /> Ver tienda
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </header>

      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((days) => (
          <button
            key={days}
            type="button"
            onClick={() => setPreset(days)}
            aria-pressed={preset === days}
            className={
              preset === days
                ? "rounded-full bg-[#1a2a46] px-3.5 py-1.5 text-xs font-semibold text-[#f0ede4]"
                : "rounded-full border border-[#1a2a46]/15 px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-[#1a2a46]/5 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5"
            }
          >
            {days} días
          </button>
        ))}
        {metrics?.from && metrics?.to ? (
          <span className="ml-1 font-mono text-[11px] uppercase tracking-[0.14em] text-slate-400">
            {metrics.from} → {metrics.to}
          </span>
        ) : null}
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : error ? (
        <div className={`p-6 text-center ${CARD}`}>
          <p className="text-sm text-slate-500">{error}</p>
        </div>
      ) : metrics ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi
              icon={<ShoppingBag className="h-3.5 w-3.5" />}
              label="Pedidos"
              value={String(metrics.totals.orders)}
              note="En el período elegido"
            />
            <Kpi
              icon={<DollarSign className="h-3.5 w-3.5" />}
              label="Ingresos"
              value={usd(metrics.totals.revenueUSD)}
              note="Total de los pedidos"
            />
            <Kpi
              icon={<Ticket className="h-3.5 w-3.5" />}
              label="Ticket promedio"
              value={usd(metrics.totals.avgTicketUSD)}
              note="Por pedido"
            />
            <Kpi
              icon={<Package className="h-3.5 w-3.5" />}
              label="Productos publicados"
              value={String(metrics.publishedProducts)}
              note="Visibles en la tienda"
            />
          </div>

          {metrics.totals.orders === 0 ? (
            <div className={`p-8 text-center ${CARD}`}>
              <Store className="mx-auto h-7 w-7 text-[#b2944a]" />
              <p className="mt-3 text-sm font-semibold text-[#111018] dark:text-slate-100">
                Todavía no hay pedidos de la tienda en este período.
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Compartí el link{" "}
                {slug ? (
                  <Link
                    href={`/${slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-[#b2944a] hover:underline"
                  >
                    /{slug}
                  </Link>
                ) : (
                  "de tu tienda"
                )}{" "}
                y los pedidos van a aparecer acá.
              </p>
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <section className={CARD}>
              <div className={CARD_HEADER}>
                <h2 className="text-[15px] font-semibold tracking-tight text-[#111018] dark:text-slate-100">
                  Pedidos por día
                </h2>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  {metrics.daily.length} día(s)
                </span>
              </div>
              <div className="p-5">
                {metrics.daily.length === 0 ? (
                  <p className="py-6 text-center text-sm text-slate-400">
                    Sin pedidos en el período.
                  </p>
                ) : (
                  <div className="flex h-32 items-end gap-1">
                    {metrics.daily.map((row) => (
                      <div
                        key={row.date}
                        className="flex flex-1 flex-col items-center justify-end gap-1"
                        title={`${row.date}: ${row.orders} pedido(s) · ${usd(row.revenueUSD)}`}
                      >
                        <div
                          className="w-full rounded-t bg-[#b2944a]/70"
                          style={{
                            height: `${Math.max(4, (row.orders / maxDailyOrders) * 104)}px`,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className={CARD}>
              <div className={CARD_HEADER}>
                <h2 className="text-[15px] font-semibold tracking-tight text-[#111018] dark:text-slate-100">
                  Estado de los pedidos
                </h2>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  total
                </span>
              </div>
              <ul className="divide-y divide-[#1b1d21]/8 dark:divide-white/5">
                {statuses.map((status) => (
                  <li
                    key={status}
                    className="flex items-center justify-between px-5 py-3 text-sm"
                  >
                    <span className="text-slate-600 dark:text-slate-300">
                      {STOREFRONT_STATUS_LABELS[status]}
                    </span>
                    <span className="font-mono tabular-nums text-[#111018] dark:text-slate-100">
                      {metrics.byStatus[status].orders}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className={CARD}>
              <div className={CARD_HEADER}>
                <h2 className="text-[15px] font-semibold tracking-tight text-[#111018] dark:text-slate-100">
                  Productos más pedidos
                </h2>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  top 5
                </span>
              </div>
              {metrics.topProducts.length === 0 ? (
                <p className="px-5 py-6 text-sm text-slate-400">
                  Sin productos pedidos todavía.
                </p>
              ) : (
                <ul className="divide-y divide-[#1b1d21]/8 dark:divide-white/5">
                  {metrics.topProducts.map((row) => (
                    <li
                      key={row.productName}
                      className="flex items-center justify-between gap-3 px-5 py-3 text-sm"
                    >
                      <span className="min-w-0 truncate text-slate-600 dark:text-slate-300">
                        {row.productName}
                      </span>
                      <span className="shrink-0 font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                        {quantity(row.quantity)} · {usd(row.revenueUSD)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className={CARD}>
              <div className={CARD_HEADER}>
                <h2 className="text-[15px] font-semibold tracking-tight text-[#111018] dark:text-slate-100">
                  Cómo reciben el pedido
                </h2>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  entrega
                </span>
              </div>
              <ul className="divide-y divide-[#1b1d21]/8 dark:divide-white/5">
                {fulfillments.map((type) => (
                  <li
                    key={type}
                    className="flex items-center justify-between px-5 py-3 text-sm"
                  >
                    <span className="text-slate-600 dark:text-slate-300">
                      {STOREFRONT_FULFILLMENT_LABELS[type]}
                    </span>
                    <span className="font-mono tabular-nums text-[#111018] dark:text-slate-100">
                      {metrics.byFulfillment[type]}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}
