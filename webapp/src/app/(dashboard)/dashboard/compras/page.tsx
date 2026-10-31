"use client";

import { useCallback, useEffect, useState } from "react";
import { Banknote, Loader2, Plus, Search, Trash2, X } from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { SectionCard } from "@/shared/components/molecules/SectionCard";
import { PurchaseEndpoints } from "@/features/purchases/services/purchases.endpoints";
import { SupplierEndpoints } from "@/features/suppliers/services/suppliers.endpoints";
import { ProductEndpoints } from "@/features/products/services/products.endpoints";
import type {
  Purchase,
  PurchasePaymentStatus,
  PurchaseStatus,
} from "@/features/purchases/types/purchase.type";
import type { Supplier } from "@/features/suppliers/types/supplier.type";
import {
  PAYMENT_STATUS_LABELS,
  PURCHASE_PAYMENT_METHODS,
  PURCHASE_STATUS_LABELS,
  buildCreatePayload,
  emptyPurchaseLine,
  grandTotalUSD,
  paymentCurrencyForMethod,
  validatePurchaseForm,
  type PurchaseForm,
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

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function money(value: string | number): string {
  return `$${Number(value).toFixed(2)}`;
}

function apiMessage(error: unknown, fallback: string): string {
  const maybe = error as { response?: { data?: { message?: string } } };
  return maybe?.response?.data?.message || fallback;
}

function emptyForm(): PurchaseForm {
  return {
    supplierId: "",
    issueDate: todayISO(),
    dueDate: "",
    notes: "",
    items: [emptyPurchaseLine()],
  };
}

/** Purchase register: accrue supplier invoices, receive them and pay them. */
export default function PurchasesPage() {
  const { addToast } = useToastStore();

  const [rows, setRows] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [query, setQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<PurchaseStatus | "">("");

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);

  const [creating, setCreating] = useState<boolean>(false);
  const [form, setForm] = useState<PurchaseForm>(emptyForm);
  const [saving, setSaving] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

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

  useEffect(() => {
    void (async () => {
      const [supplierRes, productRes] = await Promise.all([
        apiClient
          .get<Paged<Supplier>>(SupplierEndpoints.list, {
            params: { limit: 100 },
          })
          .catch(() => ({ data: { list: [] as Supplier[], total: 0 } })),
        apiClient
          .get<Paged<{ id: string; name: string }>>(ProductEndpoints.list, {
            params: { limit: 100 },
          })
          .catch(() => ({
            data: { list: [] as { id: string; name: string }[], total: 0 },
          })),
      ]);
      setSuppliers(supplierRes.data.list ?? []);
      setProducts(productRes.data.list ?? []);
    })();
  }, []);

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

  const updateLine = (
    index: number,
    patch: Partial<PurchaseForm["items"][number]>,
  ) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((line, i) =>
        i === index ? { ...line, ...patch } : line,
      ),
    }));
  };

  const submitCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    const validation = validatePurchaseForm(form);
    if (validation) {
      setFormError(validation);
      return;
    }
    setFormError(null);
    setSaving(true);
    try {
      const { data } = await apiClient.post<Purchase>(
        PurchaseEndpoints.list,
        buildCreatePayload(form),
      );
      addToast({
        type: "success",
        title: "Compras",
        message: `Compra ${data.purchaseNumber} registrada.`,
      });
      setCreating(false);
      setForm(emptyForm());
      void fetchList();
    } catch (error) {
      addToast({
        type: "error",
        title: "Compras",
        message: apiMessage(error, "No se pudo registrar la compra."),
      });
    } finally {
      setSaving(false);
    }
  };

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

  const unpaidUSD = (purchase: Purchase): number => {
    const total = Number(purchase.totalUSD);
    const paid = purchase.payments.reduce(
      (sum, payment) => sum + Number(payment.amountUSD),
      0,
    );
    return Math.round((total - paid) * 100) / 100;
  };

  return (
    <div className="px-4 py-6 space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Compras
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Registra las compras a proveedores, recibe la mercancía y controla
            los pagos.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setCreating((value) => !value);
            setFormError(null);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2"
        >
          {creating ? (
            <>
              <X className="h-4 w-4" /> Cerrar
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" /> Nueva compra
            </>
          )}
        </button>
      </header>

      {creating ? (
        <SectionCard
          icon={<Banknote className="h-5 w-5" />}
          title="Nueva compra"
          description="El total se calcula solo. La compra entra como PENDIENTE hasta que recibas la mercancía."
        >
          <form onSubmit={submitCreate} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-sm">
                <span className="text-slate-600 dark:text-slate-300">Proveedor</span>
                <select
                  value={form.supplierId}
                  onChange={(event) =>
                    setForm((c) => ({ ...c, supplierId: event.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                >
                  <option value="">Sin proveedor registrado</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-slate-600 dark:text-slate-300">Fecha de emisión</span>
                <input
                  type="date"
                  value={form.issueDate}
                  onChange={(event) =>
                    setForm((c) => ({ ...c, issueDate: event.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="text-slate-600 dark:text-slate-300">
                  Pagar antes de (crédito)
                </span>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(event) =>
                    setForm((c) => ({ ...c, dueDate: event.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Artículos
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setForm((c) => ({
                      ...c,
                      items: [...c.items, emptyPurchaseLine()],
                    }))
                  }
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  <Plus className="h-3.5 w-3.5" /> Agregar línea
                </button>
              </div>
              {form.items.map((line, index) => (
                <div
                  key={index}
                  className="grid gap-2 sm:grid-cols-[1fr_100px_120px_36px] items-end"
                >
                  <label className="block text-xs">
                    <span className="text-slate-500">Producto</span>
                    <input
                      list="purchase-products"
                      value={line.productName}
                      placeholder="Nombre del producto"
                      onChange={(event) => {
                        const name = event.target.value;
                        const match = products.find((p) => p.name === name);
                        updateLine(index, {
                          productName: name,
                          productId: match?.id,
                        });
                      }}
                      className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-xs">
                    <span className="text-slate-500">Cantidad</span>
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      value={line.quantity}
                      onChange={(event) =>
                        updateLine(index, { quantity: event.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-xs">
                    <span className="text-slate-500">Costo USD</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={line.unitCostUSD}
                      onChange={(event) =>
                        updateLine(index, { unitCostUSD: event.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                    />
                  </label>
                  <button
                    type="button"
                    aria-label="Quitar línea"
                    disabled={form.items.length === 1}
                    onClick={() =>
                      setForm((c) => ({
                        ...c,
                        items: c.items.filter((_, i) => i !== index),
                      }))
                    }
                    className="rounded-lg border border-slate-200 dark:border-slate-700 p-2 text-slate-400 hover:text-red-500 disabled:opacity-40"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <datalist id="purchase-products">
                {products.map((product) => (
                  <option key={product.id} value={product.name} />
                ))}
              </datalist>
            </div>

            <label className="block text-sm">
              <span className="text-slate-600 dark:text-slate-300">Notas</span>
              <textarea
                rows={2}
                value={form.notes}
                onChange={(event) =>
                  setForm((c) => ({ ...c, notes: event.target.value }))
                }
                placeholder="Nro. de factura, referencia del depósito…"
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
              />
            </label>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 pt-3">
              <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                Total: {money(grandTotalUSD(form.items))}
              </p>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Guardando…
                  </>
                ) : (
                  "Registrar compra"
                )}
              </button>
            </div>
            {formError ? (
              <p className="text-sm text-red-600">{formError}</p>
            ) : null}
          </form>
        </SectionCard>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por número, proveedor o nota…"
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-9 pr-3 py-2 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as PurchaseStatus | "")
          }
          className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
        >
          <option value="">Todos los estados</option>
          <option value="PENDING">Pendiente</option>
          <option value="RECEIVED">Recibida</option>
          <option value="CANCELLED">Cancelada</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500">
            Todavía no hay compras registradas.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400 dark:border-slate-700">
                <th className="px-4 py-2">Compra</th>
                <th className="px-4 py-2">Proveedor</th>
                <th className="px-4 py-2">Fecha</th>
                <th className="px-4 py-2 text-right">Total USD</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2">Pago</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((purchase) => (
                <tr
                  key={purchase.id}
                  onClick={() => void openDetail(purchase.id)}
                  className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                >
                  <td className="px-4 py-2 font-medium">
                    {purchase.purchaseNumber}
                  </td>
                  <td className="px-4 py-2">{purchase.supplier?.name ?? "—"}</td>
                  <td className="px-4 py-2">
                    {new Date(purchase.issueDate).toLocaleDateString("es-VE")}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {money(purchase.totalUSD)}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS_TONE[purchase.status]}`}
                    >
                      {PURCHASE_STATUS_LABELS[purchase.status]}
                    </span>
                  </td>
                  <td className="px-4 py-2">
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
                        () =>
                          apiClient.post(PurchaseEndpoints.cancel(selected.id)),
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
