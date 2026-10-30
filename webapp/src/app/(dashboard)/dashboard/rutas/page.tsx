"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Loader2,
  Map,
  MapPin,
  Plus,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { SectionCard, SectionRow } from "@/shared/components/molecules/SectionCard";
import { DeliveryRouteEndpoints } from "@/features/routes/services/delivery-routes.endpoints";
import type {
  DeliveryRoute,
  RouteStatus,
} from "@/features/routes/types/delivery-route.type";
import {
  allowedRouteTransitions,
  buildCreateRoutePayload,
  buildMarkItemPayload,
  buildRouteListParams,
  ROUTE_STATUS_LABELS,
  routeProgress,
} from "@/features/routes/lib/route-actions";
import { OrderEndpoints } from "@/features/orders/services/orders.endpoints";
import type { Order } from "@/features/orders/types/order.type";
import { getTenantSettings } from "@/features/settings/services/settings.service";
import { todayISO } from "@/features/cash/lib/cash-form";

interface Paged<T> {
  list: T[];
  total: number;
}

function apiMessage(error: unknown, fallback: string): string {
  const maybe = error as { response?: { data?: { message?: string } } };
  return maybe?.response?.data?.message || fallback;
}

/**
 * Delivery routes (S10): group the orders of one day into a route and mark
 * each stop. The whole screen only exists while `settings.routes.enabled`
 * is on — the same check that drives the sidebar entry.
 */
