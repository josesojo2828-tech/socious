"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Ban,
  ChevronLeft,
  ChevronRight,
  Loader2,
  PlusCircle,
  Receipt,
  RotateCcw,
  Search,
} from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { SectionCard, SectionRow } from "@/shared/components/molecules/SectionCard";
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

const STORAGE_CURRENCIES = [
  { code: "USD", label: "USD" },
  { code: "VES", label: "Bs" },
  { code: "USDT", label: "USDT" },
] as const;

const PAYMENT_STATUS_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "UNPAID", label: "Impagas" },
  { value: "PARTIAL", label: "Parciales" },
  { value: "PAID", label: "Pagadas" },
] as const;

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

  const [report, setReport] = useState<SalesReport | null>(null);
  const [reportOpen, setReportOpen] = useState<boolean>(false);

  useEffect(() => {
    void getTenantSettings()
      .then((current) => setReturnReasons(current.returns?.reasons ?? []))
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
      if (optionList.data[0]) setPayMethod(optionList.data[0].code);
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
    <div className="px-4 py-6 space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Ventas
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
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
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
        >
          <Receipt className="h-4 w-4" /> {reportOpen ? "Ocultar reporte" : "Ver reporte"}
        </button>
      </header>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <label className="flex flex-col gap-1 text-xs text-slate-500">
          Buscar
          <div className="flex items-center gap-2 rounded-lg border border-slate-300 px-2 py-1.5 dark:border-slate-600">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSearch();
              }}
              placeholder="Nº de venta o cliente"
              className="w-52 bg-transparent text-sm outline-none"
            />
          </div>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">
          Estado de cobro
          <select
            value={paymentStatus}
            onChange={(event) => setPaymentStatus(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
          >
            {PAYMENT_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">
          Desde
          <input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">
          Hasta
          <input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
          />
        </label>
        <button
          type="button"
          onClick={handleSearch}
          className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white"
        >
          Buscar
        </button>
      </div>

      {reportOpen && report ? (
        <SectionCard
          icon={<Receipt className="h-5 w-5" />}
          title="Devengo vs cobro"
          description="Lo facturado por mes contra lo cobrado por mes, y la deuda vencida."
        >
          <div className="grid sm:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-xs text-slate-500">Facturado</p>
              <p className="text-lg font-semibold">
                ${report.issued.totalUSD.toFixed(2)}
              </p>
              <p className="text-xs text-slate-400">{report.issued.count} venta(s)</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Por cobrar</p>
              <p className="text-lg font-semibold text-amber-600">
                ${agingSum.toFixed(2)}
              </p>
              <p className="text-xs text-slate-400">
                {report.openItems.length} factura(s) abierta(s)
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Vencida 60+ días</p>
              <p className="text-lg font-semibold text-red-600">
                ${report.aging.over60.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Corriente</p>
              <p className="text-lg font-semibold text-emerald-600">
                ${report.aging.current.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-medium uppercase text-slate-400 mb-1">
                Facturado (por emisión)
              </p>
              {report.accrualByMonth.map((row) => (
                <SectionRow key={`a-${row.month}`} label={monthLabel(row.month)}>
                  <span className="text-sm">
                    ${row.totalUSD.toFixed(2)} · {row.count}
                  </span>
                </SectionRow>
              ))}
              {report.accrualByMonth.length === 0 ? (
                <p className="text-sm text-slate-500">Sin movimientos.</p>
              ) : null}
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-slate-400 mb-1">
                Cobrado (por cobro)
              </p>
              {report.collectionsByMonth.map((row) => (
                <SectionRow key={`c-${row.month}`} label={monthLabel(row.month)}>
                  <span className="text-sm">
                    ${row.totalUSD.toFixed(2)} · {row.count}
                  </span>
                </SectionRow>
              ))}
              {report.collectionsByMonth.length === 0 ? (
                <p className="text-sm text-slate-500">Sin cobros.</p>
              ) : null}
            </div>
          </div>
        </SectionCard>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400 dark:border-slate-700">
              <th className="px-4 py-2">Venta</th>
              <th className="px-4 py-2">Fecha</th>
              <th className="px-4 py-2">Cliente</th>
              <th className="px-4 py-2 text-right">Total USD</th>
              <th className="px-4 py-2">Cobro</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((sale) => {
              const status = paymentStatusLabel(sale.paymentStatus);
              return (
                <tr
                  key={sale.id}
                  className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                >
                  <td className="px-4 py-2 font-medium">{sale.saleNumber}</td>
                  <td className="px-4 py-2">
                    {new Date(sale.issueDate).toLocaleDateString("es-VE")}
                  </td>
                  <td className="px-4 py-2">{sale.client?.name ?? "—"}</td>
                  <td className="px-4 py-2 text-right">
                    ${Number(sale.totalUSD).toFixed(2)}
                  </td>
                  <td className="px-4 py-2">
                    <span className={status.className}>{status.text}</span>
                    {sale.returns && sale.returns.length > 0 ? (
                      (() => {
                        const returnedUSD = sale.returns!.reduce(
                          (sum, ref) => sum + Number(ref.totalUSD),
                          0,
                        );
                        const full = returnedUSD >= Number(sale.totalUSD) - 0.01;
                        return (
                          <span className="ml-1 inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-600">
                            {full ? "Devuelta" : "Devolución parcial"}
                          </span>
                        );
                      })()
                    ) : null}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => void openDetail(sale.id)}
                      className="rounded px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950"
                    >
                      Ver
                    </button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  Sin ventas para esos filtros.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2 text-xs text-slate-500 dark:border-slate-700">
          <span>
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => changePage(page - 1)}
              className="rounded border border-slate-300 p-1 disabled:opacity-40 dark:border-slate-600"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => changePage(page + 1)}
              className="rounded border border-slate-300 p-1 disabled:opacity-40 dark:border-slate-600"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {selected ? (
        <SectionCard
          icon={<Receipt className="h-5 w-5" />}
          title={`${selected.saleNumber} · ${new Date(selected.issueDate).toLocaleDateString("es-VE")}`}
          description={
            selected.client?.name
              ? `Cliente: ${selected.client.name}`
              : "Venta sin cliente"
          }
        >
          <div className="space-y-1 mb-4">
            {(selected.items ?? []).map((item) => (
              <SectionRow
                key={item.id}
                label={`${item.quantity} × ${item.productName}`}
                hint={`$${Number(item.unitPriceUSD).toFixed(2)}`}
              >
                <span className="text-sm font-medium">
                  ${Number(item.totalUSD).toFixed(2)}
                </span>
              </SectionRow>
            ))}
            <div className="border-t border-slate-100 pt-2 dark:border-slate-800">
              <SectionRow
                label="Total"
                hint={`BCV ${Number(selected.rateBcv).toFixed(2)} · USDT ${Number(selected.rateUsdt).toFixed(2)}`}
              >
                <span className="text-base font-semibold">
                  ${Number(selected.totalUSD).toFixed(2)}
                </span>
              </SectionRow>
            </div>
          </div>

          {(selected.payments ?? []).length > 0 ? (
            <div className="mb-4">
              <p className="text-xs font-medium uppercase text-slate-400 mb-1">
                Cobros
              </p>
              {(selected.payments ?? []).map((payment) => (
                <SectionRow
                  key={payment.id}
                  label={`${payment.paymentMethod} · ${payment.currency}`}
                  hint={new Date(payment.paidAt).toLocaleDateString("es-VE")}
                >
                  <span className="text-sm">
                    {Number(payment.amountOriginal).toFixed(2)}
                  </span>
                </SectionRow>
              ))}
            </div>
          ) : (
            <p className="mb-4 text-sm text-slate-500">Todavía sin cobros.</p>
          )}

          {selected.paymentStatus === "PAID" ? (
            <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">
              Venta saldada: no hay nada por abonar.
            </p>
          ) : (
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
            <p className="text-xs font-medium uppercase text-slate-400 mb-2">
              Registrar abono
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <input
                type="number"
                min={0}
                step="0.01"
                value={payAmount}
                onChange={(event) => setPayAmount(event.target.value)}
                placeholder="Monto"
                className="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900"
              />
              <select
                value={payCurrency}
                onChange={(event) =>
                  setPayCurrency(event.target.value as "USD" | "VES" | "USDT")
                }
                className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900"
              >
                {STORAGE_CURRENCIES.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={payMethod}
                onChange={(event) => setPayMethod(event.target.value)}
                className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900"
              >
                {methods.map((method) => (
                  <option key={method.code} value={method.code}>
                    {method.label}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={payDate}
                onChange={(event) => setPayDate(event.target.value)}
                className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900"
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleAddPayment()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
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
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950">
              <p className="font-medium text-amber-700 dark:text-amber-300">
                Devoluciones ({selected.returns.length})
              </p>
              {selected.returns.map((ref) => (
                <p key={ref.id ?? ref.returnNumber} className="text-xs text-amber-700/80 dark:text-amber-300/80">
                  {ref.returnNumber} · ${Number(ref.totalUSD).toFixed(2)}
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
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-slate-600"
            >
              <RotateCcw className="h-4 w-4" /> Devolver
            </button>
            <button
              type="button"
              disabled={busy || selected.status === "CANCELLED"}
              onClick={() => void handleCancel()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-600 disabled:opacity-40"
            >
              <Ban className="h-4 w-4" /> Anular
            </button>
          </div>

          {returning ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950">
              <p className="text-xs font-medium uppercase text-amber-700 mb-2">
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
                        className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-sm disabled:opacity-40 dark:border-slate-600 dark:bg-slate-900"
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
                    className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900"
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
                    className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900"
                  />
                ) : null}
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleCreateReturn()}
                    className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                  >
                    Confirmar devolución
                  </button>
                  <button
                    type="button"
                    onClick={() => setReturning(false)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </SectionCard>
      ) : (
        <p className="text-sm text-slate-500">
          Seleccioná una venta para ver el detalle, cobrar, anular o devolver.
        </p>
      )}
    </div>
  );
}
