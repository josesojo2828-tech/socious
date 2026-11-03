"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { SaleEndpoints } from "@/features/sales/services/sales.endpoints";
import { PurchaseEndpoints } from "@/features/purchases/services/purchases.endpoints";
import { ExchangeEndpoints } from "@/features/exchange/services/exchange.endpoints";
import { MultyLineChart } from "@/shared/components/molecules/Charts/MultiLineChart";
import {
  BRASS_DOT,
  CARD,
  CARD_HEADER,
  EYEBROW,
  GLASS,
  INPUT,
  PAGE_TITLE,
} from "@/shared/lib/maison-style";
import {
  buildFinancialSummary,
  type FinancialReportSlice,
  type FinancialSummary,
} from "@/features/finanzas/lib/financial-summary";
import {
  buildRateDifferentials,
  filterRatesByRange,
  type RateHistoryRow,
  type RateSnapshotDifferentials,
} from "@/features/finanzas/lib/rate-differentials";
import {
  PERIOD_PRESET_LABELS,
  periodPresetRange,
  type PeriodPreset,
} from "@/features/finanzas/lib/period-range";

/**
 * Financial dashboard (S1–S2): Ventas − Compras del período with date
 * presets, cash collected/paid, open balances and the BCV/USDT/parallel
 * rate differentials over the same range. Composes the existing sales and
 * purchases report endpoints — no new backend surface.
 */

const PRESETS: PeriodPreset[] = [
  "hoy",
  "siete-dias",
  "treinta-dias",
  "mes-actual",
  "personalizado",
];

