"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import {
  CARD,
  CARD_HEADER,
  CTA_BRASS,
  EYEBROW,
  INPUT,
  PAGE_TITLE,
} from "@/shared/lib/maison-style";
import { StudioEndpoints } from "@/features/studio/services/studio.endpoints";
import {
  APPOINTMENT_STATUS_LABELS,
  type AgendaClientOption,
  type AgendaServiceOption,
  type AppointmentStatus,
  type StudioAppointment,
  type StudioStation,
} from "@/features/studio/types/studio.type";
import {
  addDays,
  dayRange,
  defaultSlot,
  formatRange,
  toDateTimeLocal,
  todayISO,
} from "@/features/studio/lib/agenda";

interface AppointmentForm {
  id?: string;
  clientId: string;
  serviceId: string;
  stationId: string;
  start: string;
  end: string;
  status: AppointmentStatus;
  notes: string;
}

interface Paged<T> {
  list: T[];
  total?: number;
}

const TERMINAL: AppointmentStatus[] = ["DONE", "CANCELED", "NO_SHOW"];

const STATUS_TONE: Record<AppointmentStatus, string> = {
  SCHEDULED: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  CONFIRMED: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  DONE: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  CANCELED: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  NO_SHOW: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
};

function apiMessage(error: unknown, fallback: string): string {
  const maybe = error as { response?: { data?: { message?: string } } };
  return maybe?.response?.data?.message || fallback;
}

/**
 * Agenda diaria (plan STUDIO): una columna por mesa/silla, las citas del día
 * ordenadas por hora. Crear, editar, marcar atendida o cancelar.
 */