export default function RoutesPage() {
  const { addToast } = useToastStore();

  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [routes, setRoutes] = useState<DeliveryRoute[]>([]);
  const [selected, setSelected] = useState<DeliveryRoute | null>(null);
  const [candidates, setCandidates] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [busy, setBusy] = useState<boolean>(false);

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [routeDate, setRouteDate] = useState<string>(() => todayISO());
  const [routeName, setRouteName] = useState<string>("");
  const [routeVehicle, setRouteVehicle] = useState<string>("");

  const loadRoutes = useCallback(async () => {
    const { data } = await apiClient.get<Paged<DeliveryRoute>>(
      DeliveryRouteEndpoints.list,
      {
        params: buildRouteListParams({
          ...(statusFilter ? { status: statusFilter } : {}),
        }),
      },
    );
    setRoutes(data.list);
  }, [statusFilter]);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    try {
      const settings = await getTenantSettings();
      setEnabled(settings.routes.enabled);
      if (settings.routes.enabled) {
        await loadRoutes();
      }
    } catch {
      addToast({
        type: "error",
        title: "Rutas",
        message: "No se pudo cargar la configuración.",
      });
    } finally {
      setLoading(false);
    }
  }, [loadRoutes, addToast]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (!enabled) return;
    void loadRoutes().catch(() => undefined);
  }, [enabled, loadRoutes]);

  const openDetail = useCallback(async (routeId: string) => {
    const { data } = await apiClient.get<DeliveryRoute>(
      DeliveryRouteEndpoints.detail(routeId),
    );
    setSelected(data);

    // Candidates to add: confirmed/preparing/delivered orders the backend
    // accepts (it refuses PENDING and CANCELLED itself).
    const { data: orderPage } = await apiClient.get<Paged<Order>>(
      OrderEndpoints.list,
      { params: { page: 1, limit: 50 } },
    );
    setCandidates(
      orderPage.list.filter(
        (order) =>
          !["PENDING", "CANCELLED"].includes(order.status) &&
          !(data.items ?? []).some((item) => item.orderId === order.id),
      ),
    );
  }, []);

  async function run(action: () => Promise<void>): Promise<void> {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  const handleCreate = () =>
    run(async () => {
      try {
        const { data } = await apiClient.post<DeliveryRoute>(
          DeliveryRouteEndpoints.list,
          buildCreateRoutePayload({
            date: routeDate,
            name: routeName,
            vehicle: routeVehicle,
          }),
        );
        addToast({
          type: "success",
          title: "Rutas",
          message: `${data.routeNumber} creada.`,
        });
        setRouteName("");
        setRouteVehicle("");
        await loadRoutes();
        await openDetail(data.id);
      } catch (error) {
        addToast({
          type: "error",
          title: "Rutas",
          message: apiMessage(error, "No se pudo crear la ruta."),
        });
      }
    });

  const changeStatus = (status: RouteStatus) =>
    run(async () => {
      if (!selected) return;
      try {
        await apiClient.patch(DeliveryRouteEndpoints.status(selected.id), {
          status,
        });
        addToast({
          type: "success",
          title: "Rutas",
          message: `${selected.routeNumber} → ${ROUTE_STATUS_LABELS[status]}.`,
        });
        await openDetail(selected.id);
        await loadRoutes();
      } catch (error) {
        addToast({
          type: "error",
          title: "Rutas",
          message: apiMessage(error, "No se pudo cambiar el estado."),
        });
      }
    });

  const assignOrder = (orderId: string) =>
    run(async () => {
      if (!selected) return;
      try {
        await apiClient.post(DeliveryRouteEndpoints.orders(selected.id), {
          orderIds: [orderId],
        });
        addToast({ type: "success", title: "Rutas", message: "Pedido agregado." });
        await openDetail(selected.id);
        await loadRoutes();
      } catch (error) {
        addToast({
          type: "error",
          title: "Rutas",
          message: apiMessage(error, "No se pudo agregar el pedido."),
        });
      }
    });

  const removeOrder = (orderId: string) =>
    run(async () => {
      if (!selected) return;
      try {
        await apiClient.delete(DeliveryRouteEndpoints.order(selected.id, orderId));
        await openDetail(selected.id);
        await loadRoutes();
      } catch (error) {
        addToast({
          type: "error",
          title: "Rutas",
          message: apiMessage(error, "No se pudo quitar el pedido."),
        });
      }
    });

  const markItem = (itemId: string, status: "DELIVERED" | "FAILED") =>
    run(async () => {
      if (!selected) return;
      try {
        const payload =
          status === "FAILED"
            ? buildMarkItemPayload(
                "FAILED",
                window.prompt("¿Motivo del fallo de entrega?") ?? "",
              )
            : buildMarkItemPayload("DELIVERED");

        await apiClient.patch(
          DeliveryRouteEndpoints.item(selected.id, itemId),
          payload,
        );
        addToast({
          type: "success",
          title: "Rutas",
          message: status === "DELIVERED" ? "Entrega registrada." : "Fallo registrado.",
        });
        await openDetail(selected.id);
        await loadRoutes();
      } catch (error) {
        addToast({
          type: "error",
          title: "Rutas",
          message: apiMessage(error, "No se pudo actualizar la entrega."),
        });
      }
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!enabled) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
        <Map className="h-8 w-8 text-slate-300" />
        <p className="text-sm text-slate-500">
          Las rutas de entrega están desactivadas en este negocio.
        </p>
        <Link
          href="/dashboard/configuracion"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
        >
          Habilitar en Configuración
        </Link>
      </div>
    );
  }

  const editable =
    selected?.status === "OPEN" || selected?.status === "IN_PROGRESS";
  const progress = selected ? routeProgress(selected) : null;

  return (
    <div className="px-4 py-6 space-y-4">
      <header>
        <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
          Rutas de entrega
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Un ruta por día: agrupá los pedidos confirmados y marcá cada parada.
        </p>
      </header>

      <SectionCard
        icon={<Plus className="h-5 w-5" />}
        title="Nueva ruta"
        description="Solo puede haber una ruta abierta por día."
      >
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-slate-500">
            Día
            <input
              type="date"
              value={routeDate}
              onChange={(event) => setRouteDate(event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-500">
            Nombre
            <input
              value={routeName}
              onChange={(event) => setRouteName(event.target.value)}
              placeholder="Entregas del sábado"
              className="w-56 rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-500">
            Vehículo
            <input
              value={routeVehicle}
              onChange={(event) => setRouteVehicle(event.target.value)}
              placeholder="Camioneta, moto…"
              className="w-40 rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
            />
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleCreate()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Crear ruta
          </button>
        </div>
      </SectionCard>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <label className="flex flex-col gap-1 text-xs text-slate-500">
          Estado
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
          >
            <option value="">Todas</option>
            {Object.entries(ROUTE_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="space-y-2">
          {routes.map((route) => {
            const item = routeProgress(route);
            return (
              <button
                key={route.id}
                type="button"
                onClick={() => void openDetail(route.id)}
                className={`w-full rounded-xl border p-3 text-left ${
                  selected?.id === route.id
                    ? "border-indigo-400 bg-indigo-50 dark:border-indigo-600 dark:bg-indigo-950"
                    : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{route.routeNumber}</span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase text-slate-500 dark:bg-slate-800">
                    {ROUTE_STATUS_LABELS[route.status]}
                  </span>
                </div>
                <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {new Date(`${route.date}T12:00:00Z`).toLocaleDateString("es-VE")}
                  {route.name ? ` · ${route.name}` : ""}
                </p>
                <p className="mt-1 text-xs text-slate-400">{item.label}</p>
              </button>
            );
          })}
          {routes.length === 0 ? (
            <p className="text-sm text-slate-500">
              Todavía no hay rutas creadas.
            </p>
          ) : null}
        </div>

        {selected ? (
          <SectionCard
            icon={<MapPin className="h-5 w-5" />}
            title={`${selected.routeNumber} · ${selected.name ?? "sin nombre"}`}
            description={
              selected.vehicle
                ? `Vehículo: ${selected.vehicle}`
                : "Sin vehículo asignado"
            }
          >
            {progress ? (
              <div className="mb-3 flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-2 rounded-full bg-indigo-500"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
                <span className="text-xs text-slate-500">{progress.label}</span>
              </div>
            ) : null}

            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium uppercase text-slate-400">
                Estado:
              </span>
              {allowedRouteTransitions(selected.status).map((status) => (
                <button
                  key={status}
                  type="button"
                  disabled={busy}
                  onClick={() => changeStatus(status)}
                  className={`rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40 ${
                    status === "CANCELLED"
                      ? "border-red-300 text-red-600"
                      : "border-slate-300 dark:border-slate-600"
                  }`}
                >
                  {ROUTE_STATUS_LABELS[status]}
                </button>
              ))}
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium uppercase text-slate-400">
                Paradas
              </p>
              {(selected.items ?? []).map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {item.order.orderNumber} · {item.order.customerName}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {item.order.customerAddress ?? "Sin dirección"}
                      {item.order.customerPhone ? ` · ${item.order.customerPhone}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.status === "PENDING" && editable ? (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => markItem(item.id, "DELIVERED")}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Entregado
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => markItem(item.id, "FAILED")}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-2 py-1 text-xs text-red-600 disabled:opacity-40"
                        >
                          <XCircle className="h-3.5 w-3.5" /> Falló
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => removeOrder(item.orderId)}
                          className="rounded p-1 text-slate-400 hover:text-red-500"
                          title="Quitar de la ruta"
                        >
                          ×
                        </button>
                      </>
                    ) : (
                      <span
                        className={
                          item.status === "DELIVERED"
                            ? "text-xs font-medium text-emerald-600"
                            : item.status === "FAILED"
                              ? "text-xs font-medium text-red-600"
                              : "text-xs text-slate-400"
                        }
                      >
                        {item.status === "DELIVERED"
                          ? "Entregado"
                          : item.status === "FAILED"
                            ? `Falló${item.failureReason ? `: ${item.failureReason}` : ""}`
                            : "Pendiente"}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {(selected.items ?? []).length === 0 ? (
                <p className="text-sm text-slate-500">
                  Sin pedidos en la ruta todavía.
                </p>
              ) : null}
            </div>

            {editable ? (
              <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                <p className="mb-1 text-xs font-medium uppercase text-slate-400">
                  Agregar pedidos confirmados
                </p>
                {candidates.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No hay pedidos listos para esta ruta.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {candidates.slice(0, 8).map((order) => (
                      <SectionRow
                        key={order.id}
                        label={`${order.orderNumber} · ${order.customerName}`}
                        hint={
                          order.fulfillmentType === "SHIPPING"
                            ? "envío"
                            : order.fulfillmentType === "DELIVERY"
                              ? "delivery"
                              : "retiro"
                        }
                      >
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => assignOrder(order.id)}
                          className="rounded-lg bg-indigo-600 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
                        >
                          Agregar
                        </button>
                      </SectionRow>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </SectionCard>
        ) : (
          <p className="text-sm text-slate-500">
            Elegí una ruta para ver sus paradas.
          </p>
        )}
      </div>
    </div>
  );
}
