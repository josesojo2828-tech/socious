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
  dayKeyOf,
  defaultSlot,
  formatRange,
  formatTime,
  monthGrid,
  monthLabel,
  shiftPeriod,
  startOfWeek,
  toDateTimeLocal,
  todayISO,
  viewRange,
  type AgendaView,
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
const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const STATUS_TONE: Record<AppointmentStatus, string> = {
  SCHEDULED: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  CONFIRMED: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  DONE: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  CANCELED: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  NO_SHOW: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
};

const VIEW_LABELS: Record<AgendaView, string> = {
  month: "Mes",
  week: "Semana",
  day: "Día",
};

function apiMessage(error: unknown, fallback: string): string {
  const maybe = error as { response?: { data?: { message?: string } } };
  return maybe?.response?.data?.message || fallback;
}

function formatDay(dateISO: string): string {
  const [year, month, day] = dateISO.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("es-VE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function dayNumber(dateISO: string): number {
  return Number(dateISO.split("-")[2]);
}

/**
 * Agenda (plan STUDIO): calendario con vistas de mes, semana y día. Las citas
 * se crean y editan en un modal; la vista de día las separa por espacio.
 */
export default function StudioAgendaPage() {
  const { addToast } = useToastStore();
  const [view, setView] = useState<AgendaView>("month");
  const [date, setDate] = useState<string>(() => todayISO());
  const [stations, setStations] = useState<StudioStation[]>([]);
  const [appointments, setAppointments] = useState<StudioAppointment[]>([]);
  const [clients, setClients] = useState<AgendaClientOption[]>([]);
  const [services, setServices] = useState<AgendaServiceOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [form, setForm] = useState<AppointmentForm | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  const range = useMemo(() => viewRange(date, view), [date, view]);

  const loadRange = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const { data } = await apiClient.get<StudioAppointment[]>(
        StudioEndpoints.appointments,
        { params: { from: range.from, to: range.to } },
      );
      setAppointments(Array.isArray(data) ? data : []);
    } catch (error) {
      addToast({
        type: "error",
        title: "Agenda",
        message: apiMessage(error, "No se pudo cargar la agenda."),
      });
    } finally {
      setLoading(false);
    }
  }, [addToast, range.from, range.to]);

  useEffect(() => {
    void loadRange();
  }, [loadRange]);

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

  const byDay = useMemo(() => {
    const map = new Map<string, StudioAppointment[]>();
    for (const appointment of appointments) {
      const key = dayKeyOf(appointment.startAt);
      const list = map.get(key) ?? [];
      list.push(appointment);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.startAt.localeCompare(b.startAt));
    }
    return map;
  }, [appointments]);

  const dayAppointments = byDay.get(date) ?? [];
  const today = todayISO();

  const openCreate = (stationId = "", dayISO = date): void =>
    setForm({
      clientId: "",
      serviceId: "",
      stationId,
      start: defaultSlot(dayISO),
      end: defaultSlot(dayISO, 10),
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
      await loadRange();
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
      await loadRange();
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
      await loadRange();
    } catch (error) {
      addToast({
        type: "error",
        title: "Agenda",
        message: apiMessage(error, "No se pudo cancelar la cita."),
      });
    }
  };

  const headerLabel =
    view === "month"
      ? monthLabel(date)
      : view === "week"
        ? `Semana del ${formatDay(startOfWeek(date))}`
        : formatDay(date);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className={EYEBROW}>Studio</div>
          <h1 className={PAGE_TITLE}>Agenda</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Tus citas por día y por espacio.
          </p>
        </div>
        <button type="button" className={CTA_BRASS} onClick={() => openCreate()}>
          <Plus className="h-4 w-4" /> Nueva cita
        </button>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-slate-300 p-0.5 dark:border-slate-700">
          {(Object.keys(VIEW_LABELS) as AgendaView[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setView(option)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                view === option
                  ? "bg-[#1a2a46] text-white dark:bg-white/15"
                  : "text-slate-600 hover:bg-slate-500/10 dark:text-slate-300"
              }`}
            >
              {VIEW_LABELS[option]}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-lg border border-slate-300 p-2 hover:bg-slate-500/10 dark:border-slate-700"
            onClick={() => setDate((current) => shiftPeriod(current, view, -1))}
            aria-label="Anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-500/10 dark:border-slate-700"
            onClick={() => setDate(todayISO())}
          >
            Hoy
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-300 p-2 hover:bg-slate-500/10 dark:border-slate-700"
            onClick={() => setDate((current) => shiftPeriod(current, view, 1))}
            aria-label="Siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <input
            type="date"
            className={INPUT}
            value={date}
            onChange={(event) => setDate(event.target.value || todayISO())}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <>
          {view === "month" ? (
            <section className={CARD}>
              <div className={CARD_HEADER}>
                <h2 className="text-sm font-semibold capitalize">
                  {headerLabel}
                </h2>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400">
                  {appointments.length} citas
                </span>
              </div>
              <div className="p-3">
                <div className="grid grid-cols-7 gap-1">
                  {WEEKDAYS.map((weekday) => (
                    <span
                      key={weekday}
                      className="pb-1 text-center font-mono text-[10px] text-slate-400"
                    >
                      {weekday}
                    </span>
                  ))}
                  {monthGrid(date).flat().map((cell) => {
                    const list = byDay.get(cell.dateISO) ?? [];
                    const isToday = cell.dateISO === today;
                    return (
                      <button
                        key={cell.dateISO}
                        type="button"
                        onClick={() => {
                          setDate(cell.dateISO);
                          setView("day");
                        }}
                        className={`flex h-20 flex-col items-start gap-1 rounded-lg border p-1.5 text-left transition-colors ${
                          cell.inMonth
                            ? "border-slate-200 hover:border-[#b2944a]/60 hover:bg-[#b2944a]/5 dark:border-slate-700"
                            : "border-transparent text-slate-300 dark:text-slate-600"
                        } ${isToday ? "ring-1 ring-[#b2944a]" : ""}`}
                      >
                        <span
                          className={`font-mono text-[11px] tabular-nums ${
                            isToday ? "font-semibold text-[#8e7538]" : ""
                          }`}
                        >
                          {dayNumber(cell.dateISO)}
                        </span>
                        {list.length > 0 ? (
                          <span className="rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 dark:text-violet-300">
                            {list.length} {list.length === 1 ? "cita" : "citas"}
                          </span>
                        ) : null}
                        <span className="mt-auto w-full truncate text-[10px] text-slate-500 dark:text-slate-400">
                          {list[0]?.client?.name ?? ""}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          ) : null}

          {view === "week" ? (
            <section className={CARD}>
              <div className={CARD_HEADER}>
                <h2 className="text-sm font-semibold capitalize">
                  {headerLabel}
                </h2>
              </div>
              <div className="grid grid-cols-7 gap-2 p-3">
                {Array.from({ length: 7 }, (_, index) =>
                  addDays(startOfWeek(date), index),
                ).map((dayISO, index) => {
                  const list = byDay.get(dayISO) ?? [];
                  return (
                    <div key={dayISO} className="min-w-0">
                      <button
                        type="button"
                        onClick={() => {
                          setDate(dayISO);
                          setView("day");
                        }}
                        className={`mb-2 w-full rounded-md px-1 py-1 text-center ${
                          dayISO === today ? "bg-[#b2944a]/10" : ""
                        }`}
                      >
                        <span className="block font-mono text-[10px] uppercase text-slate-400">
                          {WEEKDAYS[index]}
                        </span>
                        <span className="block font-mono text-[13px] font-semibold tabular-nums">
                          {dayNumber(dayISO)}
                        </span>
                      </button>
                      <div className="space-y-1">
                        {list.map((appointment) => (
                          <button
                            key={appointment.id}
                            type="button"
                            onClick={() => openEdit(appointment)}
                            className="w-full rounded-md border border-violet-500/20 bg-violet-500/[0.07] p-1.5 text-left"
                          >
                            <span className="block font-mono text-[10px] tabular-nums text-slate-500">
                              {formatTime(appointment.startAt)}
                            </span>
                            <span className="block truncate text-[11px] font-medium text-slate-800 dark:text-slate-100">
                              {appointment.client?.name ?? "Sin cliente"}
                            </span>
                          </button>
                        ))}
                        {list.length === 0 ? (
                          <span className="block text-center text-[10px] text-slate-300 dark:text-slate-600">
                            —
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          {view === "day" ? (
            <DayBoard
              date={date}
              stations={stations}
              appointments={dayAppointments}
              onCreate={openCreate}
              onEdit={openEdit}
              onStatus={(appointment, status) =>
                void setStatus(appointment, status)
              }
              onCancel={(appointment) => void cancel(appointment)}
            />
          ) : null}
        </>
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
                <span className="text-xs text-slate-500">Espacio</span>
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
                      {station.isActive ? "" : " (inactivo)"}
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

function DayBoard({
  date,
  stations,
  appointments,
  onCreate,
  onEdit,
  onStatus,
  onCancel,
}: {
  date: string;
  stations: StudioStation[];
  appointments: StudioAppointment[];
  onCreate: (stationId: string, dayISO: string) => void;
  onEdit: (appointment: StudioAppointment) => void;
  onStatus: (appointment: StudioAppointment, status: AppointmentStatus) => void;
  onCancel: (appointment: StudioAppointment) => void;
}) {
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

  if (visible.length === 0 && unassigned.length === 0) {
    return (
      <section className={CARD}>
        <div className="p-6 text-sm text-slate-500 dark:text-slate-400">
          <CalendarDays className="mb-2 h-5 w-5 text-slate-400" />
          Creá al menos un espacio para organizar el día.
        </div>
      </section>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {visible.map((station) => (
        <section key={station.id} className={CARD}>
          <div className={CARD_HEADER}>
            <h2 className="text-sm font-semibold">{station.name}</h2>
            <button
              type="button"
              className="text-xs text-[#b2944a] hover:underline"
              onClick={() => onCreate(station.id, date)}
            >
              + Agendar
            </button>
          </div>
          <div className="space-y-2 p-3">
            {appointments
              .filter((appointment) => appointment.stationId === station.id)
              .map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  onEdit={() => onEdit(appointment)}
                  onStatus={(status) => onStatus(appointment, status)}
                  onCancel={() => onCancel(appointment)}
                />
              ))}
            {appointments.filter(
              (appointment) => appointment.stationId === station.id,
            ).length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sin citas.
              </p>
            ) : null}
          </div>
        </section>
      ))}

      {unassigned.length > 0 ? (
        <section className={CARD}>
          <div className={CARD_HEADER}>
            <h2 className="text-sm font-semibold">Sin espacio asignado</h2>
          </div>
          <div className="space-y-2 p-3">
            {unassigned.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                onEdit={() => onEdit(appointment)}
                onStatus={(status) => onStatus(appointment, status)}
                onCancel={() => onCancel(appointment)}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
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
