"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Ban,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MessageCircle,
  PlusCircle,
  Receipt,
  RotateCcw,
  Search,
} from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { SectionRow } from "@/shared/components/molecules/SectionCard";
import { useWorkspaceStore } from "@/shared/store/workspace/useWorkspaceStore";
import {
  BRASS_DOT,
  BTN_GHOST,
  CARD,
  CARD_HEADER,
  CTA_BRASS,
  EYEBROW,
  GLASS,
  INPUT,
  LABEL_SM,
  PAGE_TITLE,
  TABLE_HEAD,
  TABLE_ROW,
} from "@/shared/lib/maison-style";
import { SaleEndpoints } from "@/features/sales/services/sales.endpoints";
import { PaymentMethodEndpoints } from "@/features/payment-method/services/payment-method.endpoints";
import type {
  SalesReport,
  Sale,
} from "@/features/sales/types/sale.type";
import {
  agingTotal,
  buildListParams,
  buildReturnPayload,
  monthLabel,
  paymentStatusLabel,
  returnableQuantity,
} from "@/features/sales/lib/sales-list";
import { todayISO } from "@/features/cash/lib/cash-form";
import { getTenantSettings } from "@/features/settings/services/settings.service";

interface Paged<T> {
  list: T[];
  total: number;
  totalPages: number;
}

interface PaymentOption {
  code: string;
  label: string;
  currency: "USD" | "VES" | "USDT";
}

const PAYMENT_STATUS_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "UNPAID", label: "Impagas" },
  { value: "PARTIAL", label: "Parciales" },
  { value: "PAID", label: "Pagadas" },
] as const;

/** Pills del cobro, en el lenguaje de borde/tono de las demás listas. */
const PAYMENT_TONE: Record<string, string> = {
  PAID: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
  PARTIAL: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
  UNPAID: "bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400",
};

/** Cuerpo de INPUT para controles en línea (sin el ancho completo). */
const INLINE_INPUT =
  "rounded-xl border border-[#1a2a46]/15 dark:border-white/15 bg-white/70 dark:bg-slate-950/40 px-3 py-2 text-sm text-[#111018] dark:text-slate-100";

function apiMessage(error: unknown, fallback: string): string {
  const maybe = error as { response?: { data?: { message?: string } } };
  return maybe?.response?.data?.message || fallback;
}

/**
 * Sales ledger (S6): list with filters, the selected sale with its payments,
 * cancellation and returns (S13), plus the accrual-vs-collections report.
 */