function money(value: number): string {
  const sign = value < 0 ? "−" : "";
  return `${sign}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function apiMessage(error: unknown, fallback: string): string {
  const maybe = error as { response?: { data?: { message?: string } } };
  return maybe?.response?.data?.message || fallback;
}

function formatDay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-VE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function KpiCard({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "neutral" | "positive" | "negative" | "accent";
}) {
  const toneClass =
    tone === "positive"
      ? "text-[#128454] dark:text-emerald-400"
      : tone === "negative"
        ? "text-[#c63749] dark:text-red-400"
        : tone === "accent"
          ? "text-[#b2944a] dark:text-[#d8c084]"
          : "text-[#111018] dark:text-slate-50";
  return (
    <div className={`rounded-xl p-5 ${GLASS}`}>
      <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p
        className={`mt-3 font-mono text-[28px] leading-none tabular-nums font-semibold ${toneClass}`}
      >
        {value}
      </p>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{sub}</p>
    </div>
  );
}

export default function FinanzasPage() {
  const [preset, setPreset] = useState<PeriodPreset>("treinta-dias");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const [salesReport, setSalesReport] = useState<FinancialReportSlice | null>(
    null,
  );
  const [purchasesReport, setPurchasesReport] =
    useState<FinancialReportSlice | null>(null);
  const [rateRows, setRateRows] = useState<RateHistoryRow[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [salesError, setSalesError] = useState<string | null>(null);
  const [purchasesError, setPurchasesError] = useState<string | null>(null);
  const [ratesError, setRatesError] = useState<string | null>(null);

  // Resolved [from, to] for the active preset (custom keeps the inputs).
  const range = useMemo(() => {
    if (preset === "personalizado") {
      return { from: customFrom, to: customTo };
    }
    return periodPresetRange(preset) ?? { from: "", to: "" };
  }, [preset, customFrom, customTo]);

  const load = useCallback(async () => {
    setLoading(true);
    setSalesError(null);
    setPurchasesError(null);
    setRatesError(null);

    const from = range.from;
    const to = range.to;
    const query = from && to ? `?from=${from}&to=${to}` : "";

    const [salesRes, purchasesRes, ratesRes] = await Promise.allSettled([
      apiClient.get<FinancialReportSlice>(`${SaleEndpoints.report}${query}`),
      apiClient.get<FinancialReportSlice>(
        `${PurchaseEndpoints.report}${query}`,
      ),
      apiClient
        .get<RateHistoryRow[]>(ExchangeEndpoints.history, {
          params: { limit: 200 },
        })
        // The endpoint answers a bare array today; tolerate a wrapped body.
        .then((res) =>
          Array.isArray(res.data)
            ? res.data
            : ((res.data as { list?: RateHistoryRow[] }).list ?? []),
        ),
    ]);

    if (salesRes.status === "fulfilled") {
      setSalesReport(salesRes.value.data);
    } else {
      setSalesReport(null);
      setSalesError(
        apiMessage(salesRes.reason, "No se pudo cargar el reporte de ventas."),
      );
    }

    if (purchasesRes.status === "fulfilled") {
      setPurchasesReport(purchasesRes.value.data);
    } else {
      setPurchasesReport(null);
      setPurchasesError(
        apiMessage(
          purchasesRes.reason,
          "No se pudo cargar el reporte de compras.",
        ),
      );
    }

    if (ratesRes.status === "fulfilled") {
      setRateRows(ratesRes.value);
    } else {
      setRateRows([]);
      setRatesError(
        apiMessage(ratesRes.reason, "No se pudo cargar el historial de tasas."),
      );
    }

    setLoading(false);
  }, [range.from, range.to]);

  useEffect(() => {
    void load();
  }, [load]);

  const summary: FinancialSummary | null =
    salesReport && purchasesReport
      ? buildFinancialSummary(salesReport, purchasesReport)
      : null;

  const inRangeRates = useMemo(
    () => filterRatesByRange(rateRows, range.from, range.to),
    [rateRows, range.from, range.to],
  );

  const snapshot: RateSnapshotDifferentials | null = useMemo(
    () => buildRateDifferentials(inRangeRates),
    [inRangeRates],
  );

  const chart = useMemo(() => {
    // Oldest → newest for a left-to-right time axis.
    const sorted = [...inRangeRates].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    const labels = sorted.map((row) =>
      new Date(row.date).toLocaleDateString("es-VE", {
        day: "2-digit",
        month: "short",
      }),
    );
    const hasParallel = sorted.some(
      (row) => row.rateParallel != null && Number(row.rateParallel) > 0,
    );
    const datasets = [
      {
        label: "BCV",
        data: sorted.map((row) => Number(row.rateBcv) || 0),
        color: "#1a2a46",
      },
      {
        label: "USDT",
        data: sorted.map((row) => Number(row.rateUsdt) || 0),
        color: "#b2944a",
      },
      ...(hasParallel
        ? [
            {
              label: "Paralelo",
              data: sorted.map((row) => Number(row.rateParallel) || 0),
              color: "#128454",
            },
          ]
        : []),
    ];
    return { labels, datasets, empty: sorted.length === 0 };
  }, [inRangeRates]);

  const rangeLabel =
    range.from && range.to ? `${range.from} → ${range.to}` : "sin rango";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const resultTone =
    summary && summary.resultUSD > 0
      ? "positive"
      : summary && summary.resultUSD < 0
        ? "negative"
        : "neutral";

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className={EYEBROW}>
            <span>Finanzas</span>
            <span className={BRASS_DOT} aria-hidden />
            <span className="font-mono">{rangeLabel}</span>
          </div>
          <h1 className={PAGE_TITLE}>Dashboard financiero</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Ganancia y pérdida del período (ventas − compras), flujo de caja y
            diferencial entre tasas.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-xl border border-[#1a2a46]/15 px-4 py-2 text-sm font-semibold text-[#1a2a46] hover:bg-[#1a2a46]/5 dark:border-white/15 dark:text-slate-200"
        >
          <RefreshCw className="h-4 w-4" /> Actualizar
        </button>
      </header>

      {/* ===== Filtros de fecha ===== */}
      <div className={`rounded-2xl p-4 ${GLASS} space-y-3`}>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setPreset(key)}
              className={
                preset === key
                  ? "h-9 px-4 rounded-full bg-[#1a2a46] text-[#f0ede4] text-xs font-semibold tracking-wide dark:bg-[#b2944a] dark:text-[#111018]"
                  : "h-9 px-4 rounded-full text-xs font-medium text-[#1a2a46]/70 border border-[#1a2a46]/10 hover:bg-white/70 dark:text-slate-300 dark:border-white/10 dark:hover:bg-white/10"
              }
            >
              {PERIOD_PRESET_LABELS[key]}
            </button>
          ))}
        </div>
        {preset === "personalizado" ? (
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Desde
              <input
                type="date"
                value={customFrom}
                onChange={(event) => setCustomFrom(event.target.value)}
                className={`mt-1 block ${INPUT}`}
              />
            </label>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Hasta
              <input
                type="date"
                value={customTo}
                onChange={(event) => setCustomTo(event.target.value)}
                className={`mt-1 block ${INPUT}`}
              />
            </label>
            <p className="pb-2 text-xs text-slate-400">
              {customFrom && customTo
                ? "Ambos campos son obligatorios para aplicar el filtro."
                : "Completá desde y hasta para filtrar."}
            </p>
          </div>
        ) : null}
      </div>

      {/* ===== KPIs ===== */}
      {summary ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <KpiCard
            label="Ventas del período"
            value={money(summary.salesUSD)}
            sub={`${summary.salesCount} factura${summary.salesCount === 1 ? "" : "s"} emitida${summary.salesCount === 1 ? "" : "s"}`}
          />
          <KpiCard
            label="Compras del período"
            value={money(summary.purchasesUSD)}
            sub={`${summary.purchasesCount} factura${summary.purchasesCount === 1 ? "" : "s"} emitida${summary.purchasesCount === 1 ? "" : "s"}`}
          />
          <div className={`rounded-xl p-5 ${CARD} border-2 ${
            resultTone === "positive"
              ? "border-emerald-500/40"
              : resultTone === "negative"
                ? "border-red-500/40"
                : "border-transparent"
          }`}>
            <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-slate-500 dark:text-slate-400">
              {summary.resultUSD >= 0 ? "Ganancia del período" : "Pérdida del período"}
            </p>
            <div className="mt-3 flex items-center gap-2">
              {summary.resultUSD !== 0 ? (
                summary.resultUSD > 0 ? (
                  <ArrowUpRight className={`h-5 w-5 ${
                    summary.resultUSD >= 0
                      ? "text-[#128454] dark:text-emerald-400"
                      : "text-[#c63749] dark:text-red-400"
                  }`} />
                ) : (
                  <ArrowDownRight className="h-5 w-5 text-[#c63749] dark:text-red-400" />
                )
              ) : null}
              <p className={`font-mono text-[28px] leading-none tabular-nums font-semibold ${
                summary.resultUSD > 0
                  ? "text-[#128454] dark:text-emerald-400"
                  : summary.resultUSD < 0
                    ? "text-[#c63749] dark:text-red-400"
                    : "text-[#111018] dark:text-slate-50"
              }`}>
                {money(summary.resultUSD)}
              </p>
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Ventas − Compras · no es margen de inventario
            </p>
          </div>

          <KpiCard
            label="Cobrado en el período"
            value={money(summary.collectedUSD)}
            sub="Pagos de ventas con fecha en el rango"
            tone="positive"
          />
          <KpiCard
            label="Pagado en el período"
            value={money(summary.paidUSD)}
            sub="Pagos a proveedores con fecha en el rango"
          />
          <KpiCard
            label="Flujo neto cobrado − pagado"
            value={money(summary.collectedUSD - summary.paidUSD)}
            sub="Caja del período (solo pagos)"
            tone={
              summary.collectedUSD - summary.paidUSD > 0
                ? "positive"
                : summary.collectedUSD - summary.paidUSD < 0
                  ? "negative"
                  : "neutral"
            }
          />
        </div>
      ) : (
        <div className={`rounded-xl p-5 ${GLASS} flex items-center gap-3`}>
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {salesError && purchasesError
              ? "No se pudieron cargar los reportes financieros."
              : salesError || purchasesError || "Faltan datos para el resumen."}
          </p>
        </div>
      )}

      {/* Errores parciales: un reporte solo no tumba el otro. */}
      {summary && (salesError || purchasesError) ? (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          {salesError ?? ""} {purchasesError ?? ""}
        </p>
      ) : null}

      {/* ===== Saldos actuales ===== */}
      {summary ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <KpiCard
            label="Por cobrar (cartera abierta)"
            value={money(summary.receivableUSD)}
            sub="Suma del aging de ventas — no depende del filtro"
            tone="accent"
          />
          <KpiCard
            label="Por pagar (cartera abierta)"
            value={money(summary.payableUSD)}
            sub="Suma del aging de compras — no depende del filtro"
            tone="accent"
          />
        </div>
      ) : null}

      {/* ===== Tasas y diferencial (S2) ===== */}
      <section className={`rounded-2xl overflow-hidden ${CARD}`}>
        <div className={CARD_HEADER}>
          <h2 className="font-semibold text-[17px] tracking-tight text-[#111018] dark:text-slate-100">
            Tasas y diferencial cambiario
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            {range.from && range.to ? "en el rango filtrado" : "historial reciente"}
          </span>
        </div>

        {ratesError ? (
          <p className="px-5 py-6 text-sm text-slate-500">{ratesError}</p>
        ) : snapshot ? (
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-[#1a2a46]/10 dark:border-white/10 p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  BCV
                </p>
                <p className="mt-1.5 font-mono text-lg tabular-nums font-semibold text-[#111018] dark:text-slate-50">
                  {snapshot.rateBcv.toLocaleString("es-VE", {
                    maximumFractionDigits: 2,
                  })}
                  <span className="text-xs font-normal text-slate-400"> Bs</span>
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {formatDay(snapshot.date)}
                </p>
              </div>
              <div className="rounded-xl border border-[#1a2a46]/10 dark:border-white/10 p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  USDT
                </p>
                <p className="mt-1.5 font-mono text-lg tabular-nums font-semibold text-[#111018] dark:text-slate-50">
                  {snapshot.rateUsdt.toLocaleString("es-VE", {
                    maximumFractionDigits: 2,
                  })}
                  <span className="text-xs font-normal text-slate-400"> Bs</span>
                </p>
              </div>
              <div className="rounded-xl border border-[#b2944a]/30 bg-[#b2944a]/5 p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8e7538] dark:text-[#d8c084]">
                  Dif. USDT − BCV
                </p>
                <p className="mt-1.5 font-mono text-lg tabular-nums font-semibold text-[#111018] dark:text-slate-50">
                  {snapshot.usdtBcvAbs != null
                    ? `${snapshot.usdtBcvAbs > 0 ? "+" : ""}${snapshot.usdtBcvAbs.toLocaleString("es-VE", { maximumFractionDigits: 2 })} Bs`
                    : "—"}
                </p>
                <p className="mt-0.5 font-mono text-xs text-[#8e7538] dark:text-[#d8c084]">
                  {snapshot.usdtBcvPct != null
                    ? `${snapshot.usdtBcvPct > 0 ? "+" : ""}${snapshot.usdtBcvPct.toFixed(2)} %`
                    : "sin tasa base"}
                </p>
              </div>
              <div className="rounded-xl border border-[#1a2a46]/10 dark:border-white/10 p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  Dif. Paralelo − BCV
                </p>
                <p className="mt-1.5 font-mono text-lg tabular-nums font-semibold text-[#111018] dark:text-slate-50">
                  {snapshot.parallelBcvAbs != null
                    ? `${snapshot.parallelBcvAbs > 0 ? "+" : ""}${snapshot.parallelBcvAbs.toLocaleString("es-VE", { maximumFractionDigits: 2 })} Bs`
                    : "—"}
                </p>
                <p className="mt-0.5 font-mono text-xs text-slate-400">
                  {snapshot.parallelBcvPct != null
                    ? `${snapshot.parallelBcvPct > 0 ? "+" : ""}${snapshot.parallelBcvPct.toFixed(2)} %`
                    : "sin tasa paralela"}
                </p>
              </div>
            </div>

            {chart.empty ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
                No hay tasas registradas en este rango de fechas.
              </p>
            ) : (
              <div className="pt-2">
                <MultyLineChart
                  title="Evolución de tasas en el período"
                  labels={chart.labels}
                  datasets={chart.datasets}
                  className="h-64"
                />
              </div>
            )}
          </div>
        ) : (
          <p className="px-5 py-6 text-sm text-slate-500 dark:text-slate-400">
            Todavía no hay historial de tasas para mostrar.
          </p>
        )}
      </section>
    </div>
  );
}
