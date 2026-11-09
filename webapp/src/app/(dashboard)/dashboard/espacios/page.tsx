"use client";

import { useCallback, useEffect, useState } from "react";
import { Armchair, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import {
  CARD,
  CTA_BRASS,
  EYEBROW,
  INPUT,
  PAGE_TITLE,
} from "@/shared/lib/maison-style";
import { StudioEndpoints } from "@/features/studio/services/studio.endpoints";
import type { StudioStation } from "@/features/studio/types/studio.type";

interface SpaceForm {
  id?: string;
  name: string;
  capacity: number;
  sortOrder: number;
}

const EMPTY_FORM: SpaceForm = { name: "", capacity: 1, sortOrder: 0 };

function apiMessage(error: unknown, fallback: string): string {
  const maybe = error as { response?: { data?: { message?: string } } };
  return maybe?.response?.data?.message || fallback;
}

/**
 * Espacios (plan STUDIO): los puestos donde se atiende una cita. El nombre es
 * único por negocio; borrar no rompe el historial (la cita queda sin espacio).
 */
export default function StudioSpacesPage() {
  const { addToast } = useToastStore();
  const [rows, setRows] = useState<StudioStation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [form, setForm] = useState<SpaceForm | null>(null);
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
        title: "Espacios",
        message: apiMessage(error, "No se pudieron cargar los espacios."),
      });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = (): void => setForm({ ...EMPTY_FORM });

  const openEdit = (space: StudioStation): void =>
    setForm({
      id: space.id,
      name: space.name,
      capacity: space.capacity,
      sortOrder: space.sortOrder,
    });

  const save = async (): Promise<void> => {
    if (!form) return;
    const name = form.name.trim();
    if (!name) {
      addToast({
        type: "warning",
        title: "Espacios",
        message: "Ponele un nombre al espacio.",
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name,
        capacity: Math.max(1, form.capacity),
        sortOrder: form.sortOrder,
      };
      if (form.id) {
        await apiClient.patch(StudioEndpoints.station(form.id), payload);
      } else {
        await apiClient.post(StudioEndpoints.stations, payload);
      }
      addToast({
        type: "success",
        title: "Espacios",
        message: form.id ? "Espacio actualizado." : "Espacio creado.",
      });
      setForm(null);
      await load();
    } catch (error) {
      addToast({
        type: "error",
        title: "Espacios",
        message: apiMessage(error, "No se pudo guardar el espacio."),
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (space: StudioStation): Promise<void> => {
    try {
      await apiClient.patch(StudioEndpoints.station(space.id), {
        isActive: !space.isActive,
      });
      await load();
    } catch (error) {
      addToast({
        type: "error",
        title: "Espacios",
        message: apiMessage(error, "No se pudo cambiar el estado."),
      });
    }
  };

  const remove = async (space: StudioStation): Promise<void> => {
    if (!window.confirm(`¿Eliminar "${space.name}"?`)) return;
    try {
      await apiClient.delete(StudioEndpoints.station(space.id));
      addToast({
        type: "success",
        title: "Espacios",
        message: "Espacio eliminado.",
      });
      await load();
    } catch (error) {
      addToast({
        type: "error",
        title: "Espacios",
        message: apiMessage(error, "No se pudo eliminar el espacio."),
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
          <h1 className={PAGE_TITLE}>Espacios</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Los puestos donde atendés cada cita.
          </p>
        </div>
        <button type="button" className={CTA_BRASS} onClick={openCreate}>
          <Plus className="h-4 w-4" /> Nuevo espacio
        </button>
      </header>

      {rows.length === 0 ? (
        <div className={`${CARD} flex flex-col items-center gap-2 px-6 py-14 text-center`}>
          <Armchair className="h-8 w-8 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Todavía no hay espacios
          </p>
          <p className="max-w-sm text-xs text-slate-500 dark:text-slate-400">
            Creá el primero para poder asignar citas en la agenda.
          </p>
          <button
            type="button"
            className={`${CTA_BRASS} mt-2`}
            onClick={openCreate}
          >
            <Plus className="h-4 w-4" /> Crear espacio
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((space) => (
            <article
              key={space.id}
              className={`${CARD} group p-4 transition-colors ${
                space.isActive ? "" : "opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">
                    {space.name}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {space.capacity}{" "}
                    {space.capacity === 1 ? "persona" : "personas"}
                  </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                  <button
                    type="button"
                    aria-label={`Editar ${space.name}`}
                    className="rounded p-1.5 text-slate-500 hover:bg-slate-500/10"
                    onClick={() => openEdit(space)}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Eliminar ${space.name}`}
                    className="rounded p-1.5 text-rose-500 hover:bg-rose-500/10"
                    onClick={() => void remove(space)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-400">
                  Orden {space.sortOrder}
                </span>
                <button
                  type="button"
                  onClick={() => void toggleActive(space)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    space.isActive
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "bg-slate-500/10 text-slate-500"
                  }`}
                >
                  {space.isActive ? "Activo" : "Inactivo"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {form ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {form.id ? "Editar espacio" : "Nuevo espacio"}
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Un espacio puede ser una mesa, una silla o una cabina.
            </p>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="text-xs font-medium text-slate-500">
                  Nombre
                </span>
                <input
                  className={INPUT}
                  value={form.name}
                  autoFocus
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  placeholder="Espacio 1"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void save();
                  }}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-medium text-slate-500">
                    Capacidad
                  </span>
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
                <label className="block">
                  <span className="text-xs font-medium text-slate-500">
                    Orden
                  </span>
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
            </div>

            <div className="mt-6 flex justify-end gap-2">
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