export default function SalesPage() {
  const { addToast } = useToastStore();
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);

  const [rows, setRows] = useState<Sale[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [busy, setBusy] = useState<boolean>(false);

  const [q, setQ] = useState<string>("");
  const [paymentStatus, setPaymentStatus] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const [selected, setSelected] = useState<Sale | null>(null);
  /** What has been collected and what is still owed, in USD. */
  const paidUSD = (selected?.payments ?? []).reduce(
    (sum, payment) => sum + Number(payment.amountUSD),
    0,
  );
  const remainingUSD = selected
    ? Math.max(0, Math.round((Number(selected.totalUSD) - paidUSD) * 100) / 100)
    : 0;
  const [methods, setMethods] = useState<PaymentOption[]>([]);

  const [payAmount, setPayAmount] = useState<string>("");
  const [payMethod, setPayMethod] = useState<string>("");
  const [payCurrency, setPayCurrency] = useState<"USD" | "VES" | "USDT">("USD");
  const [payDate, setPayDate] = useState<string>(() => todayISO());

  const [returning, setReturning] = useState<boolean>(false);
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({});
  const [returnReason, setReturnReason] = useState<string>("");
  const [returnReasons, setReturnReasons] = useState<string[]>([]);
  const [reasonChoice, setReasonChoice] = useState<string>("");
  const [returnable, setReturnable] = useState<Record<string, number>>({});

  /** Which currency equivalents the tenant chose to show. */
  const [currencies, setCurrencies] = useState<{
    showVES: boolean;
    showUSDT: boolean;
  }>({ showVES: true, showUSDT: true });
  const [report, setReport] = useState<SalesReport | null>(null);
  const [reportOpen, setReportOpen] = useState<boolean>(false);

  useEffect(() => {
    void getTenantSettings()
      .then((current) => {
        setReturnReasons(current.returns?.reasons ?? []);
        setCurrencies({
          showVES: current.currencies?.showVES !== false,
          showUSDT: current.currencies?.showUSDT !== false,
        });
      })
      .catch(() => setReturnReasons([]));
  }, []);

  const loadList = useCallback(
    async (targetPage = page, filters?: { q?: string; paymentStatus?: string; from?: string; to?: string }) => {
      const { data } = await apiClient.get<Paged<Sale>>(SaleEndpoints.list, {
        params: buildListParams({
          page: targetPage,
          ...(filters ?? { q, paymentStatus, from, to }),
        }),
      });
      setRows(data.list);
      setTotal(data.total);
    },
    [page, q, paymentStatus, from, to],
  );

  const bootstrap = useCallback(async () => {
    setLoading(true);
    try {
      const [salePage, optionList] = await Promise.all([
        apiClient.get<Paged<Sale>>(SaleEndpoints.list, {
          params: buildListParams({ page: 1 }),
        }),
        apiClient.get<PaymentOption[]>(PaymentMethodEndpoints.options),
      ]);
      setRows(salePage.data.list);
      setTotal(salePage.data.total);
      setMethods(optionList.data);
      if (optionList.data[0]) {
        setPayMethod(optionList.data[0].code);
        setPayCurrency(optionList.data[0].currency);
      }
    } catch {
      addToast({
        type: "error",
        title: "Ventas",
        message: "No se pudo cargar el listado de ventas.",
      });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const openDetail = useCallback(async (saleId: string) => {
    const { data } = await apiClient.get<Sale>(SaleEndpoints.detail(saleId));
    setSelected(data);
    setReturning(false);
    setReturnQtys({});
    setReturnReason("");
    setReasonChoice("");
  }, []);

  const loadReport = useCallback(async () => {
    const { data } = await apiClient.get<SalesReport>(SaleEndpoints.report);
    setReport(data);
  }, []);

  const handleSearch = () => {
    setPage(1);
    void loadList(1).catch(() => undefined);
  };

  const changePage = (next: number) => {
    if (next < 1 || next > Math.max(1, Math.ceil(total / 10))) return;
    setPage(next);
    void loadList(next).catch(() => undefined);
  };

  const run = async (action: () => Promise<void>): Promise<void> => {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };

  const handleAddPayment = () =>
    run(async () => {
      if (!selected) return;
      const amount = Number(payAmount);
      if (!payMethod || !Number.isFinite(amount) || amount <= 0) {
        addToast({
          type: "warning",
          title: "Abono",
          message: "Revisá el monto y el medio de cobro.",
        });
        return;
      }

      // Same converted-USD math the backend applies, so an overpayment is
      // caught before the request and named with the real remaining balance.
      const saleBcv = Number(selected.rateBcv) || 1;
      const saleUsdt = Number(selected.rateUsdt) || 1;
      const amountUSD =
        payCurrency === "USD"
          ? amount
          : payCurrency === "VES"
            ? amount / saleBcv
            : (amount * saleUsdt) / saleBcv;
      if (amountUSD > remainingUSD + 0.01) {
        addToast({
          type: "warning",
          title: "Abono",
          message: `El abono supera lo que resta de la venta ($${remainingUSD.toFixed(2)}).`,
        });
        return;
      }

      try {
        await apiClient.post(SaleEndpoints.payments(selected.id), {
          amountOriginal: amount,
          currency: payCurrency,
          paymentMethod: payMethod,
          paidAt: new Date(`${payDate}T12:00:00`).toISOString(),
        });
        addToast({ type: "success", title: "Abono", message: "Abono registrado." });
        setPayAmount("");
        await openDetail(selected.id);
        await loadList().catch(() => undefined);
      } catch (error) {
        addToast({
          type: "error",
          title: "Abono",
          message: apiMessage(error, "No se pudo registrar el abono."),
        });
      }
    });

  const handleCancel = () =>
    run(async () => {
      if (!selected) return;
      const confirmed = window.confirm(
        `¿Anular ${selected.saleNumber}? El stock vuelve al inventario.`,
      );
      if (!confirmed) return;

      try {
        await apiClient.post(SaleEndpoints.cancel(selected.id));
        addToast({
          type: "success",
          title: "Venta anulada",
          message: `${selected.saleNumber} fue anulada.`,
        });
        setSelected(null);
        await loadList().catch(() => undefined);
      } catch (error) {
        addToast({
          type: "error",
          title: "Anular",
          message: apiMessage(error, "No se pudo anular la venta."),
        });
      }
    });

  const openReturns = useCallback(async (saleId: string) => {
    const [detail, returnPage] = await Promise.all([
      apiClient
        .get<Sale>(SaleEndpoints.detail(saleId))
        .then((response) => response.data),
      apiClient
        .get<Paged<{ items?: { saleItemId?: string | null; quantity: string | number }[] }>>(
          SaleEndpoints.returnsOfSale(saleId),
        )
        .catch(() => ({ data: { list: [] } as Paged<never> })),
    ]);

    const returnedByLine: Record<string, number> = {};
    for (const saleReturn of returnPage.data.list as {
      items?: { saleItemId?: string | null; quantity: string | number }[];
    }[]) {
      for (const item of saleReturn.items ?? []) {
        if (!item.saleItemId) continue;
        returnedByLine[item.saleItemId] =
          (returnedByLine[item.saleItemId] ?? 0) + Number(item.quantity);
      }
    }

    const remaining: Record<string, number> = {};
    for (const line of detail.items ?? []) {
      remaining[line.id] = returnableQuantity(line, returnedByLine);
    }

    setSelected(detail);
    setReturnable(remaining);
    setReturnQtys({});
    setReturnReason("");
    setReasonChoice("");
    setReturning(true);
  }, []);

  const handleCreateReturn = () =>
    run(async () => {
      if (!selected) return;

      const selections = Object.entries(returnQtys)
        .map(([saleItemId, quantity]) => ({ saleItemId, quantity }))
        .filter((item) => item.quantity > 0);

      if (selections.length === 0) {
        addToast({
          type: "warning",
          title: "Devolución",
          message: "Marcá la cantidad a devolver.",
        });
        return;
      }

      try {
        const { data } = await apiClient.post<{ returnNumber: string }>(
          SaleEndpoints.createReturn(selected.id),
          buildReturnPayload(
            selections,
            reasonChoice === "__other__" ? returnReason : reasonChoice,
          ),
        );
        addToast({
          type: "success",
          title: "Devolución",
          message: `${data.returnNumber} registrada. El stock y el saldo se ajustaron.`,
        });
        setReturning(false);
        await openReturns(selected.id);
        await loadList().catch(() => undefined);
      } catch (error) {
        addToast({
          type: "error",
          title: "Devolución",
          message: apiMessage(error, "No se pudo registrar la devolución."),
        });
      }
    });

  const totalPages = Math.max(1, Math.ceil(total / 10));

  const agingSum = useMemo(
    () => (report ? agingTotal(report.aging) : 0),
    [report],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className={EYEBROW}>
            <span className="truncate max-w-[180px]">
              {activeWorkspace?.name ?? "Socius ERP"}
            </span>
            <span className={BRASS_DOT} aria-hidden />
            <span>Ventas</span>
            <span className={BRASS_DOT} aria-hidden />
            <span className="truncate">
              {PAYMENT_STATUS_OPTIONS.find((option) => option.value === paymentStatus)
                ?.label ?? "Todos los estados"}
            </span>
          </div>
          <h1 className={PAGE_TITLE}>Ventas</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {total} venta(s) · cada cobro guarda su fecha y la tasa del día.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            const next = !reportOpen;
            setReportOpen(next);
            if (next && !report) void loadReport().catch(() => undefined);
          }}
          className={`px-3 py-2 text-sm ${BTN_GHOST}`}
        >
          <Receipt className="h-4 w-4" /> {reportOpen ? "Ocultar reporte" : "Ver reporte"}
        </button>
      </header>

      <div className={`rounded-2xl p-4 ${GLASS}`}>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className={LABEL_SM}>Buscar</span>
            <div className="relative w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="search"
                value={q}
                onChange={(event) => setQ(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleSearch();
                }}
                placeholder="Nº de venta o cliente"
                className={`pl-9 pr-3 py-2 ${INPUT}`}
              />
            </div>
          </label>
          <label className="flex flex-col gap-1">
            <span className={LABEL_SM}>Estado de cobro</span>
            <select
              value={paymentStatus}
              onChange={(event) => setPaymentStatus(event.target.value)}
              className={INPUT}
            >
              {PAYMENT_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className={LABEL_SM}>Desde</span>
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className={INPUT}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className={LABEL_SM}>Hasta</span>
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className={INPUT}
            />
          </label>
          <button
            type="button"
            onClick={handleSearch}
            className={`px-4 py-2 text-sm ${CTA_BRASS}`}
          >
            Buscar
          </button>
        </div>
      </div>

      {reportOpen && report ? (
        <div className={`rounded-2xl overflow-hidden ${CARD}`}>
          <div className={CARD_HEADER}>
            <div>
              <h2 className="font-semibold text-[17px] tracking-tight text-[#111018] dark:text-slate-100">
                Devengo vs cobro
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Lo facturado por mes contra lo cobrado por mes, y la deuda vencida.
              </p>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              reporte
            </span>
          </div>
          <div className="p-5">
            <div className="grid sm:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Facturado</p>
                <p className="text-lg font-semibold font-mono tabular-nums text-[#111018] dark:text-slate-100">
                  ${report.issued.totalUSD.toFixed(2)}
                </p>
                <p className="text-xs text-slate-400">{report.issued.count} venta(s)</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Por cobrar</p>
                <p className="text-lg font-semibold font-mono tabular-nums text-amber-600 dark:text-amber-400">
                  ${agingSum.toFixed(2)}
                </p>
                <p className="text-xs text-slate-400">
                  {report.openItems.length} factura(s) abierta(s)
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Vencida 60+ días</p>
                <p className="text-lg font-semibold font-mono tabular-nums text-red-600 dark:text-red-400">
                  ${report.aging.over60.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Corriente</p>
                <p className="text-lg font-semibold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                  ${report.aging.current.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 mb-1">
                  Facturado (por emisión)
                </p>
                {report.accrualByMonth.map((row) => (
                  <SectionRow key={`a-${row.month}`} label={monthLabel(row.month)}>
                    <span className="text-sm font-mono tabular-nums">
                      ${row.totalUSD.toFixed(2)} · {row.count}
                    </span>
                  </SectionRow>
                ))}
                {report.accrualByMonth.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">Sin movimientos.</p>
                ) : null}
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 mb-1">
                  Cobrado (por cobro)
                </p>
                {report.collectionsByMonth.map((row) => (
                  <SectionRow key={`c-${row.month}`} label={monthLabel(row.month)}>
                    <span className="text-sm font-mono tabular-nums">
                      ${row.totalUSD.toFixed(2)} · {row.count}
                    </span>
                  </SectionRow>
                ))}
                {report.collectionsByMonth.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">Sin cobros.</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className={`rounded-2xl overflow-hidden ${CARD}`}>
        <div className={CARD_HEADER}>
          <h2 className="font-semibold text-[17px] tracking-tight text-[#111018] dark:text-slate-100">
            Ventas
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            {rows.length} en pantalla
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={TABLE_HEAD}>
                <th className="px-4 py-2.5 text-left font-medium">Venta</th>
                <th className="px-4 py-2.5 text-left font-medium">Fecha</th>
                <th className="px-4 py-2.5 text-left font-medium">Cliente</th>
                <th className="px-4 py-2.5 text-right font-medium">Total USD</th>
                <th className="px-4 py-2.5 text-left font-medium">Cobro</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {rows.map((sale) => {
                const status = paymentStatusLabel(sale.paymentStatus);
                return (
                  <tr key={sale.id} className={TABLE_ROW}>
                    <td className="px-4 py-2.5 font-mono text-xs tabular-nums font-medium text-[#111018] dark:text-slate-100">
                      {sale.saleNumber}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                      {new Date(sale.issueDate).toLocaleDateString("es-VE")}
                    </td>
                    <td className="px-4 py-2.5 text-[#111018] dark:text-slate-100">
                      {sale.client?.name ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums font-medium text-[#111018] dark:text-slate-100">
                      ${Number(sale.totalUSD).toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${
                            PAYMENT_TONE[sale.paymentStatus] ?? PAYMENT_TONE.UNPAID
                          }`}
                        >
                          {status.text}
                        </span>
                        {sale.returns && sale.returns.length > 0 ? (
                          (() => {
                            const returnedUSD = sale.returns!.reduce(
                              (sum, ref) => sum + Number(ref.totalUSD),
                              0,
                            );
                            const full = returnedUSD >= Number(sale.totalUSD) - 0.01;
                            return (
                              <span className="inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                                {full ? "Devuelta" : "Devolución parcial"}
                              </span>
                            );
                          })()
                        ) : null}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => void openDetail(sale.id)}
                        className="rounded-lg border border-[#1a2a46]/15 px-2.5 py-1 text-xs font-medium text-[#1a2a46]/80 hover:bg-[#1a2a46]/[0.05] transition-colors dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5"
                      >
                        Ver
                      </button>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                    Sin ventas para esos filtros.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-[#1b1d21]/12 px-4 py-2.5 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
          <span className="font-mono tabular-nums">
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => changePage(page - 1)}
              className="rounded-lg border border-[#1a2a46]/15 p-1.5 text-[#1a2a46]/70 disabled:opacity-40 transition-colors dark:border-white/15 dark:text-slate-300"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => changePage(page + 1)}
              className="rounded-lg border border-[#1a2a46]/15 p-1.5 text-[#1a2a46]/70 disabled:opacity-40 transition-colors dark:border-white/15 dark:text-slate-300"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {selected ? (
        <div className={`rounded-2xl overflow-hidden ${CARD}`}>
          <div className={CARD_HEADER}>
            <div className="min-w-0">
              <h2 className="font-semibold text-[17px] tracking-tight text-[#111018] dark:text-slate-100">
                {selected.saleNumber} · {new Date(selected.issueDate).toLocaleDateString("es-VE")}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {selected.client?.name
                  ? `Cliente: ${selected.client.name}`
                  : "Venta sin cliente"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {selected.client?.phone ? (
                <a
                  href={`https://wa.me/${selected.client.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                    `Hola ${selected.client.name}, te comparto el resumen de ${selected.saleNumber}: total $${Number(selected.totalUSD).toFixed(2)}, abonado $${paidUSD.toFixed(2)}, resta $${remainingUSD.toFixed(2)}.`,
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#25D366]/40 bg-[#25D366]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#128C4A] transition-colors hover:bg-[#25D366]/20 dark:text-[#4ade80]"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                </a>
              ) : null}
              <span
                className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                  PAYMENT_TONE[selected.paymentStatus] ?? PAYMENT_TONE.UNPAID
                }`}
              >
                {paymentStatusLabel(selected.paymentStatus).text}
              </span>
            </div>
          </div>
          <div className="p-5">
            <div className="space-y-1 mb-4">
              {(selected.items ?? []).map((item) => {
                const returnedUSD = (selected.returns ?? []).reduce(
                  (sum, ref) =>
                    sum +
                    (ref.items ?? [])
                      .filter((line) => line.saleItemId === item.id)
                      .reduce(
                        (lineSum, line) => lineSum + Number(line.quantity),
                        0,
                      ) *
                    Number(item.unitPriceUSD),
                  0,
                );
                const returnedQty = (selected.returns ?? []).reduce(
                  (sum, ref) =>
                    sum +
                    (ref.items ?? [])
                      .filter((line) => line.saleItemId === item.id)
                      .reduce((lineSum, line) => lineSum + Number(line.quantity), 0),
                  0,
                );
                return (
                  <SectionRow
                    key={item.id}
                    label={`${item.quantity} × ${item.productName}`}
                    hint={
                      returnedQty > 0
                        ? `$${Number(item.unitPriceUSD).toFixed(2)} · devuelto ${returnedQty} ($${returnedUSD.toFixed(2)})`
                        : `$${Number(item.unitPriceUSD).toFixed(2)}`
                    }
                  >
                    <span
                      className={
                        returnedQty > 0
                          ? "text-sm font-medium font-mono tabular-nums text-red-600 dark:text-red-400"
                          : "text-sm font-medium font-mono tabular-nums"
                      }
                    >
                      ${Number(item.totalUSD).toFixed(2)}
                    </span>
                  </SectionRow>
                );
              })}
              <div className="border-t border-[#1b1d21]/12 pt-2 dark:border-white/10">
                <SectionRow
                  label="Total"
                  hint={`BCV ${Number(selected.rateBcv).toFixed(2)} · USDT ${Number(selected.rateUsdt).toFixed(2)}`}
                >
                  <span className="text-base font-semibold font-mono tabular-nums">
                    ${Number(selected.totalUSD).toFixed(2)}
                  </span>
                </SectionRow>
              </div>
            </div>

            {(selected.payments ?? []).length > 0 ? (
              <div className="mb-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 mb-1">
                  Cobros
                </p>
                {(selected.payments ?? []).map((payment) => {
                  const paidUSDFromPayment = Number(payment.amountUSD);
                  // The payment froze its own BCV/USDT snapshot: use the stored
                  // VES amount instead of re-deriving it from the rounded USD
                  // (which drifted, e.g. 100 VES showing as Bs 98,44).
                  const paymentVes = Number(payment.amountVES);
                  const paymentUsdtRate = Number(payment.rateUsdt) || 1;
                  const paymentUsdt = paymentVes / paymentUsdtRate;
                  return (
                    <SectionRow
                      key={payment.id}
                      label={`${payment.paymentMethod} · ${payment.currency}`}
                      hint={`${new Date(payment.paidAt).toLocaleDateString("es-VE")} · ≈ $${paidUSDFromPayment.toFixed(2)}`}
                    >
                      <span className="block text-right">
                        <span className="block text-sm font-mono tabular-nums">
                          {Number(payment.amountOriginal).toFixed(2)}{" "}
                          {payment.currency}
                        </span>
                        <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                          {currencies.showVES
                            ? `Bs ${paymentVes.toLocaleString("es-VE", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}`
                            : null}
                          {currencies.showVES && currencies.showUSDT ? " · " : null}
                          {currencies.showUSDT
                            ? `USDT ${paymentUsdt.toFixed(2)}`
                            : null}
                        </span>
                      </span>
                    </SectionRow>
                  );
                })}
              </div>
            ) : (
              <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">Todavía sin cobros.</p>
            )}

            {selected.paymentStatus === "PAID" ? (
              <p className="rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400">
                Venta saldada: no hay nada por abonar.
              </p>
            ) : (
            <div className="rounded-xl border border-[#1b1d21]/12 bg-slate-50 p-3 dark:border-white/10 dark:bg-slate-950/40">
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  Registrar abono
                </p>
                <p className="text-sm font-semibold text-[#111018] dark:text-slate-100">
                  Resta{" "}
                  <span className="font-mono tabular-nums">
                    ${remainingUSD.toFixed(2)}
                  </span>
                  <span className="ml-2 text-[11px] font-normal text-slate-500 dark:text-slate-400">
                    {currencies.showVES
                      ? `≈ BCV Bs ${(
                          remainingUSD * (Number(selected.rateBcv) || 1)
                        ).toLocaleString("es-VE", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`
                      : null}
                    {currencies.showVES && currencies.showUSDT ? " · " : null}
                    {currencies.showUSDT
                      ? `USDT ${(
                          (remainingUSD * (Number(selected.rateBcv) || 1)) /
                          (Number(selected.rateUsdt) || 1)
                        ).toFixed(2)}`
                      : null}
                  </span>
                </p>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={payAmount}
                  onChange={(event) => setPayAmount(event.target.value)}
                  placeholder="Monto"
                  className={`w-28 font-mono tabular-nums ${INLINE_INPUT}`}
                />
                <span className="inline-flex h-9 items-center rounded-xl border border-[#1b1d21]/12 px-3 text-xs font-semibold text-slate-500 dark:border-white/10 dark:text-slate-400">
                  {payCurrency}
                </span>
                <select
                  value={payMethod}
                  onChange={(event) => {
                    const code = event.target.value;
                    setPayMethod(code);
                    const method = methods.find((item) => item.code === code);
                    if (method) setPayCurrency(method.currency);
                  }}
                  className={INLINE_INPUT}
                >
                  {methods.map((method) => (
                    <option key={method.code} value={method.code}>
                      {method.label} ({method.currency})
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={payDate}
                  onChange={(event) => setPayDate(event.target.value)}
                  className={INLINE_INPUT}
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleAddPayment()}
                  className={`px-3 py-2 text-sm ${CTA_BRASS}`}
                >
                  <PlusCircle className="h-4 w-4" /> Abonar
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                La fecha es la del cobro real: un cobro de mayo sobre una venta de
                enero sigue siendo cobro de mayo.
              </p>
            </div>
            )}

            {selected.returns && selected.returns.length > 0 ? (
              <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                <p className="font-medium text-amber-700 dark:text-amber-300">
                  Devoluciones ({selected.returns.length})
                </p>
                {selected.returns.map((ref) => (
                  <p key={ref.id ?? ref.returnNumber} className="text-xs text-amber-700/80 dark:text-amber-300/80">
                    {ref.returnNumber} · <span className="font-mono tabular-nums">${Number(ref.totalUSD).toFixed(2)}</span>
                    {ref.reason ? ` · ${ref.reason}` : ""}
                  </p>
                ))}
              </div>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || selected.status === "CANCELLED"}
                onClick={() => void openReturns(selected.id)}
                className={`px-3 py-2 text-sm disabled:opacity-40 ${BTN_GHOST}`}
              >
                <RotateCcw className="h-4 w-4" /> Devolver
              </button>
              <button
                type="button"
                disabled={busy || selected.status === "CANCELLED"}
                onClick={() => void handleCancel()}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/30 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-500/10 disabled:opacity-40 transition-colors dark:text-red-400"
              >
                <Ban className="h-4 w-4" /> Anular
              </button>
            </div>

            {returning ? (
              <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300 mb-2">
                  Devolución
                </p>
                <div className="space-y-2">
                  {(selected.items ?? []).map((item) => {
                    const max = returnable[item.id] ?? 0;
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3"
                      >
                        <span className="text-sm">
                          {item.productName}{" "}
                          <span className="text-xs text-slate-400">
                            (máx. {max})
                          </span>
                        </span>
                        <input
                          type="number"
                          min={0}
                          max={max}
                          value={returnQtys[item.id] ?? 0}
                          disabled={max <= 0}
                          onChange={(event) =>
                            setReturnQtys((current) => ({
                              ...current,
                              [item.id]: Math.max(
                                0,
                                Math.min(max, Number(event.target.value) || 0),
                              ),
                            }))
                          }
                          className={`w-20 font-mono tabular-nums disabled:opacity-40 ${INLINE_INPUT}`}
                        />
                      </div>
                    );
                  })}
                  {returnReasons.length > 0 ? (
                    <select
                      value={reasonChoice}
                      onChange={(event) => {
                        setReasonChoice(event.target.value);
                        if (event.target.value !== "__other__") {
                          setReturnReason(event.target.value);
                        } else {
                          setReturnReason("");
                        }
                      }}
                      className={`w-full ${INPUT}`}
                    >
                      <option value="">Motivo (opcional)</option>
                      {returnReasons.map((reason) => (
                        <option key={reason} value={reason}>
                          {reason}
                        </option>
                      ))}
                      <option value="__other__">Otro…</option>
                    </select>
                  ) : null}
                  {returnReasons.length === 0 || reasonChoice === "__other__" ? (
                    <input
                      type="text"
                      value={returnReason}
                      onChange={(event) => setReturnReason(event.target.value)}
                      placeholder="Motivo (opcional)"
                      className={`w-full ${INPUT}`}
                    />
                  ) : null}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleCreateReturn()}
                      className={`px-3 py-2 text-sm disabled:opacity-50 ${CTA_BRASS}`}
                    >
                      Confirmar devolución
                    </button>
                    <button
                      type="button"
                      onClick={() => setReturning(false)}
                      className={`px-3 py-2 text-sm ${BTN_GHOST}`}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Seleccioná una venta para ver el detalle, cobrar, anular o devolver.
        </p>
      )}
    </div>
  );
}
