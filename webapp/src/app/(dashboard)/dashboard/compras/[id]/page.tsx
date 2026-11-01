"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Ban,
  FileText,
  Loader2,
  Package,
  Save,
} from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { InternalLink } from "@/shared/components/atoms/InternalLink";
import {
  BRASS_DOT,
  BTN_GHOST,
  CTA_BRASS,
  CARD,
  CARD_HEADER,
  EYEBROW,
  GLASS,
  INPUT,
  LABEL_SM,
  PAGE_TITLE,
  TABLE_HEAD,
  TABLE_ROW,
} from "@/shared/lib/maison-style";
import { PurchaseEndpoints } from "@/features/purchases/services/purchases.endpoints";
import { isImageInvoiceKey } from "@/features/purchases/lib/purchase-invoice";
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

/** Outstanding USD of a purchase (total minus payments, rounded to cents). */
function unpaidUSD(purchase: Purchase): number {
  const total = Number(purchase.totalUSD);
  const paid = purchase.payments.reduce(
    (sum, payment) => sum + Number(payment.amountUSD),
    0,
  );
  return Math.round((total - paid) * 100) / 100;
}

function paidUSD(purchase: Purchase): number {
  return purchase.payments.reduce(
    (sum, payment) => sum + Number(payment.amountUSD),
    0,
  );
}

function formatDate(value: string | null | undefined): string {
  return value ? new Date(value).toLocaleDateString("es-VE") : "—";
}

function FactRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p
        className={`text-sm text-right text-[#111018] dark:text-slate-100 break-words ${
          mono ? "font-mono tabular-nums" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

/**
 * Purchase ficha (makeover S12): the detail route that replaced the list
 * drawer. Same receive / pay / cancel logic and messages as the drawer, now
 * as a real page; every action refetches the detail so the badges, balance
 * and payments stay truthful.
 */
export default function PurchaseDetailPage() {
  const params = useParams();
  const purchaseId = params?.id as string | undefined;
  const { addToast } = useToastStore();

  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<boolean>(false);

  const [payAmount, setPayAmount] = useState<string>("");
  const [payMethod, setPayMethod] = useState<string>("CASH_USD");
  const [payDate, setPayDate] = useState<string>(todayISO);
  const [payReference, setPayReference] = useState<string>("");

  /**
   * Invoice attachment (S14 #5): the key is PRIVATE — the view downloads the
   * authenticated stream (Bearer via apiClient) into an object URL and shows
   * an <img> for image keys, a new-tab link for everything else (PDF). No
   * MinIO hostname ever reaches the browser.
   */
  const [invoice, setInvoice] = useState<{
    busy: boolean;
    data: { url: string; key: string } | null;
    error: string | null;
  }>({ busy: false, data: null, error: null });

  const openInvoice = async () => {
    if (!purchaseId || invoice.busy || invoice.data) return;
    setInvoice({ busy: true, data: null, error: null });
    try {
      const { data: blob } = await apiClient.get<Blob>(
        PurchaseEndpoints.invoice(purchaseId),
        { responseType: "blob" },
      );
      setInvoice({
        busy: false,
        data: {
          url: URL.createObjectURL(blob),
          key: purchase?.invoiceKey ?? "",
        },
        error: null,
      });
    } catch (loadError) {
      setInvoice({
        busy: false,
        data: null,
        error: apiMessage(loadError, "No se pudo abrir la factura."),
      });
    }
  };

  // Revocar el object URL anterior cuando cambia o el componente se va.
  const invoiceUrl = invoice.data?.url;
  useEffect(
    () => () => {
      if (invoiceUrl) URL.revokeObjectURL(invoiceUrl);
    },
    [invoiceUrl],
  );

  const loadDetail = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!purchaseId) return;
      if (!options?.silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const { data } = await apiClient.get<Purchase>(
          PurchaseEndpoints.detail(purchaseId),
        );
        setPurchase(data);
      } catch (loadError) {
        const message = apiMessage(loadError, "No se pudo abrir la compra.");
        if (options?.silent) {
          addToast({ type: "error", title: "Compra", message });
        } else {
          setError(message);
        }
      } finally {
        if (!options?.silent) setLoading(false);
      }
    },
    [purchaseId, addToast],
  );

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  /** Drawer logic, verbatim: toast + refetch the detail on success. */
  const runAction = async (
    action: () => Promise<unknown>,
    successMessage: string,
  ) => {
    setActionBusy(true);
    try {
      await action();
      addToast({ type: "success", title: "Compra", message: successMessage });
      await loadDetail({ silent: true });
    } catch (actionError) {
      addToast({
        type: "error",
        title: "Compra",
        message: apiMessage(actionError, "La acción no se pudo completar."),
      });
    } finally {
      setActionBusy(false);
    }
  };

  const handleReceive = () => {
    if (!purchase) return;
    void runAction(
      () => apiClient.post(PurchaseEndpoints.receive(purchase.id)),
      "Mercancía recibida; el stock fue actualizado.",
    );
  };

  const handleCancel = () => {
    if (!purchase) return;
    const confirmed = window.confirm(
      `¿Anular ${purchase.purchaseNumber}? La compra queda cancelada y no se puede deshacer.`,
    );
    if (!confirmed) return;
    void runAction(
      () => apiClient.post(PurchaseEndpoints.cancel(purchase.id)),
      "Compra cancelada.",
    );
  };

  const submitPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!purchase) return;
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
        apiClient.post(PurchaseEndpoints.payments(purchase.id), {
          amountOriginal: amount,
          currency: paymentCurrencyForMethod(payMethod),
          paymentMethod: payMethod,
          ...(payDate && !Number.isNaN(Date.parse(payDate))
            ? { paidAt: new Date(`${payDate}T12:00:00`).toISOString() }
            : {}),
          ...(payReference.trim() ? { reference: payReference.trim() } : {}),
        }),
      "Pago registrado.",
    );
    setPayAmount("");
    setPayReference("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !purchase) {
    return (
      <div className="max-w-2xl mx-auto my-12 space-y-4 text-center">
        <div className="flex justify-center text-red-500">
          <AlertCircle size={48} />
        </div>
        <h3 className="text-lg font-bold text-red-800 dark:text-red-300">
          No se pudo abrir la compra
        </h3>
        <p className="text-red-600 dark:text-red-400">
          {error ?? "Compra no encontrada."}
        </p>
        <InternalLink
          href="/dashboard/compras"
          variant="hover"
          className="text-sm text-slate-500 hover:text-[#111018] dark:hover:text-slate-100 inline-flex items-center gap-1.5"
        >
          <ArrowLeft size={16} />
          Volver a compras
        </InternalLink>
      </div>
    );
  }

  const total = Number(purchase.totalUSD);
  const paid = paidUSD(purchase);
  const outstanding = unpaidUSD(purchase);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <InternalLink
        href="/dashboard/compras"
        variant="hover"
        className="text-sm text-slate-500 dark:text-slate-400 hover:text-[#111018] dark:hover:text-slate-100 flex items-center gap-1.5 no-underline hover:underline w-fit"
      >
        <ArrowLeft size={16} />
        Volver a compras
      </InternalLink>

      {/* ===== Encabezado de la ficha ===== */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className={EYEBROW}>
            <span>Compras</span>
            <span className={BRASS_DOT} aria-hidden />
            <span>Ficha</span>
          </div>
          <h1 className={`${PAGE_TITLE} font-mono tabular-nums`}>
            {purchase.purchaseNumber}
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {purchase.supplier?.name ?? "Sin proveedor"} ·{" "}
            {formatDate(purchase.issueDate)}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span
              className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS_TONE[purchase.status]}`}
            >
              {PURCHASE_STATUS_LABELS[purchase.status]}
            </span>
            <span
              className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${PAYMENT_TONE[purchase.paymentStatus]}`}
            >
              {PAYMENT_STATUS_LABELS[purchase.paymentStatus]}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {purchase.status === "PENDING" ? (
            <button
              type="button"
              disabled={actionBusy}
              onClick={handleReceive}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2.5"
            >
              <Package className="h-4 w-4" /> Recibir mercancía
            </button>
          ) : null}
          {purchase.status === "PENDING" ? (
            <button
              type="button"
              disabled={actionBusy}
              onClick={handleCancel}
              className="inline-flex items-center gap-2 rounded-xl border border-red-300/70 dark:border-red-500/30 px-4 py-2.5 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-40"
            >
              <Ban className="h-4 w-4" /> Cancelar compra
            </button>
          ) : null}
        </div>
      </header>

      {/* ===== Datos + resumen ===== */}
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className={`rounded-xl ${CARD}`}>
          <div className={CARD_HEADER}>
            <h3 className="font-semibold text-[15px] tracking-tight text-[#111018] dark:text-slate-100">
              Datos de la factura
            </h3>
          </div>
          <div className="px-5 py-2 divide-y divide-[#1a2a46]/8 dark:divide-white/5">
            <FactRow label="Número" value={purchase.purchaseNumber} mono />
            <FactRow
              label="Proveedor"
              value={purchase.supplier?.name ?? "—"}
            />
            <FactRow
              label="Fecha de emisión"
              value={formatDate(purchase.issueDate)}
              mono
            />
            <FactRow
              label="Pagar antes de"
              value={formatDate(purchase.dueDate)}
              mono
            />
            <FactRow
              label="Estado"
              value={PURCHASE_STATUS_LABELS[purchase.status]}
            />
            <FactRow
              label="Pago"
              value={PAYMENT_STATUS_LABELS[purchase.paymentStatus]}
            />
            {purchase.notes ? (
              <FactRow label="Notas" value={purchase.notes} />
            ) : null}
          </div>

          {/* Factura adjunta (S14 #5): URL firmada, nunca la ruta pública. */}
          {purchase.invoiceKey ? (
            <div className="px-5 py-3 border-t border-[#1a2a46]/8 dark:border-white/5 space-y-2">
              {!invoice.data ? (
                <button
                  type="button"
                  onClick={() => void openInvoice()}
                  disabled={invoice.busy}
                  className={BTN_GHOST}
                >
                  {invoice.busy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Cargando
                      factura…
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4" /> Ver factura
                    </>
                  )}
                </button>
              ) : null}
              {invoice.error ? (
                <p className="text-xs text-red-600 dark:text-red-400">
                  {invoice.error}
                </p>
              ) : null}
              {invoice.data ? (
                isImageInvoiceKey(invoice.data.key) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={invoice.data.url}
                    alt="Factura de la compra"
                    className="max-h-96 w-auto rounded-lg border border-[#1a2a46]/10 dark:border-white/10"
                  />
                ) : (
                  <a
                    href={invoice.data.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#b2944a] hover:underline"
                  >
                    <FileText className="h-4 w-4" /> Abrir factura en una
                    pestaña nueva
                  </a>
                )
              ) : null}
            </div>
          ) : null}
        </div>

        <div className={`rounded-xl ${CARD}`}>
          <div className={CARD_HEADER}>
            <h3 className="font-semibold text-[15px] tracking-tight text-[#111018] dark:text-slate-100">
              Resumen
            </h3>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              USD
            </span>
          </div>
          <div className="px-5 py-3 space-y-2 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-slate-500 dark:text-slate-400">Total</span>
              <span className="font-mono tabular-nums text-[#111018] dark:text-slate-100">
                {money(total)}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-slate-500 dark:text-slate-400">
                Pagado
              </span>
              <span className="font-mono tabular-nums text-[#111018] dark:text-slate-100">
                {money(paid)}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-3 border-t border-[#1a2a46]/10 dark:border-white/10 pt-2">
              <span className="font-medium text-[#111018] dark:text-slate-100">
                Pendiente
              </span>
              <span className="font-mono tabular-nums text-base font-semibold text-amber-600 dark:text-amber-400">
                {money(outstanding)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Artículos ===== */}
      <div className={`rounded-2xl overflow-hidden ${CARD}`}>
        <div className={CARD_HEADER}>
          <h2 className="font-semibold text-[17px] tracking-tight text-[#111018] dark:text-slate-100">
            Artículos
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            {purchase.items.length} línea
            {purchase.items.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={TABLE_HEAD}>
                <th className="px-4 py-2.5 text-left font-medium">Producto</th>
                <th className="px-4 py-2.5 text-right font-medium">
                  Cantidad
                </th>
                <th className="px-4 py-2.5 text-right font-medium">
                  Costo USD
                </th>
                <th className="px-4 py-2.5 text-right font-medium">
                  Total USD
                </th>
              </tr>
            </thead>
            <tbody>
              {purchase.items.map((item) => (
                <tr key={item.id} className={TABLE_ROW}>
                  <td className="px-4 py-2.5 text-[#111018] dark:text-slate-100">
                    {item.productName}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    {Number(item.quantity)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    {money(item.unitCostUSD)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums font-medium text-[#111018] dark:text-slate-100">
                    {money(item.totalUSD)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-[#1b1d21]/12 dark:border-white/10 flex items-baseline justify-end gap-3">
          <span className="text-sm font-medium text-[#111018] dark:text-slate-100">
            Total
          </span>
          <span className="font-mono tabular-nums font-semibold text-[#111018] dark:text-slate-100">
            {money(total)}
          </span>
        </div>
      </div>

      {/* ===== Registrar pago (drawer logic: only when not CANCELLED) ===== */}
      {purchase.status !== "CANCELLED" ? (
        <section className={`rounded-2xl ${GLASS} p-5 sm:p-6 space-y-4`}>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-semibold text-[17px] tracking-tight text-[#111018] dark:text-slate-100">
              Registrar pago
            </h2>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Saldo pendiente {money(outstanding)}
            </span>
          </div>
          <form onSubmit={submitPayment} className="grid gap-3 sm:grid-cols-2">
            <label className={LABEL_SM}>
              Monto
              <input
                type="number"
                min="0.01"
                step="any"
                value={payAmount}
                onChange={(event) => setPayAmount(event.target.value)}
                className={`mt-1 ${INPUT}`}
              />
            </label>
            <label className={LABEL_SM}>
              Método
              <select
                value={payMethod}
                onChange={(event) => setPayMethod(event.target.value)}
                className={`mt-1 ${INPUT}`}
              >
                {PURCHASE_PAYMENT_METHODS.map((method) => (
                  <option key={method.code} value={method.code}>
                    {method.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={LABEL_SM}>
              Fecha del pago
              <input
                type="date"
                value={payDate}
                onChange={(event) => setPayDate(event.target.value)}
                className={`mt-1 ${INPUT}`}
              />
            </label>
            <label className={LABEL_SM}>
              Referencia (opcional)
              <input
                value={payReference}
                onChange={(event) => setPayReference(event.target.value)}
                placeholder="Nro. de referencia o transferencia"
                className={`mt-1 ${INPUT}`}
              />
            </label>
            <p className="sm:col-span-2 text-xs text-slate-500 dark:text-slate-400">
              La fecha es la del pago real: un pago de octubre sobre una factura
              de noviembre sigue siendo pago de octubre.
            </p>
            <div className="sm:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={actionBusy}
                className={`px-5 py-2.5 text-sm ${CTA_BRASS}`}
              >
                <Save className="h-4 w-4" /> Registrar pago
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {/* ===== Pagos registrados ===== */}
      {purchase.payments.length > 0 ? (
        <div className={`rounded-2xl ${CARD}`}>
          <div className={CARD_HEADER}>
            <h2 className="font-semibold text-[17px] tracking-tight text-[#111018] dark:text-slate-100">
              Pagos registrados
            </h2>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              {purchase.payments.length} pago
              {purchase.payments.length === 1 ? "" : "s"}
            </span>
          </div>
          <ul className="divide-y divide-[#1a2a46]/8 dark:divide-white/5">
            {purchase.payments.map((payment) => (
              <li
                key={payment.id}
                className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm"
              >
                <span className="text-[#111018] dark:text-slate-100">
                  {formatDate(payment.paidAt)}{" "}
                  <span className="text-slate-400">
                    {payment.paymentMethod}
                  </span>
                  {payment.reference ? (
                    <span className="text-slate-400"> · {payment.reference}</span>
                  ) : null}
                </span>
                <span className="font-mono tabular-nums font-medium text-[#111018] dark:text-slate-100">
                  {money(payment.amountUSD)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* ===== Panel de cristal decorativo del patrón Maison ===== */}
      <div className={`rounded-3xl px-5 py-4 ${GLASS}`}>
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          La compra entra al inventario al recibirla · cada pago actualiza la
          cuenta por pagar del proveedor
        </p>
      </div>
    </div>
  );
}
