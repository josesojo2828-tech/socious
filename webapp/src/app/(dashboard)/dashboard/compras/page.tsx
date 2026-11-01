"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, Plus, Search } from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { TablePagination } from "@/shared/components/molecules/TablePagination";
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
  PURCHASE_STATUS_LABELS,
} from "@/features/purchases/lib/purchase-form";
import { buildListParams } from "@/features/purchases/lib/purchase-list";

interface Paged<T> {
  list: T[];
  total: number;
  totalPages: number;
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
 * Purchase register (S1/S4/S12): Maison table list with a real-aggregate
 * summary strip. Create moved to its own route (/dashboard/compras/nuevo)
 * and the receive/pay/cancel detail moved to the ficha route
 * (/dashboard/compras/[id]) — rows navigate there. The list pages on the
 * server (`page`+`limit:25`) like productos/clientes.
 */
export default function PurchasesPage() {
  const router = useRouter();
  const { addToast } = useToastStore();

  const [rows, setRows] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  /** Real pagination: the backend pages with `page`+`limit:25` (25 per page). */
  const [page, setPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  /** `searchInput` paints the box instantly; `query` commits after 300ms. */
  const [searchInput, setSearchInput] = useState<string>("");
  const [query, setQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<PurchaseStatus | "">("");

  // Debounce the search term; every commit restarts the list at page 1.
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Server-side list: page + filters live in the request, not in a useMemo.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { data } = await apiClient.get<Paged<Purchase>>(
          PurchaseEndpoints.list,
          {
            params: buildListParams({
              page,
              q: query,
              status: statusFilter,
            }),
          },
        );
        if (cancelled) return;
        setRows(data.list ?? []);
        setTotal(data.total ?? 0);
        setTotalPages(Math.max(1, data.totalPages ?? 1));
      } catch (error) {
        if (!cancelled) {
          addToast({
            type: "error",
            title: "Compras",
            message: apiMessage(error, "No se pudieron cargar las compras."),
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [addToast, page, query, statusFilter]);

  // Summary strip aggregates, computed only from the rows on this page.
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
            <span>Compras</span>
            <span className={BRASS_DOT} aria-hidden />
            <span>Registro de facturas</span>
            <span className={BRASS_DOT} aria-hidden />
            <span className="font-mono">{total} en total</span>
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

      {/* Summary strip: real aggregates from the rows of THIS page. */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className={`rounded-2xl px-5 py-4 ${GLASS}`}>
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Compras del mes en página
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
            Pendientes de pago en página
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
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Buscar por número, proveedor o nota…"
            className={`pl-9 pr-3 py-2 ${INPUT}`}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value as PurchaseStatus | "");
            setPage(1);
          }}
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
            {rows.length} de {total}
          </span>
        </div>
        {rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500">
            {total === 0 && !query && !statusFilter
              ? "Todavía no hay compras registradas."
              : "Ninguna compra coincide con la búsqueda."}
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
                    onClick={() =>
                      router.push(`/dashboard/compras/${purchase.id}`)
                    }
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
        <TablePagination
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
