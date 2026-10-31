"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Banknote, Loader2, Plus, Search, X } from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { SectionCard } from "@/shared/components/molecules/SectionCard";
import {
  BRASS_DOT,
  CARD,
  CARD_HEADER,
  CTA_BRASS,
  EYEBROW,
  GLASS,
  INPUT,
  PAGE_TITLE,
  TABLE_HEAD,
  TABLE_ROW,
} from "@/shared/lib/maison-style";
import { PurchaseEndpoints } from "@/features/purchases/services/purchases.endpoints";
import type {
  Purchase,
  PurchasePaymentStatus,
  PurchaseStatus,
} from "@/features/purchases/types/purchase.type";
import {
  PAYMENT_STATUS_LABELS,
  PURCHASE_PAYMENT_METHODS,
  PURCHASE_STATUS_LABELS,
  paymentCurrencyForMethod,
} from "@/features/purchases/lib/purchase-form";

interface Paged<T> {
  list: T[];
  total: number;
}

const STATUS_TONE: Record<PurchaseStatus, string> = {
  PENDING: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  RECEIVED: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  CANCELLED: "bg-slate-500/10 text-slate-500 border-slate-500/20",
};

const PAYMENT_TONE: Record<PurchasePaymentStatus, string> = {
  UNPAID: "bg-red-500/10 text-red-600 border-red-500/20",
  PARTIAL: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  PAID: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
};

function money(value: string | number): string {
  return `$${Number(value).toFixed(2)}`;
}

function apiMessage(error: unknown, fallback: string): string {
  const maybe = error as { response?: { data?: { message?: string } } };
  return maybe?.response?.data?.message || fallback;
}

/** Outstanding USD of a purchase (total minus payments, rounded to cents). */
function unpaidUSD(purchase: Purchase): number {
  const total = Number(purchase.totalUSD);
  const paid = purchase.payments.reduce(
    (sum, payment) => sum + Number(payment.amountUSD),
    0,
  );
  return Math.round((total - paid) * 100) / 100;
}

/**
 * Purchase register (S1/S4): Maison table list with a real-aggregate
 * summary strip. Create moved to its own route (/dashboard/compras/nuevo);
 * the receive/pay/cancel detail drawer stays here until S5.
 */
