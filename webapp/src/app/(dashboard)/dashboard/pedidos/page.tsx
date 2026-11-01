"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Filter,
  Loader2,
  PackageCheck,
  Route,
  Search,
  Truck,
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
  CTA_NAVY,
  EYEBROW,
  GLASS,
  INPUT,
  LABEL_SM,
  PAGE_TITLE,
  TABLE_HEAD,
  TABLE_ROW,
} from "@/shared/lib/maison-style";
import { OrderEndpoints } from "@/features/orders/services/orders.endpoints";
import type {
  Order,
  OrderAgency,
  OrderStatus,
} from "@/features/orders/types/order.type";
import {
  allowedTransitions,
  buildOrderListParams,
  buildShipPayload,
  FULFILLMENT_LABELS,
  needsShipping,
  ORDER_STATUS_LABELS,
} from "@/features/orders/lib/order-actions";
import { ShippingEndpoints } from "@/features/shipping/services/shipping.endpoints";

interface Paged<T> {
  list: T[];
  total: number;
  totalPages: number;
}

function apiMessage(error: unknown, fallback: string): string {
  const maybe = error as { response?: { data?: { message?: string } } };
  return maybe?.response?.data?.message || fallback;
}

const STATUS_BADGE: Record<OrderStatus, string> = {
  PENDING: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  CONFIRMED: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  PREPARING: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  DELIVERED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  CANCELLED: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
};

/** Cuerpo de INPUT para controles en línea (sin el ancho completo). */
const INLINE_INPUT =
  "rounded-xl border border-[#1a2a46]/15 dark:border-white/15 bg-white/70 dark:bg-slate-950/40 px-3 py-2 text-sm text-[#111018] dark:text-slate-100";