export default function StudioAgendaPage() {
  const { addToast } = useToastStore();
  const [date, setDate] = useState<string>(() => todayISO());
  const [stations, setStations] = useState<StudioStation[]>([]);
  const [appointments, setAppointments] = useState<StudioAppointment[]>([]);
  const [clients, setClients] = useState<AgendaClientOption[]>([]);
  const [services, setServices] = useState<AgendaServiceOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [form, setForm] = useState<AppointmentForm | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  const loadDay = useCallback(async (): Promise<void> => {
    setLoading(true);
    const { from, to } = dayRange(date);
    try {
      const { data } = await apiClient.get<StudioAppointment[]>(
        StudioEndpoints.appointments,
        { params: { from, to } },
      );
      setAppointments(Array.isArray(data) ? data : []);
    } catch (error) {
      addToast({
        type: "error",
        title: "Agenda",
        message: apiMessage(error, "No se pudo cargar la agenda del día."),
      });
    } finally {
      setLoading(false);
    }
  }, [addToast, date]);

  useEffect(() => {
    void loadDay();
  }, [loadDay]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const [stationRes, clientRes, serviceRes] = await Promise.all([
        apiClient
          .get<StudioStation[]>(StudioEndpoints.stations)
          .catch(() => ({ data: [] as StudioStation[] })),
        apiClient
          .get<Paged<AgendaClientOption>>("/api/clients", {
            params: { limit: 200 },
          })
          .catch(() => ({ data: { list: [] } })),
        apiClient
          .get<Paged<AgendaServiceOption>>("/api/products", {
            params: { isService: true, limit: 200 },
          })
          .catch(() => ({ data: { list: [] } })),
      ]);
      if (!alive) return;
      setStations(Array.isArray(stationRes.data) ? stationRes.data : []);
      setClients(clientRes.data.list ?? []);
      setServices(serviceRes.data.list ?? []);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const columns = useMemo(() => {
    // An inactive station that still has appointments must keep its column:
    // hiding it would make those slots disappear from the day.
    const usedStationIds = new Set(
      appointments
        .map((appointment) => appointment.stationId)
        .filter((stationId): stationId is string => Boolean(stationId)),
    );
    const visible = stations.filter(
      (station) => station.isActive || usedStationIds.has(station.id),
    );
    const unassigned = appointments.filter(
      (appointment) => !appointment.stationId,
    );
    return { active: visible, unassigned };
  }, [appointments, stations]);

  const openCreate = (stationId = ""): void =>
    setForm({
      clientId: "",
      serviceId: "",
      stationId,
      start: defaultSlot(date),
      end: defaultSlot(date, 10),
      status: "SCHEDULED",
      notes: "",
    });

  const openEdit = (appointment: StudioAppointment): void =>
    setForm({
      id: appointment.id,
      clientId: appointment.clientId ?? "",
      serviceId: appointment.serviceId ?? "",
      stationId: appointment.stationId ?? "",
      start: toDateTimeLocal(appointment.startAt),
      end: toDateTimeLocal(appointment.endAt),
      status: appointment.status,
      notes: appointment.notes ?? "",
    });

  const save = async (): Promise<void> => {
    if (!form) return;
    const startAt = new Date(form.start);
    const endAt = new Date(form.end);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      addToast({
        type: "warning",
        title: "Agenda",
        message: "Completá la hora de inicio y fin.",
      });
      return;
    }
    if (endAt <= startAt) {
      addToast({
        type: "warning",
        title: "Agenda",
        message: "La hora de fin debe ser posterior al inicio.",
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        clientId: form.clientId || undefined,
        serviceId: form.serviceId || undefined,
        stationId: form.stationId || undefined,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        status: form.status,
        notes: form.notes.trim() || undefined,
      };
      if (form.id) {
        await apiClient.patch(StudioEndpoints.appointment(form.id), payload);
      } else {
        await apiClient.post(StudioEndpoints.appointments, payload);
      }
      addToast({
        type: "success",
        title: "Agenda",
        message: form.id ? "Cita actualizada." : "Cita creada.",
      });
      setForm(null);
      await loadDay();
    } catch (error) {
      addToast({
        type: "error",
        title: "Agenda",
        message: apiMessage(error, "No se pudo guardar la cita."),
      });
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (
    appointment: StudioAppointment,
    status: AppointmentStatus,
  ): Promise<void> => {
    try {
      await apiClient.patch(StudioEndpoints.appointment(appointment.id), {
        status,
      });
      await loadDay();
    } catch (error) {
      addToast({
        type: "error",
        title: "Agenda",
        message: apiMessage(error, "No se pudo cambiar el estado."),
      });
    }
  };

  const cancel = async (appointment: StudioAppointment): Promise<void> => {
    if (!window.confirm("¿Cancelar esta cita?")) return;
    try {
      await apiClient.delete(StudioEndpoints.appointment(appointment.id));
      await loadDay();
    } catch (error) {
      addToast({
        type: "error",
        title: "Agenda",
        message: apiMessage(error, "No se pudo cancelar la cita."),
      });
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className={EYEBROW}>Studio</div>
          <h1 className={PAGE_TITLE}>Agenda</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Las citas del día por mesa y silla.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-lg border border-slate-300 p-2 hover:bg-slate-500/10"
            onClick={() => setDate((current) => addDays(current, -1))}
            aria-label="Día anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <input
            type="date"
            className={INPUT}
            value={date}
            onChange={(event) => setDate(event.target.value || todayISO())}
          />
          <button
            type="button"
            className="rounded-lg border border-slate-300 p-2 hover:bg-slate-500/10"
            onClick={() => setDate((current) => addDays(current, 1))}
            aria-label="Día siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-500/10"
            onClick={() => setDate(todayISO())}
          >
            Hoy
          </button>
          <button type="button" className={CTA_BRASS} onClick={() => openCreate()}>
            <Plus className="h-4 w-4" /> Nueva cita
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {columns.active.map((station) => (
            <section key={station.id} className={CARD}>
              <div className={CARD_HEADER}>
                <h2 className="text-sm font-semibold">{station.name}</h2>
                <button
                  type="button"
                  className="text-xs text-[#b2944a] hover:underline"
                  onClick={() => openCreate(station.id)}
                >
                  + Agendar
                </button>
              </div>
              <div className="space-y-2 p-3">
                {appointmentsForStation(appointments, station.id).length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Sin citas.
                  </p>
                ) : (
                  appointmentsForStation(appointments, station.id).map((appointment) => (
                    <AppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      onEdit={() => openEdit(appointment)}
                      onStatus={(status) => void setStatus(appointment, status)}
                      onCancel={() => void cancel(appointment)}
                    />
                  ))
                )}
              </div>
            </section>
          ))}

          {columns.unassigned.length > 0 ? (
            <section className={CARD}>
              <div className={CARD_HEADER}>
                <h2 className="text-sm font-semibold">Sin mesa asignada</h2>
              </div>
              <div className="space-y-2 p-3">
                {columns.unassigned.map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    onEdit={() => openEdit(appointment)}
                    onStatus={(status) => void setStatus(appointment, status)}
                    onCancel={() => void cancel(appointment)}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {columns.active.length === 0 && columns.unassigned.length === 0 ? (
            <section className={CARD}>
              <div className="p-6 text-sm text-slate-500 dark:text-slate-400">
                <CalendarDays className="mb-2 h-5 w-5 text-slate-400" />
                Creá al menos una mesa o silla para organizar la agenda.
              </div>
            </section>
          ) : null}
        </div>
      )}

      {form ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {form.id ? "Editar cita" : "Nueva cita"}
              </h2>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setForm(null)}
                className="rounded p-1 text-slate-500 hover:bg-slate-500/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="col-span-2 block">
                <span className="text-xs text-slate-500">Cliente</span>
                <select
                  className={INPUT}
                  value={form.clientId}
                  onChange={(event) =>
                    setForm({ ...form, clientId: event.target.value })
                  }
                >
                  <option value="">Sin cliente</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-slate-500">Servicio</span>
                <select
                  className={INPUT}
                  value={form.serviceId}
                  onChange={(event) =>
                    setForm({ ...form, serviceId: event.target.value })
                  }
                >
                  <option value="">Sin servicio</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-slate-500">Mesa / silla</span>
                <select
                  className={INPUT}
                  value={form.stationId}
                  onChange={(event) =>
                    setForm({ ...form, stationId: event.target.value })
                  }
                >
                  <option value="">Sin asignar</option>
                  {stations.map((station) => (
                    <option key={station.id} value={station.id}>
                      {station.name}
                      {station.isActive ? "" : " (inactiva)"}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-slate-500">Inicio</span>
                <input
                  type="datetime-local"
                  className={INPUT}
                  value={form.start}
                  onChange={(event) =>
                    setForm({ ...form, start: event.target.value })
                  }
                />
              </label>
              <label className="block">
                <span className="text-xs text-slate-500">Fin</span>
                <input
                  type="datetime-local"
                  className={INPUT}
                  value={form.end}
                  onChange={(event) =>
                    setForm({ ...form, end: event.target.value })
                  }
                />
              </label>
              <label className="block">
                <span className="text-xs text-slate-500">Estado</span>
                <select
                  className={INPUT}
                  value={form.status}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      status: event.target.value as AppointmentStatus,
                    })
                  }
                >
                  {(
                    Object.keys(
                      APPOINTMENT_STATUS_LABELS,
                    ) as AppointmentStatus[]
                  ).map((status) => (
                    <option key={status} value={status}>
                      {APPOINTMENT_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="col-span-2 block">
                <span className="text-xs text-slate-500">Notas</span>
                <textarea
                  className={INPUT}
                  rows={2}
                  value={form.notes}
                  onChange={(event) =>
                    setForm({ ...form, notes: event.target.value })
                  }
                />
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-500/10"
                onClick={() => setForm(null)}
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={CTA_BRASS}
                onClick={() => void save()}
                disabled={saving}
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function appointmentsForStation(
  appointments: StudioAppointment[],
  stationId: string,
): StudioAppointment[] {
  return appointments.filter(
    (appointment) => appointment.stationId === stationId,
  );
}

function AppointmentCard({
  appointment,
  onEdit,
  onStatus,
  onCancel,
}: {
  appointment: StudioAppointment;
  onEdit: () => void;
  onStatus: (status: AppointmentStatus) => void;
  onCancel: () => void;
}) {
  const terminal = TERMINAL.includes(appointment.status);

  return (
    <div
      className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700"
      onClick={onEdit}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter") onEdit();
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs tabular-nums text-slate-500">
          {formatRange(appointment.startAt, appointment.endAt)}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            STATUS_TONE[appointment.status]
          }`}
        >
          {APPOINTMENT_STATUS_LABELS[appointment.status]}
        </span>
      </div>
      <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">
        {appointment.client?.name ?? "Sin cliente"}
      </p>
      {appointment.service ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {appointment.service.name}
        </p>
      ) : null}
      {appointment.notes ? (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {appointment.notes}
        </p>
      ) : null}

      {!terminal ? (
        <div className="mt-2 flex flex-wrap gap-1">
          <button
            type="button"
            className="rounded px-2 py-0.5 text-[11px] text-emerald-700 hover:bg-emerald-500/10"
            onClick={(event) => {
              event.stopPropagation();
              onStatus("DONE");
            }}
          >
            Atendida
          </button>
          <button
            type="button"
            className="rounded px-2 py-0.5 text-[11px] text-rose-600 hover:bg-rose-500/10"
            onClick={(event) => {
              event.stopPropagation();
              onCancel();
            }}
          >
            Cancelar
          </button>
        </div>
      ) : null}
    </div>
  );
}
