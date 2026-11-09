"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import {
  CARD,
  CARD_HEADER,
  CTA_BRASS,
  EYEBROW,
  INPUT,
  PAGE_TITLE,
  TABLE_HEAD,
  TABLE_ROW,
} from "@/shared/lib/maison-style";
import { StudioEndpoints } from "@/features/studio/services/studio.endpoints";
import {
  STATION_KIND_LABELS,
  type StationKind,
  type StudioStation,
} from "@/features/studio/types/studio.type";

interface StationForm {
  id?: string;
  name: string;
  kind: StationKind;
  capacity: number;
  sortOrder: number;
}

const EMPTY_FORM: StationForm = {
  name: "",
  kind: "TABLE",
  capacity: 1,
  sortOrder: 0,
};

function apiMessage(error: unknown, fallback: string): string {
  const maybe = error as { response?: { data?: { message?: string } } };
  return maybe?.response?.data?.message || fallback;
}

/**
 * Mesas y sillas (plan STUDIO): CRUD del puesto de trabajo al que se sienta
 * una cita. El nombre es único por negocio; borrar no rompe el historial de
 * la agenda (la cita queda sin puesto).
 */
export default function StudioStationsPage() {
  const { addToast } = useToastStore();
  const [rows, setRows] = useState<StudioStation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [form, setForm] = useState<StationForm | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  const load = useCallback(async (): Promise<void> => {
    try {
      const { data } = await apiClient.get<StudioStation[]>(
        StudioEndpoints.stations,
      );
      setRows(Array.isArray(data) ? data : []);
    } catch (error) {
      addToast({
        type: "error",
        title: "Mesas y sillas",
        message: apiMessage(error, "No se pudieron cargar las mesas y sillas."),
      });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = (): void => setForm({ ...EMPTY_FORM });

  const openEdit = (station: StudioStation): void =>
    setForm({
      id: station.id,
      name: station.name,
      kind: station.kind,
      capacity: station.capacity,
      sortOrder: station.sortOrder,
    });

  const save = async (): Promise<void> => {
    if (!form) return;
    const name = form.name.trim();
    if (!name) {
      addToast({
        type: "warning",
        title: "Mesas y sillas",
        message: "Ingresá un nombre.",
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name,
        kind: form.kind,
        capacity: form.capacity,
        sortOrder: form.sortOrder,
      };
      if (form.id) {
        await apiClient.patch(StudioEndpoints.station(form.id), payload);
      } else {
        await apiClient.post(StudioEndpoints.stations, payload);
      }
      addToast({
        type: "success",
        title: "Mesas y sillas",
        message: form.id ? "Puesto actualizado." : "Puesto creado.",
      });
      setForm(null);
      await load();
    } catch (error) {
      addToast({
        type: "error",
        title: "Mesas y sillas",
        message: apiMessage(error, "No se pudo guardar el puesto."),
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (station: StudioStation): Promise<void> => {
    try {
      await apiClient.patch(StudioEndpoints.station(station.id), {
        isActive: !station.isActive,
      });
      await load();
    } catch (error) {
      addToast({
        type: "error",
        title: "Mesas y sillas",
        message: apiMessage(error, "No se pudo cambiar el estado."),
      });
    }
  };

  const remove = async (station: StudioStation): Promise<void> => {
    if (!window.confirm(`¿Eliminar "${station.name}"?`)) return;
    try {
      await apiClient.delete(StudioEndpoints.station(station.id));
      addToast({
        type: "success",
        title: "Mesas y sillas",
        message: "Puesto eliminado.",
      });
      await load();
    } catch (error) {
      addToast({
        type: "error",
        title: "Mesas y sillas",
        message: apiMessage(error, "No se pudo eliminar el puesto."),
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className={EYEBROW}>Studio</div>
          <h1 className={PAGE_TITLE}>Mesas y sillas</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Los puestos de trabajo que la agenda puede asignar a una cita.
          </p>
        </div>
        <button type="button" className={CTA_BRASS} onClick={openCreate}>
          <Plus className="h-4 w-4" /> Nuevo puesto
        </button>
      </header>

      <section className={CARD}>
        <div className={CARD_HEADER}>
          <h2 className="text-sm font-semibold">Puestos ({rows.length})</h2>
        </div>
        {rows.length === 0 ? (
          <p className="p-6 text-sm text-slate-500 dark:text-slate-400">
            Todavía no hay mesas ni sillas. Creá la primera para empezar a
            agendar.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={TABLE_HEAD}>Nombre</th>
                  <th className={TABLE_HEAD}>Tipo</th>
                  <th className={TABLE_HEAD}>Capacidad</th>
                  <th className={TABLE_HEAD}>Estado</th>
                  <th className={TABLE_HEAD}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((station) => (
                  <tr key={station.id} className={TABLE_ROW}>
                    <td className="py-2 font-medium">{station.name}</td>
                    <td className="py-2">
                      {STATION_KIND_LABELS[station.kind] ?? station.kind}
                    </td>
                    <td className="py-2 tabular-nums">{station.capacity}</td>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => void toggleActive(station)}
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          station.isActive
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "bg-slate-500/10 text-slate-500"
                        }`}
                      >
                        {station.isActive ? "Activo" : "Inactivo"}
                      </button>
                    </td>
                    <td className="py-2">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          aria-label={`Editar ${station.name}`}
                          className="rounded p-1.5 text-slate-500 hover:bg-slate-500/10"
                          onClick={() => openEdit(station)}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Eliminar ${station.name}`}
                          className="rounded p-1.5 text-rose-500 hover:bg-rose-500/10"
                          onClick={() => void remove(station)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {form ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {form.id ? "Editar puesto" : "Nuevo puesto"}
            </h2>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="text-xs text-slate-500">Nombre</span>
                <input
                  className={INPUT}
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  placeholder="Mesa 1"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-slate-500">Tipo</span>
                  <select
                    className={INPUT}
                    value={form.kind}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        kind: event.target.value as StationKind,
                      })
                    }
                  >
                    <option value="TABLE">Mesa</option>
                    <option value="CHAIR">Silla</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs text-slate-500">Capacidad</span>
                  <input
                    type="number"
                    min={1}
                    className={INPUT}
                    value={form.capacity}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        capacity: Number(event.target.value) || 1,
                      })
                    }
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-xs text-slate-500">Orden</span>
                <input
                  type="number"
                  className={INPUT}
                  value={form.sortOrder}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      sortOrder: Number(event.target.value) || 0,
                    })
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