/** Orders inbox (S9): filter what to ship, move the state machine, dispatch. */
export default function OrdersPage() {
  const { addToast } = useToastStore();
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);

  const [rows, setRows] = useState<Order[]>([]);
  const [agencies, setAgencies] = useState<OrderAgency[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [busy, setBusy] = useState<boolean>(false);

  const [typeFilter, setTypeFilter] = useState<string>("");
  const [agencyFilter, setAgencyFilter] = useState<string>("");
  const [shippedFilter, setShippedFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const [selected, setSelected] = useState<Order | null>(null);
  const [shipTracking, setShipTracking] = useState<string>("");
  const [shipDate, setShipDate] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  });

  const currentFilters = useMemo(
    () => ({
      page,
      ...(typeFilter ? { fulfillmentType: typeFilter } : {}),
      ...(agencyFilter ? { agencyId: agencyFilter } : {}),
      ...(shippedFilter ? { shipped: shippedFilter === "true" } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    }),
    [page, typeFilter, agencyFilter, shippedFilter, statusFilter, from, to],
  );

  const load = useCallback(async () => {
    const { data } = await apiClient.get<Paged<Order>>(OrderEndpoints.list, {
      params: buildOrderListParams(currentFilters),
    });
    setRows(data.list);
    setTotal(data.total);
  }, [currentFilters]);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    try {
      const [orderPage, agencyList] = await Promise.all([
        apiClient.get<Paged<Order>>(OrderEndpoints.list, {
          params: buildOrderListParams({ page: 1 }),
        }),
        apiClient
          .get<OrderAgency[]>(ShippingEndpoints.agencies)
          .catch(() => ({ data: [] as OrderAgency[] })),
      ]);
      setRows(orderPage.data.list);
      setTotal(orderPage.data.total);
      setAgencies(agencyList.data);
    } catch {
      addToast({
        type: "error",
        title: "Pedidos",
        message: "No se pudo cargar la bandeja.",
      });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  // Refetch whenever a filter (and its page) changes.
  useEffect(() => {
    void load().catch(() => undefined);
  }, [load]);

  const openDetail = useCallback(async (orderId: string) => {
    const { data } = await apiClient.get<Order>(OrderEndpoints.detail(orderId));
    setSelected(data);
    setShipTracking(data.trackingNumber ?? "");
  }, []);

  async function run(action: () => Promise<void>): Promise<void> {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  const changeStatus = (status: OrderStatus) =>
    run(async () => {
      if (!selected) return;
      try {
        await apiClient.post(OrderEndpoints.status(selected.id), { status });
        addToast({
          type: "success",
          title: "Pedido",
          message: `${selected.orderNumber} → ${ORDER_STATUS_LABELS[status]}.`,
        });
        await openDetail(selected.id);
        await load();
      } catch (error) {
        addToast({
          type: "error",
          title: "Pedido",
          message: apiMessage(error, "No se pudo cambiar el estado."),
        });
      }
    });

  const handleShip = () =>
    run(async () => {
      if (!selected) return;
      try {
        await apiClient.post(
          OrderEndpoints.ship(selected.id),
          buildShipPayload(shipTracking, shipDate),
        );
        addToast({
          type: "success",
          title: "Pedido",
          message: `${selected.orderNumber} marcado como despachado.`,
        });
        await openDetail(selected.id);
        await load();
      } catch (error) {
        addToast({
          type: "error",
          title: "Pedido",
          message: apiMessage(error, "No se pudo registrar el envío."),
        });
      }
    });

  const handleConvert = () =>
    run(async () => {
      if (!selected) return;
      try {
        const { data } = await apiClient.post<{ saleNumber: string }>(
          OrderEndpoints.convert(selected.id),
        );
        addToast({
          type: "success",
          title: "Pedido",
          message: `${selected.orderNumber} → venta ${data.saleNumber}.`,
        });
        await openDetail(selected.id);
        await load();
      } catch (error) {
        addToast({
          type: "error",
          title: "Pedido",
          message: apiMessage(error, "No se pudo convertir en venta."),
        });
      }
    });

  const totalPages = Math.max(1, Math.ceil(total / 10));

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
            <span>Pedidos</span>
            <span className={BRASS_DOT} aria-hidden />
            <span className="truncate">
              {statusFilter
                ? ORDER_STATUS_LABELS[statusFilter as OrderStatus] ?? "Todos"
                : "Todos"}
            </span>
          </div>
          <h1 className={PAGE_TITLE}>Bandeja de pedidos</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {total} pedido(s) · confirmá, coordiná y despachá desde acá.
          </p>
        </div>
      </header>

      <div className={`rounded-2xl p-4 ${GLASS}`}>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className={LABEL_SM}>Tipo de entrega</span>
            <select
              value={typeFilter}
              onChange={(event) => {
                setPage(1);
                setTypeFilter(event.target.value);
              }}
              className={INPUT}
            >
              <option value="">Todos</option>
              {Object.entries(FULFILLMENT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className={LABEL_SM}>Agencia</span>
            <select
              value={agencyFilter}
              onChange={(event) => {
                setPage(1);
                setAgencyFilter(event.target.value);
              }}
              className={INPUT}
            >
              <option value="">Todas</option>
              {agencies.map((agency) => (
                <option key={agency.id} value={agency.id}>
                  {agency.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className={LABEL_SM}>Despacho</span>
            <select
              value={shippedFilter}
              onChange={(event) => {
                setPage(1);
                setShippedFilter(event.target.value);
              }}
              className={INPUT}
            >
              <option value="">Todos</option>
              <option value="false">Pendientes de enviar</option>
              <option value="true">Ya despachados</option>
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className={LABEL_SM}>Estado</span>
            <select
              value={statusFilter}
              onChange={(event) => {
                setPage(1);
                setStatusFilter(event.target.value);
              }}
              className={INPUT}
            >
              <option value="">Todos</option>
              {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className={LABEL_SM}>Desde</span>
            <input
              type="date"
              value={from}
              onChange={(event) => {
                setPage(1);
                setFrom(event.target.value);
              }}
              className={INPUT}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className={LABEL_SM}>Hasta</span>
            <input
              type="date"
              value={to}
              onChange={(event) => {
                setPage(1);
                setTo(event.target.value);
              }}
              className={INPUT}
            />
          </label>

          <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-slate-400">
            <Filter className="h-3.5 w-3.5" /> filtros en vivo
          </span>
        </div>
      </div>

      <div className={`rounded-2xl overflow-hidden ${CARD}`}>
        <div className={CARD_HEADER}>
          <h2 className="font-semibold text-[17px] tracking-tight text-[#111018] dark:text-slate-100">
            Pedidos
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            {rows.length} en pantalla
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={TABLE_HEAD}>
                <th className="px-4 py-2.5 text-left font-medium">Pedido</th>
                <th className="px-4 py-2.5 text-left font-medium">Cliente</th>
                <th className="px-4 py-2.5 text-left font-medium">Entrega</th>
                <th className="px-4 py-2.5 text-right font-medium">Total USD</th>
                <th className="px-4 py-2.5 text-left font-medium">Estado</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {rows.map((order) => (
                <tr
                  key={order.id}
                  className={`${TABLE_ROW} ${
                    selected?.id === order.id
                      ? "bg-[#1a2a46]/[0.06] dark:bg-white/10"
                      : ""
                  }`}
                >
                  <td className="px-4 py-2.5">
                    <p className="font-mono text-xs tabular-nums font-medium text-[#111018] dark:text-slate-100">
                      {order.orderNumber}
                    </p>
                    <p className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                      {new Date(order.createdAt).toLocaleDateString("es-VE")}
                    </p>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[#111018] dark:text-slate-100">
                    {order.customerName}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400">
                    {FULFILLMENT_LABELS[order.fulfillmentType]}
                    {order.agency ? ` · ${order.agency.name}` : ""}
                    {order.shippedAt ? " · enviado" : ""}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums font-medium text-[#111018] dark:text-slate-100">
                    ${Number(order.totalUSD).toFixed(2)}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex rounded-full border border-transparent px-2 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[order.status]}`}
                    >
                      {ORDER_STATUS_LABELS[order.status]}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => void openDetail(order.id)}
                      className="rounded-lg border border-[#1a2a46]/15 px-2.5 py-1 text-xs font-medium text-[#1a2a46]/80 hover:bg-[#1a2a46]/[0.05] transition-colors dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5"
                    >
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                    Sin pedidos para esos filtros.
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
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="rounded-lg border border-[#1a2a46]/15 px-2.5 py-1 text-xs font-medium text-[#1a2a46]/70 disabled:opacity-40 transition-colors dark:border-white/15 dark:text-slate-300"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((value) => value + 1)}
              className="rounded-lg border border-[#1a2a46]/15 px-2.5 py-1 text-xs font-medium text-[#1a2a46]/70 disabled:opacity-40 transition-colors dark:border-white/15 dark:text-slate-300"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {selected ? (
        <div className={`rounded-2xl overflow-hidden ${CARD}`}>
          <div className={CARD_HEADER}>
            <div className="min-w-0">
              <h2 className="font-semibold text-[17px] tracking-tight text-[#111018] dark:text-slate-100">
                {selected.orderNumber} · {selected.customerName}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {selected.customerAddress
                  ? selected.customerAddress
                  : "Sin dirección cargada"}
              </p>
            </div>
            <span
              className={`inline-flex shrink-0 rounded-full border border-transparent px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${STATUS_BADGE[selected.status]}`}
            >
              {ORDER_STATUS_LABELS[selected.status]}
            </span>
          </div>
          <div className="p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  Contacto
                </p>
                <SectionRow label="Correo">
                  <span className="text-sm font-mono break-all text-right">
                    {selected.customerEmail ?? "—"}
                  </span>
                </SectionRow>
                <SectionRow label="Teléfono">
                  <span className="text-sm font-mono tabular-nums">
                    {selected.customerPhone ?? "—"}
                  </span>
                </SectionRow>
                <SectionRow label="Coordinación">
                  <span className="text-sm capitalize">{selected.coordination}</span>
                </SectionRow>
                <SectionRow label="Total">
                  <span className="text-sm font-semibold font-mono tabular-nums">
                    ${Number(selected.totalUSD).toFixed(2)}
                  </span>
                </SectionRow>
                {selected.sale ? (
                  <SectionRow label="Venta generada">
                    <span className="text-sm font-mono tabular-nums text-[#8e7538] dark:text-[#d8c084]">
                      {selected.sale.saleNumber}
                    </span>
                  </SectionRow>
                ) : null}
              </div>

              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  Artículos
                </p>
                {(selected.items ?? []).map((item) => (
                  <SectionRow
                    key={item.id}
                    label={`${item.quantity} × ${item.productName}`}
                  >
                    <span className="text-sm font-mono tabular-nums">
                      ${Number(item.totalUSD).toFixed(2)}
                    </span>
                  </SectionRow>
                ))}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                Avanzar:
              </span>
              {allowedTransitions(selected.status).map((status) => (
                <button
                  key={status}
                  type="button"
                  disabled={busy}
                  onClick={() => changeStatus(status)}
                  className={
                    status === "CANCELLED"
                      ? "inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/30 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-500/10 disabled:opacity-40 transition-colors dark:text-red-400"
                      : `px-3 py-1.5 text-sm disabled:opacity-40 ${BTN_GHOST}`
                  }
                >
                  {ORDER_STATUS_LABELS[status]}
                </button>
              ))}
              {allowedTransitions(selected.status).length === 0 ? (
                <span className="text-xs text-slate-400">Sin acciones disponibles.</span>
              ) : null}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#1b1d21]/12 pt-3 dark:border-white/10">
              {!selected.saleId && selected.status !== "CANCELLED" ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleConvert()}
                  className={`px-3 py-2 text-sm disabled:opacity-50 ${CTA_BRASS}`}
                >
                  <PackageCheck className="h-4 w-4" /> Convertir en venta
                </button>
              ) : null}

              {needsShipping(selected) && !selected.shippedAt ? (
                <span className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={shipTracking}
                    onChange={(event) => setShipTracking(event.target.value)}
                    placeholder="Nº de seguimiento"
                    className={`w-44 ${INLINE_INPUT}`}
                  />
                  <input
                    type="date"
                    value={shipDate}
                    onChange={(event) => setShipDate(event.target.value)}
                    className={INLINE_INPUT}
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleShip()}
                    className={`px-3 py-2 text-sm disabled:opacity-50 ${CTA_NAVY}`}
                  >
                    <Truck className="h-4 w-4" /> Despachar
                  </button>
                </span>
              ) : null}

              {selected.shippedAt ? (
                <span className="inline-flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                  <PackageCheck className="h-4 w-4" />
                  Despachado el {new Date(selected.shippedAt).toLocaleDateString("es-VE")}
                  {selected.trackingNumber ? ` · ${selected.trackingNumber}` : ""}
                </span>
              ) : null}

              {needsShipping(selected) ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                  {selected.fulfillmentType === "SHIPPING" ? (
                    <Truck className="h-3.5 w-3.5" />
                  ) : (
                    <Route className="h-3.5 w-3.5" />
                  )}
                  {selected.agency?.name ?? FULFILLMENT_LABELS[selected.fulfillmentType]}
                </span>
              ) : null}
            </div>

            <p className="mt-3 flex items-center gap-2 text-xs text-slate-400">
              <Search className="h-3.5 w-3.5" />
              Los filtros de arriba son en vivo: usalos para armar lo que hay que
              despachar hoy.
            </p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Seleccioná un pedido para confirmarlo, convertirlo en venta o
          despacharlo.
        </p>
      )}
    </div>
  );
}