export default function PurchasesPage() {
  const { addToast } = useToastStore();

  const [rows, setRows] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [query, setQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<PurchaseStatus | "">("");

  const [selected, setSelected] = useState<Purchase | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [actionBusy, setActionBusy] = useState<boolean>(false);

  const [payAmount, setPayAmount] = useState<string>("");
  const [payMethod, setPayMethod] = useState<string>("CASH_USD");
  const [payReference, setPayReference] = useState<string>("");

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get<Paged<Purchase>>(
        PurchaseEndpoints.list,
        {
          params: {
            ...(query.trim() ? { q: query.trim() } : {}),
            ...(statusFilter ? { status: statusFilter } : {}),
            limit: 50,
          },
        },
      );
      setRows(data.list ?? []);
    } catch (error) {
      addToast({
        type: "error",
        title: "Compras",
        message: apiMessage(error, "No se pudieron cargar las compras."),
      });
    } finally {
      setLoading(false);
    }
  }, [addToast, query, statusFilter]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const openDetail = useCallback(
    async (purchaseId: string) => {
      setDetailLoading(true);
      setSelected(null);
      try {
        const { data } = await apiClient.get<Purchase>(
          PurchaseEndpoints.detail(purchaseId),
        );
        setSelected(data);
      } catch (error) {
        addToast({
          type: "error",
          title: "Compra",
          message: apiMessage(error, "No se pudo abrir la compra."),
        });
      } finally {
        setDetailLoading(false);
      }
    },
    [addToast],
  );

  const runAction = async (
    action: () => Promise<unknown>,
    successMessage: string,
  ) => {
    setActionBusy(true);
    try {
      await action();
      addToast({ type: "success", title: "Compra", message: successMessage });
      if (selected) void openDetail(selected.id);
      void fetchList();
    } catch (error) {
      addToast({
        type: "error",
        title: "Compra",
        message: apiMessage(error, "La acción no se pudo completar."),
      });
    } finally {
      setActionBusy(false);
    }
  };

  const submitPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    const amount = Number(payAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      addToast({
        type: "warning",
        title: "Pago",
        message: "Ingresá un monto mayor que cero.",
      });
      return;
    }
    await runAction(
      () =>
        apiClient.post(PurchaseEndpoints.payments(selected.id), {
          amountOriginal: amount,
          currency: paymentCurrencyForMethod(payMethod),
          paymentMethod: payMethod,
          ...(payReference.trim() ? { reference: payReference.trim() } : {}),
        }),
      "Pago registrado.",
    );
    setPayAmount("");
    setPayReference("");
  };

  // Summary strip aggregates, computed only from the currently fetched rows.
  const monthPrefix = new Date().toISOString().slice(0, 7);
  const monthRows = rows.filter(
    (purchase) =>
      purchase.status !== "CANCELLED" &&
      purchase.issueDate.slice(0, 7) === monthPrefix,
  );
  const monthTotalUSD = monthRows.reduce(
    (sum, purchase) => sum + Number(purchase.totalUSD),
    0,
  );
  const openRows = rows.filter(
    (purchase) =>
      purchase.status !== "CANCELLED" && purchase.paymentStatus !== "PAID",
  );
  const openUnpaidUSD = openRows.reduce(
    (sum, purchase) => sum + unpaidUSD(purchase),
    0,
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className={EYEBROW}>
            <span>Compras</span>
            <span className={BRASS_DOT} aria-hidden />
            <span>Registro de facturas</span>
          </div>
          <h1 className={PAGE_TITLE}>Compras</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Registra las compras a proveedores, recibe la mercancía y controla
            los pagos.
          </p>
        </div>
        <Link
          href="/dashboard/compras/nuevo"
          className={`px-4 py-2.5 text-sm ${CTA_BRASS}`}
        >
          <Plus className="h-4 w-4" /> Nueva compra
        </Link>
      </header>

      {/* Summary strip: real aggregates from the fetched rows. */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className={`rounded-2xl px-5 py-4 ${GLASS}`}>
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Compras del mes
          </p>
          <p className="mt-1 font-mono text-2xl tabular-nums font-semibold text-[#111018] dark:text-slate-100">
            {money(monthTotalUSD)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {monthRows.length} factura{monthRows.length === 1 ? "" : "s"} ·
            acumulado
          </p>
        </div>
        <div className={`rounded-2xl px-5 py-4 ${GLASS}`}>
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Pendientes de pago
          </p>
          <p className="mt-1 font-mono text-2xl tabular-nums font-semibold text-[#111018] dark:text-slate-100">
            {money(openUnpaidUSD)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {openRows.length} factura{openRows.length === 1 ? "" : "s"} sin
            cancelar del todo
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por número, proveedor o nota…"
            className={`pl-9 pr-3 py-2 ${INPUT}`}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as PurchaseStatus | "")
          }
          className={`rounded-xl px-3 py-2 ${INPUT} w-auto`}
        >
          <option value="">Todos los estados</option>
          <option value="PENDING">Pendiente</option>
          <option value="RECEIVED">Recibida</option>
          <option value="CANCELLED">Cancelada</option>
        </select>
      </div>

      <div className={`rounded-2xl overflow-hidden ${CARD}`}>
        <div className={CARD_HEADER}>
          <h2 className="font-semibold text-[17px] tracking-tight text-[#111018] dark:text-slate-100">
            Facturas
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            {rows.length} en pantalla
          </span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500">
            Todavía no hay compras registradas.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={TABLE_HEAD}>
                  <th className="px-4 py-2.5 text-left font-medium">Compra</th>
                  <th className="px-4 py-2.5 text-left font-medium">
                    Proveedor
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium">Fecha</th>
                  <th className="px-4 py-2.5 text-right font-medium">
                    Total USD
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium">Estado</th>
                  <th className="px-4 py-2.5 text-left font-medium">Pago</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((purchase) => (
                  <tr
                    key={purchase.id}
                    onClick={() => void openDetail(purchase.id)}
                    className={`cursor-pointer ${TABLE_ROW}`}
                  >
                    <td className="px-4 py-2.5 font-mono text-xs tabular-nums font-medium text-[#111018] dark:text-slate-100">
                      {purchase.purchaseNumber}
                    </td>
                    <td className="px-4 py-2.5 text-[#111018] dark:text-slate-100">
                      {purchase.supplier?.name ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                      {new Date(purchase.issueDate).toLocaleDateString("es-VE")}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums font-medium text-[#111018] dark:text-slate-100">
                      {money(purchase.totalUSD)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS_TONE[purchase.status]}`}
                      >
                        {PURCHASE_STATUS_LABELS[purchase.status]}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${PAYMENT_TONE[purchase.paymentStatus]}`}
                      >
                        {PAYMENT_STATUS_LABELS[purchase.paymentStatus]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {detailLoading || selected ? (
        <div className="fixed inset-0 z-40 flex justify-end">
          <button
            type="button"
            aria-label="Cerrar detalle"
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setSelected(null)}
          />
          <aside className="relative w-full max-w-md h-full overflow-y-auto bg-white dark:bg-slate-900 shadow-xl p-5 space-y-4">
            {detailLoading || !selected ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                      {selected.purchaseNumber}
                    </h2>
                    <p className="text-sm text-slate-500">
                      {selected.supplier?.name ?? "Sin proveedor"} ·{" "}
                      {new Date(selected.issueDate).toLocaleDateString("es-VE")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="rounded-lg p-1 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span
                    className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS_TONE[selected.status]}`}
                  >
                    {PURCHASE_STATUS_LABELS[selected.status]}
                  </span>
                  <span
                    className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${PAYMENT_TONE[selected.paymentStatus]}`}
                  >
                    {PAYMENT_STATUS_LABELS[selected.paymentStatus]}
                  </span>
                </div>

                <SectionCard
                  icon={<Banknote className="h-5 w-5" />}
                  title="Artículos"
                  description="Lo que se compró en esta factura."
                >
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {selected.items.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center justify-between py-2 text-sm"
                      >
                        <span>
                          {item.productName}{" "}
                          <span className="text-slate-400">
                            × {Number(item.quantity)}
                          </span>
                        </span>
                        <span className="font-medium">
                          {money(item.totalUSD)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 border-t border-slate-100 pt-2 text-right text-sm font-semibold dark:border-slate-800">
                    Total {money(selected.totalUSD)}
                  </p>
                </SectionCard>

                {selected.status === "PENDING" ? (
                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={() =>
                      void runAction(
                        () =>
                          apiClient.post(
                            PurchaseEndpoints.receive(selected.id),
                          ),
                        "Mercancía recibida; el stock fue actualizado.",
                      )
                    }
                    className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold py-2.5"
                  >
                    Recibir mercancía
                  </button>
                ) : null}

                {selected.status !== "CANCELLED" ? (
                  <SectionCard
                    icon={<Banknote className="h-5 w-5" />}
                    title="Registrar pago"
                    description={`Saldo pendiente: ${money(unpaidUSD(selected))}`}
                  >
                    <form onSubmit={submitPayment} className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <label className="block text-xs">
                          <span className="text-slate-500">Monto</span>
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            value={payAmount}
                            onChange={(event) =>
                              setPayAmount(event.target.value)
                            }
                            className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                          />
                        </label>
                        <label className="block text-xs">
                          <span className="text-slate-500">Método</span>
                          <select
                            value={payMethod}
                            onChange={(event) =>
                              setPayMethod(event.target.value)
                            }
                            className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                          >
                            {PURCHASE_PAYMENT_METHODS.map((method) => (
                              <option key={method.code} value={method.code}>
                                {method.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <label className="block text-xs">
                        <span className="text-slate-500">Referencia</span>
                        <input
                          value={payReference}
                          onChange={(event) =>
                            setPayReference(event.target.value)
                          }
                          placeholder="Nro. de referencia o transferencia"
                          className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                        />
                      </label>
                      <button
                        type="submit"
                        disabled={actionBusy}
                        className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold py-2"
                      >
                        Registrar pago
                      </button>
                    </form>
                  </SectionCard>
                ) : null}

                {selected.payments.length > 0 ? (
                  <SectionCard
                    icon={<Banknote className="h-5 w-5" />}
                    title="Pagos registrados"
                    description="Historial de pagos al proveedor."
                  >
                    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                      {selected.payments.map((payment) => (
                        <li
                          key={payment.id}
                          className="flex items-center justify-between py-2 text-sm"
                        >
                          <span>
                            {new Date(payment.paidAt).toLocaleDateString(
                              "es-VE",
                            )}{" "}
                            <span className="text-slate-400">
                              {payment.paymentMethod}
                            </span>
                          </span>
                          <span className="font-medium">
                            {money(payment.amountUSD)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </SectionCard>
                ) : null}

                {selected.status === "PENDING" ? (
                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={() =>
                      void runAction(
                        () => apiClient.post(PurchaseEndpoints.cancel(selected.id)),
                        "Compra cancelada.",
                      )
                    }
                    className="w-full rounded-xl border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60 text-sm font-semibold py-2.5"
                  >
                    Cancelar compra
                  </button>
                ) : null}
              </>
            )}
          </aside>
        </div>
      ) : null}
    </div>
  );
}
